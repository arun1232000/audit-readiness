/**
 * HubSpot CRM v3 integration (server only — the token never reaches the browser).
 *
 *  1. Look up the contact by email (idProperty=email).
 *  2. Create it, or update it if it exists. A 409 "already exists" on create (race) falls back to update.
 *  3. Unless the contact already carries this submission id, create a Note associated with the contact.
 *  4. Stamp assessment_last_submission_id so a replay of the same submission never creates a second note.
 */
import { DIMENSIONS } from '../../src/data/assessment';
import type { AssessmentResult } from '../../src/lib/scoring';
import { answersJson, noteHtml } from '../../src/lib/summary';
import { describeSource } from '../../src/lib/utm-shared';
import type { Submission } from '../../src/schemas/submission';
import { HttpError, fetchWithRetry } from '../lib/http';
import type { Logger } from '../lib/logger';
import { maskEmail } from '../lib/logger';

export const NOTE_TO_CONTACT_ASSOCIATION_ID = 202;
export const MAX_TEXT_PROPERTY = 65_000;

export interface SyncResult {
  contactId: string;
  existingContact: boolean;
  noteCreated: boolean;
}

export interface HubSpotSync {
  readonly mode: 'live' | 'mock';
  sync(submission: Submission, result: AssessmentResult, ctx: { requestId: string; log: Logger }): Promise<SyncResult>;
}

export interface HubSpotOptions {
  token: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  lifecycleStage?: string;
  leadStatus?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export function splitName(full: string): { firstname: string; lastname: string } {
  const parts = full.trim().split(/\s+/);
  const firstname = parts.shift() ?? '';
  return { firstname, lastname: parts.join(' ') };
}

/** Contact properties written on every submission. */
export function contactProperties(s: Submission, r: AssessmentResult, completedAt: string): Record<string, string> {
  const { firstname, lastname } = splitName(s.lead.fullName);
  const props: Record<string, string> = {
    email: s.lead.email,
    firstname,
    lastname,
    phone: s.lead.phone,
    assessment_overall_score: String(r.percent),
    assessment_result_label: r.band.name,
    assessment_completed_at: completedAt,
    assessment_consent: String(s.lead.consent === true),
    assessment_power_units: s.powerUnits,
    assessment_start_area: r.startArea.name,
    assessment_source: describeSource(s.attribution).slice(0, MAX_TEXT_PROPERTY),
  };
  for (const d of DIMENSIONS) {
    const score = r.dimensions.find((x) => x.id === d.id);
    if (score) props[d.hubspotProperty] = String(score.percent);
  }
  const json = answersJson(s.answers);
  props.assessment_answers_json = json.length <= MAX_TEXT_PROPERTY ? json : 'Too long for this field; see the assessment note.';
  return props;
}

export class HubSpotClient implements HubSpotSync {
  readonly mode = 'live' as const;
  private readonly base: string;

  constructor(private readonly o: HubSpotOptions) {
    this.base = (o.baseUrl ?? 'https://api.hubapi.com').replace(/\/$/, '');
  }

  private async call<T>(method: string, path: string, body: unknown, log: Logger, allow: number[] = []): Promise<{ status: number; data: T }> {
    const res = await fetchWithRetry(
      `${this.base}${path}`,
      {
        method,
        headers: { Authorization: `Bearer ${this.o.token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      {
        timeoutMs: this.o.timeoutMs ?? 10_000,
        maxRetries: this.o.maxRetries ?? 3,
        fetchImpl: this.o.fetchImpl,
        sleep: this.o.sleep,
        onRetry: ({ attempt, status, delayMs }) => log.warn({ attempt, status, delayMs, path: path.split('?')[0] }, 'hubspot retry'),
      },
    );
    const text = await res.text();
    if (!res.ok && !allow.includes(res.status)) {
      throw new HttpError(res.status, text.slice(0, 2000), res.status === 429 || res.status >= 500);
    }
    let data: T;
    try {
      data = (text ? JSON.parse(text) : {}) as T;
    } catch {
      data = {} as T;
    }
    return { status: res.status, data };
  }

  async findContactByEmail(email: string, log: Logger): Promise<{ id: string; lastSubmissionId?: string } | null> {
    const { status, data } = await this.call<{ id: string; properties?: Record<string, string | null> }>(
      'GET',
      `/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email&properties=assessment_last_submission_id`,
      undefined,
      log,
      [404],
    );
    if (status === 404) return null;
    return { id: data.id, lastSubmissionId: data.properties?.assessment_last_submission_id ?? undefined };
  }

  async sync(s: Submission, r: AssessmentResult, { requestId, log }: { requestId: string; log: Logger }): Promise<SyncResult> {
    const completedAt = new Date().toISOString();
    const props = contactProperties(s, r, completedAt);
    const l = log.child({ requestId, emailMasked: maskEmail(s.lead.email), submissionId: s.submissionId });

    let existing = await this.findContactByEmail(s.lead.email, l);
    let contactId: string;
    let existingContact = !!existing;

    if (existing) {
      await this.call('PATCH', `/crm/v3/objects/contacts/${existing.id}`, { properties: props }, l);
      contactId = existing.id;
    } else {
      const createProps = { ...props };
      if (this.o.lifecycleStage) createProps.lifecyclestage = this.o.lifecycleStage;
      if (this.o.leadStatus) createProps.hs_lead_status = this.o.leadStatus;
      const created = await this.call<{ id?: string; message?: string }>('POST', '/crm/v3/objects/contacts', { properties: createProps }, l, [409]);
      if (created.status === 409) {
        // Created concurrently elsewhere: HubSpot returns "Contact already exists. Existing ID: 123".
        const id = /Existing ID:\s*(\d+)/i.exec(created.data.message ?? '')?.[1];
        existing = id ? { id } : await this.findContactByEmail(s.lead.email, l);
        if (!existing) throw new HttpError(409, 'conflict without existing id', true);
        await this.call('PATCH', `/crm/v3/objects/contacts/${existing.id}`, { properties: props }, l);
        contactId = existing.id;
        existingContact = true;
      } else {
        contactId = created.data.id!;
      }
    }

    if (existing?.lastSubmissionId === s.submissionId) {
      l.info({ contactId }, 'hubspot note already exists for submission; skipped');
      return { contactId, existingContact, noteCreated: false };
    }

    await this.call(
      'POST',
      '/crm/v3/objects/notes',
      {
        properties: {
          hs_timestamp: completedAt,
          hs_note_body: noteHtml(s.answers, r, {
            fullName: s.lead.fullName,
            powerUnits: s.powerUnits,
            submissionId: s.submissionId,
            completedAt: completedAt.replace('T', ' ').slice(0, 16) + ' UTC',
            source: describeSource(s.attribution),
          }),
        },
        associations: [
          { to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: NOTE_TO_CONTACT_ASSOCIATION_ID }] },
        ],
      },
      l,
    );
    await this.call('PATCH', `/crm/v3/objects/contacts/${contactId}`, { properties: { assessment_last_submission_id: s.submissionId } }, l);
    l.info({ contactId, existingContact }, 'hubspot sync complete');
    return { contactId, existingContact, noteCreated: true };
  }
}

/** In-memory stand-in so the full flow can be demoed without a HubSpot account (HUBSPOT_MOCK=true). */
export class MockHubSpot implements HubSpotSync {
  readonly mode = 'mock' as const;
  readonly contacts = new Map<string, { id: string; properties: Record<string, string>; notes: string[] }>();
  private seq = 1000;
  constructor(private readonly opts: { fail?: boolean } = {}) {}

  async sync(s: Submission, r: AssessmentResult, { requestId, log }: { requestId: string; log: Logger }): Promise<SyncResult> {
    if (this.opts.fail) throw new HttpError(503, 'mock outage', true);
    const props = contactProperties(s, r, new Date().toISOString());
    const existing = this.contacts.get(s.lead.email);
    const c = existing ?? { id: String(++this.seq), properties: {}, notes: [] };
    Object.assign(c.properties, props);
    this.contacts.set(s.lead.email, c);
    let noteCreated = false;
    if (c.properties.assessment_last_submission_id !== s.submissionId) {
      c.notes.push(noteHtml(s.answers, r, { fullName: s.lead.fullName, powerUnits: s.powerUnits, submissionId: s.submissionId, completedAt: props.assessment_completed_at! }));
      c.properties.assessment_last_submission_id = s.submissionId;
      noteCreated = true;
    }
    log.info(
      { requestId, mock: true, contactId: c.id, existingContact: !!existing, noteCreated, emailMasked: maskEmail(s.lead.email), score: r.percent, band: r.band.id },
      'hubspot (mock) sync',
    );
    return { contactId: c.id, existingContact: !!existing, noteCreated };
  }
}

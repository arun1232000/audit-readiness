import { describe, expect, it } from 'vitest';
import { calculateResult } from '../../src/lib/scoring';
import { submissionSchema } from '../../src/schemas/submission';
import { HubSpotClient, contactProperties, splitName } from '../../server/services/hubspot';
import { payload, silentLog } from './helpers';

type Call = { method: string; url: string; body?: Record<string, unknown> };

/** Minimal fake of the HubSpot endpoints we use. */
function fakeHubSpot(routes: (c: Call) => { status: number; body?: unknown; headers?: Record<string, string> } | undefined) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
    const call: Call = { method: init?.method ?? 'GET', url: String(input), body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
    const r = routes(call) ?? { status: 500 };
    return new Response(r.body === undefined ? '' : JSON.stringify(r.body), { status: r.status, headers: r.headers });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

const setup = (over = {}) => {
  const s = submissionSchema.parse(payload(over));
  return { s, r: calculateResult(s.answers) };
};
const client = (fetchImpl: typeof fetch, extra = {}) =>
  new HubSpotClient({ token: 'test-token', baseUrl: 'https://hs.test', fetchImpl, sleep: async () => {}, maxRetries: 2, ...extra });
const ctx = { requestId: 'req-1', log: silentLog };

describe('contact properties', () => {
  it('maps standard and custom properties', () => {
    const { s, r } = setup();
    const p = contactProperties(s, r, '2026-11-17T10:00:00.000Z');
    expect(p).toMatchObject({
      email: 'sam@example.com',
      firstname: 'Sam',
      lastname: 'Patel',
      phone: '+17805551234',
      assessment_overall_score: '63',
      assessment_result_label: 'Almost There!',
      assessment_score_company_admin: '75',
      assessment_score_drivers: '0',
      assessment_score_equipment: '100',
      assessment_score_overall_compliance: '75',
      assessment_consent: 'true',
      assessment_completed_at: '2026-11-17T10:00:00.000Z',
      assessment_source: 'utm_source=google | utm_campaign=fleet',
      assessment_power_units: '5 to 20',
      assessment_start_area: 'Drivers',
    });
    expect(JSON.parse(p.assessment_answers_json!)).toHaveLength(8);
  });
  it('splits names', () => {
    expect(splitName('  Mary Ann  van der Berg ')).toEqual({ firstname: 'Mary', lastname: 'Ann van der Berg' });
    expect(splitName('Cher')).toEqual({ firstname: 'Cher', lastname: '' });
  });
});

describe('HubSpotClient.sync', () => {
  it('creates a new contact with lifecycle/lead status, then a note associated to it', async () => {
    const { calls, fetchImpl } = fakeHubSpot((c) => {
      if (c.method === 'GET') return { status: 404, body: { message: 'not found' } };
      if (c.method === 'POST' && c.url.endsWith('/crm/v3/objects/contacts')) return { status: 201, body: { id: '501' } };
      if (c.method === 'POST' && c.url.endsWith('/crm/v3/objects/notes')) return { status: 201, body: { id: '9001' } };
      if (c.method === 'PATCH') return { status: 200, body: { id: '501' } };
    });
    const { s, r } = setup();
    const out = await client(fetchImpl, { lifecycleStage: 'lead', leadStatus: 'NEW' }).sync(s, r, ctx);

    expect(out).toEqual({ contactId: '501', existingContact: false, noteCreated: true });
    expect(calls.map((c) => c.method)).toEqual(['GET', 'POST', 'POST', 'PATCH']);
    expect(calls[0]!.url).toContain('/crm/v3/objects/contacts/sam%40example.com?idProperty=email');
    expect(calls[1]!.body!.properties).toMatchObject({ lifecyclestage: 'lead', hs_lead_status: 'NEW', email: 'sam@example.com' });
    const note = calls[2]!.body as { properties: Record<string, string>; associations: unknown[] };
    expect(note.properties.hs_note_body).toContain('Almost There! (63%)');
    expect(note.properties.hs_note_body).toContain('Hiring and driver files</strong>: No');
    expect(note.associations).toEqual([
      { to: { id: '501' }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }] },
    ]);
    expect(calls[3]!.body).toEqual({ properties: { assessment_last_submission_id: s.submissionId } });
  });

  it('updates an existing contact (no duplicate) and does not touch lifecycle stage', async () => {
    const { calls, fetchImpl } = fakeHubSpot((c) => {
      if (c.method === 'GET') return { status: 200, body: { id: '77', properties: { assessment_last_submission_id: 'older' } } };
      if (c.method === 'PATCH') return { status: 200, body: { id: '77' } };
      if (c.url.endsWith('/notes')) return { status: 201, body: { id: '1' } };
    });
    const { s, r } = setup();
    const out = await client(fetchImpl, { lifecycleStage: 'lead' }).sync(s, r, ctx);
    expect(out).toEqual({ contactId: '77', existingContact: true, noteCreated: true });
    expect(calls.filter((c) => c.method === 'POST' && c.url.endsWith('/contacts'))).toHaveLength(0);
    expect(calls[1]!.body!.properties).not.toHaveProperty('lifecyclestage');
  });

  it('handles a 409 "already exists" race by updating the existing contact', async () => {
    const { calls, fetchImpl } = fakeHubSpot((c) => {
      if (c.method === 'GET') return { status: 404 };
      if (c.method === 'POST' && c.url.endsWith('/contacts')) return { status: 409, body: { message: 'Contact already exists. Existing ID: 4242' } };
      if (c.method === 'PATCH') return { status: 200, body: {} };
      if (c.url.endsWith('/notes')) return { status: 201, body: { id: '1' } };
    });
    const { s, r } = setup();
    const out = await client(fetchImpl).sync(s, r, ctx);
    expect(out.contactId).toBe('4242');
    expect(out.existingContact).toBe(true);
    expect(calls.some((c) => c.method === 'PATCH' && c.url.endsWith('/contacts/4242'))).toBe(true);
  });

  it('is idempotent: same submission id already stamped on the contact => no second note', async () => {
    const { s, r } = setup();
    const { calls, fetchImpl } = fakeHubSpot((c) => {
      if (c.method === 'GET') return { status: 200, body: { id: '77', properties: { assessment_last_submission_id: s.submissionId } } };
      if (c.method === 'PATCH') return { status: 200, body: {} };
    });
    const out = await client(fetchImpl).sync(s, r, ctx);
    expect(out.noteCreated).toBe(false);
    expect(calls.some((c) => c.url.endsWith('/notes'))).toBe(false);
  });

  it('retries 429 then succeeds; throws a non-retryable error for 400', async () => {
    let n = 0;
    const ok = fakeHubSpot((c) => {
      if (c.method === 'GET') return n++ === 0 ? { status: 429, headers: { 'retry-after': '1' } } : { status: 404 };
      if (c.url.endsWith('/contacts')) return { status: 201, body: { id: '1' } };
      return { status: 200, body: { id: '1' } };
    });
    const { s, r } = setup();
    await expect(client(ok.fetchImpl).sync(s, r, ctx)).resolves.toMatchObject({ contactId: '1' });

    const bad = fakeHubSpot((c) => (c.method === 'GET' ? { status: 404 } : { status: 400, body: { message: 'Property "assessment_x" does not exist' } }));
    await expect(client(bad.fetchImpl).sync(s, r, ctx)).rejects.toMatchObject({ status: 400, retryable: false });
  });
});

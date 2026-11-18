/**
 * Framework-agnostic submit handler: validate -> bot checks -> recompute score -> idempotency -> HubSpot
 * (or queue). Used by the Express route and usable from any serverless adapter.
 */
import { calculateResult } from '../../src/lib/scoring';
import { submissionSchema, type Submission, type SubmitResponse } from '../../src/schemas/submission';
import type { Config } from '../config';
import { maskEmail, type Logger } from '../lib/logger';
import type { HubSpotSync } from './hubspot';
import { idempotencyKey, type FileQueue } from './queue';
import { verifyTurnstile } from './turnstile';

export interface SubmitDeps {
  config: Pick<Config, 'MIN_COMPLETION_MS' | 'TURNSTILE_ENABLED' | 'TURNSTILE_SECRET_KEY'>;
  hubspot: HubSpotSync;
  queue: FileQueue;
  log: Logger;
  verifyCaptcha?: typeof verifyTurnstile;
}

export interface HandlerResult {
  status: number;
  body: SubmitResponse;
}

const inFlight = new Map<string, Promise<HandlerResult>>();

function success(s: Submission, requestId: string, status: 'synced' | 'queued' | 'duplicate', existingContact: boolean): SubmitResponse {
  const r = calculateResult(s.answers);
  return {
    ok: true,
    status,
    submissionId: s.submissionId,
    requestId,
    existingContact,
    result: { percent: r.percent, bandId: r.band.id, dimensions: r.dimensions.map((d) => ({ id: d.id, percent: d.percent })) },
  };
}

export async function handleSubmit(raw: unknown, ctx: { requestId: string; ip?: string }, deps: SubmitDeps): Promise<HandlerResult> {
  const { requestId } = ctx;
  const log = deps.log.child({ requestId });

  const parsed = submissionSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join('.') || '_';
      (fieldErrors[k] ??= []).push(issue.message);
    }
    log.info({ issues: Object.keys(fieldErrors), formErrors: flat.formErrors.length }, 'submission rejected: validation');
    return {
      status: 400,
      body: { ok: false, code: 'validation', message: 'Some of your details need another look.', requestId, fieldErrors },
    };
  }
  const s = parsed.data;
  const masked = maskEmail(s.lead.email);

  // Honeypot: answer like a success so bots learn nothing, but do not store or sync.
  if (s.website && s.website.trim() !== '') {
    log.warn({ emailMasked: masked, reason: 'honeypot' }, 'submission dropped: bot');
    return { status: 200, body: success(s, requestId, 'synced', false) };
  }
  if (s.durationMs < deps.config.MIN_COMPLETION_MS) {
    log.warn({ emailMasked: masked, reason: 'too_fast', durationMs: s.durationMs }, 'submission rejected: bot check');
    return { status: 400, body: { ok: false, code: 'bot_check', message: 'Please try again.', requestId } };
  }
  if (deps.config.TURNSTILE_ENABLED) {
    const ok = await (deps.verifyCaptcha ?? verifyTurnstile)(s.turnstileToken, deps.config.TURNSTILE_SECRET_KEY ?? '', ctx.ip);
    if (!ok) {
      log.warn({ emailMasked: masked, reason: 'turnstile' }, 'submission rejected: bot check');
      return { status: 400, body: { ok: false, code: 'bot_check', message: 'Please confirm you are human and try again.', requestId } };
    }
  }

  // Recompute on the server; any client-side score is ignored.
  const result = calculateResult(s.answers);
  const key = idempotencyKey(s.lead.email, s.submissionId);

  const done = await deps.queue.getProcessed(key);
  if (done) {
    log.info({ emailMasked: masked, submissionId: s.submissionId }, 'duplicate submission; already synced');
    return { status: 200, body: success(s, requestId, 'duplicate', done.existingContact) };
  }
  if (await deps.queue.has(key)) {
    log.info({ emailMasked: masked, submissionId: s.submissionId }, 'duplicate submission; already queued');
    return { status: 202, body: success(s, requestId, 'queued', false) };
  }

  // Collapse concurrent identical requests (double-clicks, client retries) into one sync.
  const pending = inFlight.get(key);
  if (pending) return pending.then((r) => ({ ...r, body: r.body.ok ? { ...r.body, requestId } : r.body }));

  const work = (async (): Promise<HandlerResult> => {
    try {
      const sync = await deps.hubspot.sync(s, result, { requestId, log });
      await deps.queue.markProcessed({ key, at: new Date().toISOString(), contactId: sync.contactId, existingContact: sync.existingContact });
      log.info({ emailMasked: masked, score: result.percent, band: result.band.id, mode: deps.hubspot.mode }, 'submission synced');
      return { status: 200, body: success(s, requestId, 'synced', sync.existingContact) };
    } catch (e) {
      const err = e as { status?: number; body?: string; message?: string };
      // Full HubSpot detail stays in the server log only.
      log.error({ emailMasked: masked, hubspotStatus: err.status, hubspotBody: err.body?.slice(0, 500), err: err.message }, 'hubspot sync failed; queued');
      try {
        await deps.queue.enqueue({ key, submission: s, requestId, lastError: `status ${err.status ?? 'network'}` });
      } catch (qe) {
        log.fatal({ err: (qe as Error).message, emailMasked: masked }, 'could not persist submission to queue');
        return { status: 500, body: { ok: false, code: 'server_error', message: 'Something went wrong on our side.', requestId } };
      }
      return { status: 202, body: success(s, requestId, 'queued', false) };
    }
  })();
  inFlight.set(key, work);
  try {
    return await work;
  } finally {
    inFlight.delete(key);
  }
}

/** Background replay of queued submissions. */
export async function processQueue(deps: Omit<SubmitDeps, 'config'> & { maxAttempts: number; force?: boolean }) {
  const res = await deps.queue.process(
    async (job) => {
      const result = calculateResult(job.submission.answers);
      const sync = await deps.hubspot.sync(job.submission, result, { requestId: job.requestId, log: deps.log }).catch((e: { status?: number; body?: string; message?: string }) => {
        deps.log.warn({ requestId: job.requestId, attempts: job.attempts, hubspotStatus: e.status, hubspotBody: e.body?.slice(0, 500), err: e.message }, 'queued sync failed');
        throw e;
      });
      await deps.queue.markProcessed({ key: job.key, at: new Date().toISOString(), contactId: sync.contactId, existingContact: sync.existingContact });
    },
    { maxAttempts: deps.maxAttempts, force: deps.force },
  );
  if (res.succeeded || res.failed || res.dead) deps.log.info(res, 'queue processed');
  if (res.dead) deps.log.error({ dead: res.dead }, 'queued submissions moved to dead-letter file');
  return res;
}

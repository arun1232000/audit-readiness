import { submissionSchema, type SubmissionInput, type SubmitResponse } from '../schemas/submission';
import { calculateResult } from './scoring';
import { sendToWeb3Forms, WEB3FORMS_KEY, web3formsPayload } from './web3forms';

/** Where leads go, decided at build time:
 *  - VITE_WEB3FORMS_ACCESS_KEY set: the browser sends each lead to Web3Forms (emailed to you). No server needed.
 *  - else VITE_DEMO_MODE=true: scored in the browser and sent nowhere (a demo).
 *  - else: POST /api/submit on the Express server (HubSpot sync). */
export const USE_WEB3FORMS = WEB3FORMS_KEY !== '';
export const DEMO_MODE = !USE_WEB3FORMS && import.meta.env.VITE_DEMO_MODE === 'true';

/** Bots that fill the hidden field or finish implausibly fast get a normal-looking success and nothing is sent. */
const MIN_COMPLETION_MS = 4000;

async function browserSubmit(payload: SubmissionInput, send: boolean, timeoutMs: number, retries: number): Promise<SubmitResponse> {
  const parsed = submissionSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, code: 'validation', message: 'Some of your details need another look.' };
  const s = parsed.data;
  const r = calculateResult(s.answers);
  const success: SubmitResponse = {
    ok: true,
    status: 'synced',
    submissionId: s.submissionId,
    requestId: send ? 'web3forms' : 'demo',
    existingContact: false,
    result: { percent: r.percent, bandId: r.band.id, dimensions: r.dimensions.map((d) => ({ id: d.id, percent: d.percent })) },
  };
  if (!send) {
    await new Promise((res) => setTimeout(res, 500));
    return success;
  }
  if (s.website || s.durationMs < MIN_COMPLETION_MS) return success;

  const fields = web3formsPayload(s, r, WEB3FORMS_KEY);
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const sent = await sendToWeb3Forms(fields, ctrl.signal);
      if (sent.ok) return success;
      return { ok: false, code: 'server_error', message: 'Something went wrong on our side.' };
    } catch {
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, 800));
        continue;
      }
      throw new NetworkError();
    } finally {
      clearTimeout(timer);
    }
  }
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** Sends a completed check (see USE_WEB3FORMS / DEMO_MODE above). Throws NetworkError when the server can't be reached; returns the parsed body otherwise.
 *  Safe to retry: the server de-duplicates on submissionId. */
export async function submitAssessment(
  payload: SubmissionInput,
  { timeoutMs = 20000, retries = 1 }: { timeoutMs?: number; retries?: number } = {},
): Promise<SubmitResponse> {
  if (USE_WEB3FORMS || DEMO_MODE) return browserSubmit(payload, USE_WEB3FORMS, timeoutMs, retries);
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${API_BASE}/api/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const body = (await res.json().catch(() => null)) as SubmitResponse | null;
      if (body && typeof body === 'object' && 'ok' in body) return body;
      if (res.status >= 500 && attempt < retries) continue;
      return { ok: false, code: 'server_error', message: 'Something went wrong on our side.' };
    } catch {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      throw new NetworkError();
    } finally {
      clearTimeout(timer);
    }
  }
}

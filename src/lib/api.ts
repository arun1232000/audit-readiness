import { submissionSchema, type SubmissionInput, type SubmitResponse } from '../schemas/submission';
import { calculateResult } from './scoring';

/** Static hosting (e.g. GitHub Pages) has no server: VITE_DEMO_MODE=true validates and scores in the browser
 *  and sends nothing anywhere. Real deployments leave it unset so the server syncs to HubSpot. */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

async function demoSubmit(payload: SubmissionInput): Promise<SubmitResponse> {
  await new Promise((r) => setTimeout(r, 500));
  const parsed = submissionSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, code: 'validation', message: 'Some of your details need another look.' };
  const r = calculateResult(parsed.data.answers);
  return {
    ok: true,
    status: 'synced',
    submissionId: parsed.data.submissionId,
    requestId: 'demo',
    existingContact: false,
    result: { percent: r.percent, bandId: r.band.id, dimensions: r.dimensions.map((d) => ({ id: d.id, percent: d.percent })) },
  };
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** POST /api/submit. Throws NetworkError when the server can't be reached; returns the parsed body otherwise.
 *  Safe to retry: the server de-duplicates on submissionId. */
export async function submitAssessment(
  payload: SubmissionInput,
  { timeoutMs = 20000, retries = 1 }: { timeoutMs?: number; retries?: number } = {},
): Promise<SubmitResponse> {
  if (DEMO_MODE) return demoSubmit(payload);
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

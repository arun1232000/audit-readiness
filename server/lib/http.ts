/** fetch with per-attempt timeout and exponential backoff (with jitter) on 429 / 5xx / network errors. */

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly retryable: boolean,
  ) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }
}

export interface RetryOptions {
  timeoutMs: number;
  maxRetries: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (info: { attempt: number; status?: number; delayMs: number }) => void;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const isRetryableStatus = (s: number) => s === 429 || s >= 500;

export async function fetchWithRetry(url: string, init: RequestInit, opts: RetryOptions): Promise<Response> {
  const { timeoutMs, maxRetries, baseDelayMs = 500, maxDelayMs = 8000, fetchImpl = fetch, sleep = defaultSleep } = opts;
  for (let attempt = 0; ; attempt++) {
    let res: Response | undefined;
    let networkError: unknown;
    try {
      res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      networkError = e;
    }
    const retryable = networkError !== undefined || (res !== undefined && isRetryableStatus(res.status));
    if (!retryable) return res!;
    if (attempt >= maxRetries) {
      if (res) return res; // caller decides; status is retryable
      throw new HttpError(0, String((networkError as Error)?.message ?? networkError), true);
    }
    const retryAfter = res?.headers.get('retry-after');
    const fromHeader = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : undefined;
    const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
    const delayMs = Math.min(maxDelayMs, fromHeader ?? backoff / 2 + Math.random() * (backoff / 2));
    opts.onRetry?.({ attempt: attempt + 1, status: res?.status, delayMs });
    await sleep(delayMs);
  }
}

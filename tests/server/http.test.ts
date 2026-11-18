import { describe, expect, it, vi } from 'vitest';
import { fetchWithRetry } from '../../server/lib/http';

const resp = (status: number, headers: Record<string, string> = {}) => new Response('{}', { status, headers });

describe('fetchWithRetry', () => {
  it('retries 429 and 5xx with exponential backoff, honouring Retry-After', async () => {
    const f = vi.fn().mockResolvedValueOnce(resp(429, { 'retry-after': '2' })).mockResolvedValueOnce(resp(502)).mockResolvedValueOnce(resp(200));
    const sleeps: number[] = [];
    const r = await fetchWithRetry('https://x', {}, { timeoutMs: 1000, maxRetries: 3, fetchImpl: f, sleep: async (ms) => void sleeps.push(ms) });
    expect(r.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(3);
    expect(sleeps[0]).toBe(2000);
    expect(sleeps[1]).toBeGreaterThanOrEqual(500); // attempt 2: backoff 1000ms, jittered to [500,1000)
    expect(sleeps[1]).toBeLessThan(1000);
  });

  it('does not retry other 4xx', async () => {
    const f = vi.fn().mockResolvedValue(resp(400));
    const r = await fetchWithRetry('https://x', {}, { timeoutMs: 1000, maxRetries: 3, fetchImpl: f, sleep: async () => {} });
    expect(r.status).toBe(400);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('retries network errors then throws a retryable HttpError', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(fetchWithRetry('https://x', {}, { timeoutMs: 1000, maxRetries: 2, fetchImpl: f, sleep: async () => {} })).rejects.toMatchObject({
      status: 0,
      retryable: true,
    });
    expect(f).toHaveBeenCalledTimes(3);
  });
});

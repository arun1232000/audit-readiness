/** Cloudflare Turnstile server-side verification (enabled with TURNSTILE_ENABLED=true). */
export async function verifyTurnstile(
  token: string | undefined,
  secret: string,
  remoteIp?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);
  try {
    const res = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

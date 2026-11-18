/** First-touch attribution: captured once per browser on first load, sent with the submission. */
import type { Attribution } from '../schemas/submission';
import { readJSON, writeJSON } from './storage';
import { UTM_KEYS } from './utm-shared';

export { describeSource } from './utm-shared';

const KEY = 'audit:attribution';

const clip = (v: string | null | undefined, n: number) => (v ? v.slice(0, n) : undefined);

export function parseAttribution(href: string, referrer: string, now = new Date()): Attribution {
  const url = new URL(href);
  const a: Attribution = { firstSeenAt: now.toISOString() };
  for (const k of UTM_KEYS) {
    const v = clip(url.searchParams.get(k)?.trim(), 300);
    if (v) a[k] = v;
  }
  // Same-site referrers carry no attribution value.
  if (referrer) {
    try {
      if (new URL(referrer).host !== url.host) a.referrer = clip(referrer, 1000);
    } catch {
      /* malformed referrer */
    }
  }
  a.landingPage = clip(url.origin + url.pathname, 1000);
  return a;
}

/** Store attribution on first visit; a later visit with new UTMs overrides (last non-empty campaign wins). */
export function captureAttribution(): Attribution {
  const existing = readJSON<Attribution>('local', KEY);
  const current = parseAttribution(window.location.href, document.referrer);
  const hasNewUtm = UTM_KEYS.some((k) => current[k]);
  if (!existing || hasNewUtm) {
    writeJSON('local', KEY, current);
    return current;
  }
  return existing;
}

export function getAttribution(): Attribution {
  return readJSON<Attribution>('local', KEY) ?? {};
}

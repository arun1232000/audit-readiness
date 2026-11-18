import type { Attribution } from '../schemas/submission';

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/** "utm_source=google | utm_campaign=x | referrer=..." for the assessment_source property. */
export function describeSource(a: Attribution): string {
  const parts = [...UTM_KEYS.map((k) => (a[k] ? `${k}=${a[k]}` : '')), a.referrer ? `referrer=${a.referrer}` : ''].filter(Boolean);
  return parts.length ? parts.join(' | ') : 'direct';
}

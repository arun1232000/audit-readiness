/**
 * Web3Forms delivery: the browser posts the lead straight to https://api.web3forms.com/submit and
 * Web3Forms emails it to the address the access key was created for. No server is needed, so this
 * works on static hosting such as GitHub Pages.
 *
 * The access key is public by design (it only lets someone send a form to your inbox), so it is
 * baked into the bundle via VITE_WEB3FORMS_ACCESS_KEY.
 */
import { QUESTIONS } from '../data/assessment';
import type { Submission } from '../schemas/submission';
import { getChoice, type AssessmentResult } from './scoring';
import { describeSource } from './utm-shared';

export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
export const WEB3FORMS_KEY = (import.meta.env.VITE_WEB3FORMS_ACCESS_KEY as string | undefined)?.trim() ?? '';

const STATE_WORD = { ready: 'Ready', look: 'Needs a look', gap: 'Gap to close' } as const;

/** The fields Web3Forms emails, one row each, in reading order. */
export function web3formsPayload(s: Submission, r: AssessmentResult, accessKey: string): Record<string, string> {
  const fields: Record<string, string> = {
    access_key: accessKey,
    subject: `Audit check: ${s.lead.fullName}, ${r.percent}% (${r.band.name})`,
    from_name: 'Are you audit ready? check',
    // Web3Forms uses "email" as the reply-to address.
    name: s.lead.fullName,
    email: s.lead.email,
    phone: s.lead.phone,
    'Power units': s.powerUnits,
    'Readiness score': `${r.percent}% (${r.band.name}), ${r.points} of ${r.maxPoints} points`,
    Tally: `Yes ${r.counts.yes}, Partly ${r.counts.partly}, No ${r.counts.no}, Not sure ${r.counts.notsure}`,
    'Area to start with': r.startArea.name,
  };
  r.dimensions.forEach((d) => {
    fields[`Area ${d.code}: ${d.name}`] = `${d.percent}%, ${STATE_WORD[d.state]}`;
  });
  QUESTIONS.forEach((q, i) => {
    fields[`Q${i + 1}. ${q.title}`] = getChoice(s.answers[q.id]!).short;
  });
  fields['Items to review'] = r.followUps.length
    ? r.followUpsByPriority.map((f) => `Q${f.number} ${f.question.followUpTitle} (${f.choice.short})`).join('\n')
    : 'Answered Yes to all eight.';
  fields['Consent'] = s.lead.consent ? 'Yes, agreed to be contacted' : 'No';
  fields['Source'] = describeSource(s.attribution ?? {});
  fields['Submission ID'] = s.submissionId;
  return fields;
}

/** Posts to Web3Forms. Resolves true on success, false when Web3Forms rejects it; throws on network failure. */
export async function sendToWeb3Forms(fields: Record<string, string>, signal?: AbortSignal): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(WEB3FORMS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(fields),
    signal,
  });
  const body = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null;
  return { ok: res.ok && body?.success === true, message: body?.message };
}

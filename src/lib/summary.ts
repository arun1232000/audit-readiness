/** Plain-text and HTML summaries of a result. Shared by the browser (WhatsApp CTA) and server (HubSpot note). */
import { QUESTIONS } from '../data/assessment';
import { getChoice, type Answers, type AssessmentResult } from './scoring';

/** Pre-written WhatsApp message, verbatim structure from the reference page. */
export function whatsappText(r: AssessmentResult, ctx: { firstName?: string; powerUnits?: string } = {}): string {
  const lines = [
    'Hello Prime Compliance, I took the Are you audit ready? check.' + (ctx.firstName ? ` My name is ${ctx.firstName}.` : ''),
    ...(ctx.powerUnits ? [`Power units: ${ctx.powerUnits}`] : []),
    `My readiness score: ${r.percent}% (${r.band.name})`,
    `Yes ${r.counts.yes}, Partly ${r.counts.partly}, No ${r.counts.no}, Not sure ${r.counts.notsure}`,
  ];
  if (r.followUps.length) {
    lines.push('Items to review:');
    r.followUps.forEach((f) => lines.push(`- Q${f.number} ${f.question.followUpTitle} (${f.choice.short})`));
  } else {
    lines.push('I answered Yes to all eight.');
  }
  lines.push(`Area to start with: ${r.startArea.name}`);
  lines.push('I would like to request my audit readiness review.');
  return lines.join('\n');
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface NoteContext {
  fullName: string;
  powerUnits?: string;
  submissionId: string;
  completedAt: string;
  source?: string;
}

/** Readable HTML note for sales inside HubSpot: score, per-area scores, every question and answer, follow-ups. */
export function noteHtml(answers: Answers, r: AssessmentResult, ctx: NoteContext): string {
  const parts: string[] = [];
  parts.push(`<p><strong>Audit readiness check — ${esc(r.band.name)} (${r.percent}%)</strong></p>`);
  parts.push(
    `<p>${esc(ctx.fullName)} completed the check on ${esc(ctx.completedAt)}. ` +
      `Points ${r.points} of ${r.maxPoints}. Yes ${r.counts.yes}, Partly ${r.counts.partly}, No ${r.counts.no}, Not sure ${r.counts.notsure}.</p>`,
  );
  if (ctx.powerUnits) parts.push(`<p>Power units: ${esc(ctx.powerUnits)}. Area to start with: ${esc(r.startArea.name)}.</p>`);
  parts.push('<p><strong>By area</strong></p><ul>');
  const word = { ready: 'Ready', look: 'Needs a look', gap: 'Gap to close' } as const;
  r.dimensions.forEach((d) =>
    parts.push(`<li>${esc(d.code)} ${esc(d.name)}: ${d.percent}% (${d.points}/${d.maxPoints}), ${word[d.state]}</li>`),
  );
  parts.push('</ul><p><strong>Answers</strong></p><ol>');
  QUESTIONS.forEach((q) => {
    const c = getChoice(answers[q.id]!);
    parts.push(`<li><strong>${esc(q.title)}</strong>: ${esc(c.short)}<br/><em>${esc(q.text)}</em></li>`);
  });
  parts.push('</ol>');
  if (r.followUps.length) {
    parts.push('<p><strong>Items to review first</strong></p><ul>');
    r.followUpsByPriority.forEach((f) =>
      parts.push(
        `<li>Q${f.number}. ${esc(f.question.followUpTitle)} (${esc(f.choice.short)}) — ${esc(f.question.followUpDetail)}</li>`,
      ),
    );
    parts.push('</ul>');
  } else {
    parts.push('<p>Answered Yes to all eight.</p>');
  }
  if (ctx.source) parts.push(`<p>Source: ${esc(ctx.source)}</p>`);
  parts.push(`<p style="color:#888">Submission ${esc(ctx.submissionId)}</p>`);
  return parts.join('');
}

/** Compact "answers" representation for the assessment_answers_json property. */
export function answersJson(answers: Answers): string {
  return JSON.stringify(
    QUESTIONS.map((q, i) => ({ n: i + 1, id: q.id, title: q.title, answer: getChoice(answers[q.id]!).short })),
  );
}

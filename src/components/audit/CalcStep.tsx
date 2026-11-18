import { useEffect, useRef, useState } from 'react';
import { ASSESSMENT_COPY } from '../../data/assessment';
import { NetworkError, submitAssessment } from '../../lib/api';
import { prefersReducedMotion } from '../../lib/reducedMotion';
import { setLastSubmission } from '../../lib/storage';
import { getAttribution } from '../../lib/utm';
import { useAssessment } from '../../store/assessmentStore';

const MIN_DISPLAY_MS = 2700;

/** The honest pause: three true steps while the submission is sent. Routes to results or the error step. */
export function CalcStep() {
  const [lit, setLit] = useState(0);
  const sent = useRef(false);

  useEffect(() => {
    const reduce = prefersReducedMotion();
    const timers = ASSESSMENT_COPY.calcSteps.map((_, i) => setTimeout(() => setLit(i + 1), reduce ? 0 : 500 + i * 750));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (sent.current) return; // StrictMode double-mount guard (server is idempotent anyway)
    sent.current = true;
    const s = useAssessment.getState();
    if (!s.lead || !s.powerUnits) {
      s.goTo(s.powerUnits ? 'lead' : 'units');
      return;
    }
    const began = Date.now();
    const min = prefersReducedMotion() ? 0 : MIN_DISPLAY_MS;
    const wait = () => new Promise((r) => setTimeout(r, Math.max(0, min - (Date.now() - began))));
    const record = (delivered: boolean) =>
      setLastSubmission({
        submissionId: s.submissionId,
        answers: s.answers,
        powerUnits: s.powerUnits,
        completedAt: new Date().toISOString(),
        delivered,
      });

    submitAssessment({
      submissionId: s.submissionId,
      lead: s.lead,
      answers: s.answers,
      powerUnits: s.powerUnits,
      attribution: getAttribution(),
      durationMs: Math.max(0, Math.min(Date.now() - (s.startedAt ?? Date.now()), 1000 * 60 * 60 * 24 * 30)),
      website: s.honeypot || undefined,
      turnstileToken: s.turnstileToken ?? undefined,
    })
      .then(async (res) => {
        await wait();
        if (res.ok) {
          record(true);
          useAssessment.getState().setOutcome({ status: res.status, existingContact: res.existingContact, requestId: res.requestId });
        } else {
          useAssessment.getState().setError({ kind: res.code, message: res.message, requestId: res.requestId });
        }
      })
      .catch(async (e: unknown) => {
        await wait();
        record(false);
        useAssessment.getState().setError({
          kind: 'network',
          message: e instanceof NetworkError ? "We couldn't reach our server." : 'Something unexpected happened.',
        });
      });
  }, []);

  return (
    <div className="card" id="calc" aria-live="polite">
      <div className="calc">
        <svg className="spin" viewBox="0 0 58 58" aria-hidden="true">
          <circle className="trk" cx="29" cy="29" r="24" />
          <circle className="arc" cx="29" cy="29" r="24" />
        </svg>
        <ul>
          {ASSESSMENT_COPY.calcSteps.map((t, i) => (
            <li key={t} className={i < lit ? 'on' : undefined}>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

import { Suspense, lazy, useEffect, useRef } from 'react';
import { brand } from '../../config/brand';
import { DIMENSIONS, QUESTIONS } from '../../data/assessment';
import { useAssessment } from '../../store/assessmentStore';
import { CalcStep } from './CalcStep';
import { ErrorStep } from './ErrorStep';
import { QuestionStep } from './QuestionStep';

// Split out: the phone input with country data, and the result card with the scratch canvas.
const LeadStep = lazy(() => import('./LeadStep').then((m) => ({ default: m.LeadStep })));
const ResultStep = lazy(() => import('./ResultStep').then((m) => ({ default: m.ResultStep })));

/** The check, in a dialog over the page. Escape or the backdrop closes it; progress is kept. */
export function AuditModal() {
  const { modalOpen, step, lead, close, setLead } = useAssessment();
  const inner = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!modalOpen) return;
    lastFocus.current = document.activeElement;
    document.body.classList.add('modal-open');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      // Keep Tab inside the dialog.
      if (e.key === 'Tab' && inner.current) {
        const f = inner.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select, summary, [tabindex="0"]',
        );
        const list = Array.from(f).filter((el) => el.offsetParent !== null);
        if (!list.length) return;
        const first = list[0]!;
        const lastEl = list[list.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      (lastFocus.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, [modalOpen, close]);

  useEffect(() => {
    inner.current?.scrollTo({ top: 0 });
  }, [step]);

  if (!modalOpen) return null;

  const stageClass = step === 'results' ? ' wide' : step === 'lead' ? ' lead' : '';
  return (
    <div className="modal" id="check" role="dialog" aria-modal="true" aria-label="The Audit check">
      <div className="modal-back" onClick={close} />
      <div className="modal-in" ref={inner}>
        <div className="check-bar">
          <span className="name">
            <img src={brand.logo.srcOnDark} alt={brand.logo.alt} width={brand.logo.width} height={brand.logo.height} />
            <span>The Audit</span>
          </span>
          <Progress />
          <button className="modal-x" type="button" aria-label="Close the check" onClick={close}>
            <b>{step === 'results' ? 'Close' : 'Save and close'}</b>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className={`check-stage hero-check${stageClass}`}>
          <Suspense fallback={<div className="card" style={{ minHeight: 320 }} />}>
            {(step === 'questions' || step === 'units') && <QuestionStep />}
            {step === 'lead' && <LeadStep defaultValues={lead ?? undefined} onSubmit={(l, hp, t) => setLead(l, hp, t)} />}
            {step === 'calc' && <CalcStep />}
            {step === 'results' && <ResultStep />}
            {step === 'error' && <ErrorStep />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

/** Eight segments grouped by area. Decorative: the question card carries the spoken count. */
function Progress() {
  const { step, index, answers } = useAssessment();
  const pastQuestions = step !== 'questions';
  return (
    <div className="segs" aria-hidden="true">
      {DIMENSIONS.map((d) => {
        const qs = QUESTIONS.map((q, i) => ({ q, i })).filter(({ q }) => q.dimension === d.id);
        const on = !pastQuestions && qs.some(({ i }) => i === index);
        return (
          <div key={d.id} className={`grp${on ? ' on' : ''}`}>
            <b>{d.shortName}</b>
            <div className="row">
              {qs.map(({ q, i }) => {
                const done = pastQuestions || (answers[q.id] !== undefined && i < index) || (i === index && answers[q.id] !== undefined);
                const cur = !pastQuestions && i === index && !done;
                return <span key={q.id} className={`seg${done ? ' done' : cur ? ' cur' : ''}`} />;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

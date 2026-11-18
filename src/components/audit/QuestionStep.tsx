import { useEffect, useRef, useState } from 'react';
import { ASSESSMENT_COPY, CHOICES, DIMENSIONS, POWER_UNITS, QUESTIONS, type ChoiceId, type PowerUnits } from '../../data/assessment';
import { prefersReducedMotion } from '../../lib/reducedMotion';
import { useAssessment } from '../../store/assessmentStore';
import { ANSWER_ICONS, QUESTION_ICONS, UNITS_ICON, UNIT_BARS } from '../icons';

const PICK_DELAY_MS = 260;
const SECONDS_PER_QUESTION = 7;

type View = { kind: 'q'; index: number } | { kind: 'units' };
const viewKey = (v: View) => (v.kind === 'q' ? `q${v.index}` : 'units');

/** The eight questions and the power-units tap, with the calm crossfade between them. */
export function QuestionStep() {
  const { step, index, answers, powerUnits, answer, advance, back, setUnits } = useAssessment();
  const target: View = step === 'units' ? { kind: 'units' } : { kind: 'q', index };
  const [view, setView] = useState<View>(target);
  const [out, setOut] = useState(false);
  const [popped, setPopped] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busy = useRef(false);
  const reduce = prefersReducedMotion();
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, reduce ? 0 : ms));

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Crossfade: out, a short rest, in. Then focus the new title.
  const tKey = viewKey(target);
  useEffect(() => {
    if (tKey === viewKey(view)) return;
    if (reduce) {
      setView(target);
      busy.current = false;
      return;
    }
    setOut(true);
    later(() => {
      setView(target);
      setPopped(null);
      busy.current = false;
      later(() => setOut(false), 120);
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tKey]);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [view]);

  const showToast = (t: string) => {
    setToast(t);
    later(() => setToast(null), 1600);
  };

  const pick = (choice: ChoiceId) => {
    if (busy.current || view.kind !== 'q') return;
    const q = QUESTIONS[view.index]!;
    answer(q.id, choice);
    setPopped(choice);
    const t = view.index === 0 ? 'first' : view.index === 3 ? 'half' : view.index === QUESTIONS.length - 1 ? 'last' : null;
    if (t) showToast(ASSESSMENT_COPY.toasts[t]!);
    busy.current = true;
    later(advance, PICK_DELAY_MS);
  };

  const pickUnits = (u: PowerUnits) => {
    if (busy.current) return;
    setPopped(u);
    busy.current = true;
    later(() => {
      busy.current = false;
      setUnits(u);
    }, PICK_DELAY_MS);
  };

  const qi = view.kind === 'q' ? view.index : -1;
  const q = qi >= 0 ? QUESTIONS[qi]! : null;
  const dim = q ? DIMENSIONS.find((d) => d.id === q.dimension) : null;
  const answered = q ? answers[q.id] : undefined;
  const left = (QUESTIONS.length - qi) * SECONDS_PER_QUESTION;
  const isLast = qi === QUESTIONS.length - 1;

  return (
    <div className="card" id="qcard">
      <div className="qhead">
        <p className="count" aria-live="polite">
          {view.kind === 'units' ? (
            <>
              {ASSESSMENT_COPY.units.count} <span>{ASSESSMENT_COPY.units.countSub}</span>
            </>
          ) : isLast ? (
            <>
              {ASSESSMENT_COPY.lastOne} <span>of {QUESTIONS.length}</span>
            </>
          ) : (
            <>
              Question {qi + 1} <span>of {QUESTIONS.length}</span>
              <span className="timeleft">, about {left >= 60 ? 'a minute' : `${left} seconds`} left</span>
            </>
          )}
        </p>
        <button className="back" type="button" hidden={qi === 0} onClick={() => !busy.current && back()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Back
        </button>
      </div>
      <div className={`toast${toast ? ' on' : ''}`} aria-live="polite">
        {toast}
      </div>
      <div id="qbody" className={out ? 'out' : undefined}>
        <div className="qtop">
          <div className="qicon" aria-hidden="true">
            {q ? QUESTION_ICONS[qi] : UNITS_ICON}
          </div>
          <div>
            <p className="area">{q ? `${dim?.code} ${dim?.name}` : ASSESSMENT_COPY.units.area}</p>
            <h3 className="qtitle" id="qtitle" ref={title} tabIndex={-1}>
              {q ? q.title : ASSESSMENT_COPY.units.title}
            </h3>
          </div>
        </div>
        <p className="qtext">{q ? q.text : ASSESSMENT_COPY.units.text}</p>
        {q && (
          <details className="rule">
            <summary>{ASSESSMENT_COPY.answerRuleSummary}</summary>
            <p>{ASSESSMENT_COPY.answerRule}</p>
          </details>
        )}
        <div className="answers" role="group" aria-labelledby="qtitle">
          {q
            ? CHOICES.map((c, k) => (
                <button
                  key={c.id}
                  type="button"
                  className={`ans${c.id === 'notsure' ? '' : ` k-${c.id}`}${popped === c.id ? ' pop' : ''}`}
                  aria-pressed={answered === c.id}
                  onClick={() => pick(c.id)}
                >
                  <span className="ai">{ANSWER_ICONS[c.id]}</span>
                  <span>{c.label}</span>
                  <span className="key" aria-hidden="true">
                    {k + 1}
                  </span>
                </button>
              ))
            : POWER_UNITS.map((u, k) => (
                <button
                  key={u}
                  type="button"
                  className={`ans${popped === u ? ' pop' : ''}`}
                  aria-pressed={(popped ?? powerUnits) === u}
                  onClick={() => pickUnits(u)}
                >
                  <span className="tr" aria-hidden="true">
                    {UNIT_BARS[k]!.map((_, j) => (
                      <i key={j} style={{ height: 10 + (j % 3) * 7 }} />
                    ))}
                  </span>
                  <span>{u}</span>
                  <span className="key" aria-hidden="true">
                    {k + 1}
                  </span>
                </button>
              ))}
        </div>
        <p className="kbd-hint">
          Tip: press <kbd>1</kbd> to <kbd>4</kbd> to answer{q && qi > 0 ? <>, <kbd>Backspace</kbd> to go back</> : null}.
        </p>
      </div>
    </div>
  );
}

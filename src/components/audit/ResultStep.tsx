import { useEffect, useMemo, useRef, useState } from 'react';
import { brand } from '../../config/brand';
import { AREA_STATE_WORD, ASSESSMENT_COPY } from '../../data/assessment';
import { DEMO_MODE } from '../../lib/api';
import { prefersReducedMotion } from '../../lib/reducedMotion';
import { calculateResult, isComplete, tallyLine, type FollowUp } from '../../lib/scoring';
import { getLastSubmission } from '../../lib/storage';
import { whatsappText } from '../../lib/summary';
import { useAssessment } from '../../store/assessmentStore';
import { AREA_ICONS, WhatsAppIcon } from '../icons';
import { ScratchCard } from './ScratchCard';

const BIG = 502.65;

function Items({ items, start = 0 }: { items: FollowUp[]; start?: number }) {
  return (
    <ol className="items recs" style={{ counterReset: `rec ${start}` }}>
      {items.map((f) => (
        <li key={f.question.id}>
          <span className="t">
            <small>Q{f.number}.</small>
            {f.question.followUpTitle}
          </span>
          <span className="d">{f.question.followUpDetail}</span>
          <span className="a">You answered: {f.choice.short}</span>
        </li>
      ))}
    </ol>
  );
}

/** The calm scorecard: the ring settles to the score, one breath, then the report fades in. */
export function ResultStep() {
  const { answers, powerUnits, lead, outcome, error, viewingPrevious, retake, goTo } = useAssessment();
  const result = useMemo(() => (isComplete(answers) ? calculateResult(answers) : null), [answers]);
  const reduce = prefersReducedMotion();
  const [shown, setShown] = useState(reduce ? (result?.percent ?? 0) : 0);
  const [settled, setSettled] = useState(reduce);
  const [litCount, setLitCount] = useState(reduce ? 4 : 0);
  const [waGlow, setWaGlow] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => title.current?.focus({ preventScroll: true }), []);

  useEffect(() => {
    if (!result || reduce) return;
    let raf = 0;
    let t0: number | null = null;
    const dur = 2400;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const step = (t: number) => {
      t0 ??= t;
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(e * result.percent);
      if (k < 1) raf = requestAnimationFrame(step);
      else timers.push(setTimeout(() => setSettled(true), 500));
    };
    timers.push(setTimeout(() => (raf = requestAnimationFrame(step)), 350));
    for (let k = 0; k < 4; k++) timers.push(setTimeout(() => setLitCount(k + 1), 3200 + k * 450));
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [result, reduce]);

  if (!result) {
    return (
      <div className="card errcard">
        <h3 className="qtitle" ref={title} tabIndex={-1}>
          We couldn't find your answers
        </h3>
        <button className="btn" type="button" onClick={retake}>
          Start the check <span className="arr" aria-hidden="true">&rarr;</span>
        </button>
      </div>
    );
  }

  const units = powerUnits ?? 'your';
  const firstName = lead?.fullName.trim().split(/\s+/)[0];
  const cta = brand.cta;
  const ctaHref =
    cta.kind === 'whatsapp'
      ? `https://wa.me/${cta.number}?text=${encodeURIComponent(whatsappText(result, { firstName, powerUnits: powerUnits ?? undefined }))}`
      : cta.url;
  const top = result.followUpsByPriority.slice(0, ASSESSMENT_COPY.topFollowUps);
  const more = result.followUpsByPriority.slice(ASSESSMENT_COPY.topFollowUps);
  const gaps = result.areasNeedingAttention;
  const last = viewingPrevious ? getLastSubmission() : null;

  const ctaLink = (extra = '') => (
    <a className={`btn wa-btn${waGlow ? ' glow' : ''}${extra}`} href={ctaHref} target="_blank" rel="noopener noreferrer">
      {cta.kind === 'whatsapp' && <WhatsAppIcon />}
      {cta.label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );

  return (
    <div className="result-grid" id="result" aria-live="polite">
      {/* left: the score and the one thing to do next (sticky on wide screens) */}
      <section className="card score-panel" aria-labelledby="band-name">
        <div className="settle">
          <div className="bigring">
            <svg viewBox="0 0 180 180" aria-hidden="true">
              <circle className="trk" cx="90" cy="90" r="80" />
              <circle className="val" cx="90" cy="90" r="80" style={{ strokeDashoffset: BIG * (1 - shown / 100) }} />
            </svg>
            <div className="num" aria-hidden="true">
              {Math.round(shown)}%
            </div>
          </div>
          <div className="pct-label">
            {ASSESSMENT_COPY.scoreLabel}
            <span className="sr-only">: {result.percent}%</span>
          </div>
          <h3 className="band-name" id="band-name" ref={title} tabIndex={-1}>
            {result.band.name}
          </h3>
        </div>
        <div className={`fade${settled ? '' : ' wait'}`}>
          <div className="msg lead">
            {result.band.message.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <p className="next">
            <small>{ASSESSMENT_COPY.nextStepLabel}</small>
            <span>{result.band.nextStep}</span>
          </p>
          <div className="ask">
            <h4>{ASSESSMENT_COPY.askHeading}</h4>
            <p>{ASSESSMENT_COPY.askBody}</p>
            {ctaLink()}
            <p className="fine center">{cta.helper}</p>
          </div>
          <div className="numbers center">
            <div>
              WhatsApp{' '}
              <a href={`https://wa.me/${brand.whatsapp.number}`} target="_blank" rel="noopener noreferrer">
                {brand.whatsapp.label}
              </a>
            </div>
            <div>
              Calls <a href={`tel:${brand.phone.tel}`}>{brand.phone.label}</a>
            </div>
          </div>
          <p className="center">
            <button className="again" type="button" onClick={retake}>
              {ASSESSMENT_COPY.again}
            </button>
          </p>
        </div>
      </section>

      {/* right: the report */}
      <section className={`card report-card fade${settled ? '' : ' wait'}`} id="resultbody" aria-label="Your report">
        {viewingPrevious && last && (
          <p className="status-note" style={{ marginTop: 0, marginBottom: 20 }}>
            This is the result from your last check on{' '}
            {new Date(last.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
        )}
        {DEMO_MODE && !viewingPrevious && (
          <p className="status-note" style={{ marginTop: 0, marginBottom: 20 }}>
            Demo version: your answers and details stayed on this device and were not sent to anyone.
          </p>
        )}
        {!viewingPrevious && outcome?.status === 'duplicate' && (
          <p className="status-note" style={{ marginTop: 0, marginBottom: 20 }}>We already have this result, so nothing was sent twice.</p>
        )}
        {!viewingPrevious && outcome?.existingContact && outcome.status !== 'duplicate' && (
          <p className="status-note" style={{ marginTop: 0, marginBottom: 20 }}>Welcome back. We've added this latest result to your details.</p>
        )}
        {!viewingPrevious && outcome?.status === 'queued' && (
          <p className="status-note" style={{ marginTop: 0, marginBottom: 20 }}>Your report is saved. Our team will receive it shortly.</p>
        )}
        {!viewingPrevious && !outcome && error && (
          <p className="status-note warn" role="status" style={{ marginTop: 0, marginBottom: 20 }}>
            Your report hasn't reached our team yet.
            <button type="button" onClick={() => goTo('calc')}>
              Try sending again
            </button>
          </p>
        )}

        <h4 className="section-h">{ASSESSMENT_COPY.areasHeading}</h4>
        <div className="areas" aria-label="Your readiness by area">
          {result.dimensions.map((d, k) => (
            <div key={d.id} className={`area-row ${d.state}${k < litCount ? ' lit' : ''}`}>
              <span className="atop">
                <span className="aico">{AREA_ICONS[d.id]}</span>
                <span className="pct">{d.percent}%</span>
              </span>
              <b>{d.name}</b>
              <span className="meter" aria-hidden="true">
                <i style={{ width: k < litCount ? `${d.percent}%` : 0 }} />
              </span>
              <span>
                <i />
                <em style={{ fontStyle: 'normal' }}>{AREA_STATE_WORD[d.state]}</em>
              </span>
            </div>
          ))}
        </div>
        <p className="summary">
          {gaps === 0 ? ASSESSMENT_COPY.summaryAllYes(units) : ASSESSMENT_COPY.summaryWithGaps(units, gaps, result.startArea.name)}
        </p>

        <ScratchCard
          subtitle={gaps === 0 ? ASSESSMENT_COPY.prizeAllYes : ASSESSMENT_COPY.prizeWithGaps(result.startArea.name)}
          onDone={() => !reduce && setWaGlow(true)}
        />

        {top.length > 0 ? (
          <div>
            <h4 className="sub">{ASSESSMENT_COPY.concernsHeading}</h4>
            <Items items={top} />
          </div>
        ) : (
          <p className="allyes">{ASSESSMENT_COPY.allYes}</p>
        )}

        <details className="report">
          <summary>{more.length ? ASSESSMENT_COPY.reportMore(more.length) : ASSESSMENT_COPY.reportSummary}</summary>
          {more.length > 0 && (
            <div>
              <h4 className="sub more-h">{ASSESSMENT_COPY.reportMoreHeading}</h4>
              <Items items={more} start={ASSESSMENT_COPY.topFollowUps} />
            </div>
          )}
          <p className="tally">
            {tallyLine(result)}
            {powerUnits ? ` Power units: ${powerUnits}.` : ''}
          </p>
          <p className="kept">{result.followUps.length ? ASSESSMENT_COPY.keptWithGaps : ASSESSMENT_COPY.keptAllYes}</p>
        </details>

        <p className="fine">{ASSESSMENT_COPY.fine}</p>
      </section>

      {/* phones: the request stays one tap away while reading the report */}
      <div className={`cta-dock${settled ? '' : ' wait'}`} aria-hidden={!settled}>
        {ctaLink()}
      </div>
    </div>
  );
}

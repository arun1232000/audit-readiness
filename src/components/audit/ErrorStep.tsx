import { useEffect, useRef } from 'react';
import { brand } from '../../config/brand';
import { useAssessment } from '../../store/assessmentStore';
import { Turnstile } from '../Turnstile';

const COPY: Record<string, { title: string; body: string }> = {
  network: {
    title: "We couldn't send your answers",
    body: "It looks like you're offline or our server didn't respond. Your answers are safe on this device. Check your connection and try again.",
  },
  server_error: { title: 'Something went wrong on our side', body: 'Your answers are safe on this device. Please try again in a moment.' },
  rate_limited: { title: 'Too many attempts', body: 'Please wait a minute, then try again. Your answers are safe on this device.' },
  bot_check: { title: 'Please confirm you are human', body: 'Complete the quick check below, then send your answers again.' },
  validation: { title: 'Some of your details need another look', body: 'Please check your name, mobile and email, then continue.' },
};

export function ErrorStep() {
  const error = useAssessment((s) => s.error);
  const goTo = useAssessment((s) => s.goTo);
  const setToken = useAssessment((s) => s.setTurnstileToken);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus({ preventScroll: true }), []);
  const kind = error?.kind ?? 'server_error';
  const c = COPY[kind] ?? COPY.server_error!;
  const canSeeResult = kind === 'network' || kind === 'server_error' || kind === 'rate_limited';

  return (
    <div className="card errcard" role="alert">
      <p className="area">Your report</p>
      <h3 className="qtitle" ref={title} tabIndex={-1}>
        {c.title}
      </h3>
      <p className="qtext">{c.body}</p>
      {kind === 'bot_check' && (
        <div style={{ marginTop: 16 }}>
          <Turnstile onToken={setToken} />
        </div>
      )}
      {kind === 'validation' ? (
        <button className="btn" type="button" onClick={() => goTo('lead')}>
          Check my details <span className="arr" aria-hidden="true">&rarr;</span>
        </button>
      ) : (
        <button className="btn" type="button" onClick={() => goTo('calc')}>
          Try again <span className="arr" aria-hidden="true">&rarr;</span>
        </button>
      )}
      {canSeeResult && (
        <p className="center">
          <button className="again" type="button" onClick={() => goTo('results')}>
            See my result anyway
          </button>
        </p>
      )}
      <p className="fine center">
        Still stuck? Call us on <a href={`tel:${brand.phone.tel}`}>{brand.phone.label}</a>
        {error?.requestId && <> and mention reference {error.requestId.slice(0, 8)}</>}.
      </p>
    </div>
  );
}

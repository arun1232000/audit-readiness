import { useEffect, useRef, useState } from 'react';
import { brand } from '../config/brand';
import { DIMENSIONS, QUESTIONS } from '../data/assessment';
import { AREA_ICONS, GapMark, STEP_ICONS, Tick } from '../components/icons';
import { prefersReducedMotion } from '../lib/reducedMotion';

type BandImage = { src: string; srcSet: string; y: string; alt: string; caption: string };

function Band({ b }: { b: BandImage }) {
  return (
    <figure className="band" style={{ ['--y' as string]: b.y }}>
      <img className="par" src={b.src} srcSet={b.srcSet} sizes="100vw" alt={b.alt} width={1920} height={1280} loading="lazy" decoding="async" />
      <figcaption>{b.caption}</figcaption>
    </figure>
  );
}

function FileCard({ id, kind, label, data }: { id: string; kind: 'gaps' | 'good'; label: string; data: typeof brand.calm.gaps }) {
  return (
    <div className={`file ${kind}`} id={id}>
      {kind === 'good' && (
        <svg className="edge" aria-hidden="true">
          <rect x="0.6" y="0.6" rx="24" ry="24" pathLength={100} strokeDasharray="100" strokeDashoffset="0" />
        </svg>
      )}
      <span className="file-label">{label}</span>
      <p className="file-tag">{data.tag}</p>
      <p className="file-sub">{data.sub}</p>
      <ul>
        {data.rows.map(([rowLabel, value, ok]) => (
          <li key={rowLabel}>
            {rowLabel}{' '}
            <b className={ok ? undefined : 'gap'}>
              {ok ? <Tick /> : <GapMark />}
              {value}
            </b>
          </li>
        ))}
      </ul>
      <p className="file-line">{data.line}</p>
    </div>
  );
}

export function Landing({ onOpenAudit }: { onOpenAudit: () => void }) {
  const root = useRef<HTMLElement>(null);
  const road = useRef<HTMLCanvasElement>(null);
  const stars = useRef<HTMLCanvasElement>(null);
  const [endShown, setEndShown] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (prefersReducedMotion() || !root.current) return;
    // The motion layer (three.js + GSAP) loads after first paint; the page reads in full without it.
    let cancelled = false;
    let cleanups: (() => void)[] = [];
    import('../lib/motion')
      .then(({ initRoad, initScrollMotion, initStars }) => {
        if (cancelled || !root.current) return;
        cleanups = [
          road.current ? initRoad(road.current) : () => {},
          stars.current ? initStars(stars.current) : () => {},
          initScrollMotion(root.current, () => setEndShown(true)),
        ];
      })
      .catch(() => setEndShown(true));
    return () => {
      cancelled = true;
      cleanups.forEach((c) => c());
    };
  }, []);

  const { hero, letter, calm, week, benefits, close, end, areas, ctaBand } = brand;
  const strip = [...brand.strip, ...brand.strip];

  return (
    <main ref={root} id="main">
      {/* 1. hero */}
      <section className="hero" aria-labelledby="h1">
        <div className="photo">
          <img src={hero.image.src} srcSet={hero.image.srcSet} sizes="100vw" alt={hero.image.alt} width={1920} height={1275} fetchPriority="high" />
        </div>
        <canvas id="road" ref={road} aria-hidden="true" />
        <div className="hero-in wide">
          <div className="hero-copy">
            <p className="kicker pill">
              <span className="dot" aria-hidden="true" />
              {hero.kicker}
            </p>
            <h1 id="h1">
              {hero.headline.map((w, i) => (
                <span key={w}>
                  <span className={`w${i === hero.headline.length - 1 ? ' soft' : ''}`}>{w}</span>
                  {i < hero.headline.length - 1 ? ' ' : ''}
                </span>
              ))}
            </h1>
            <p className="lede">{hero.lede}</p>
            <div className="hero-cta">
              <button type="button" className="btn btn-lg breath" onClick={onOpenAudit}>
                {hero.cta} <span className="arr" aria-hidden="true">&rarr;</span>
              </button>
              <a className="ghost-link" href={`tel:${brand.phone.tel}`}>
                {hero.callPrefix} <b>{brand.phone.label}</b>
              </a>
            </div>
            <ul className="hero-stats" aria-label="What the check takes">
              <li>
                <b>{QUESTIONS.length}</b>
                <span>questions</span>
              </li>
              <li>
                <b>{DIMENSIONS.length}</b>
                <span>areas scored</span>
              </li>
              <li>
                <b>1 min</b>
                <span>to your result</span>
              </li>
            </ul>
          </div>
        </div>
        <p className="photo-note">{hero.caption}</p>
      </section>

      <div className="strip" aria-hidden="true">
        <div className="track">
          {strip.map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </div>
      </div>

      {/* 2. what we check */}
      <section className="sec" id="what-we-check" aria-labelledby="areas-h">
        <div className="wide">
          <div className="sec-head">
            <p className="kicker">
              <span className="dot" aria-hidden="true" />
              {areas.kicker}
            </p>
            <h2 id="areas-h" className="reveal">
              {areas.heading}
            </h2>
            <p className="reveal">{areas.body}</p>
          </div>
          <div className="area-grid">
            {DIMENSIONS.map((d) => (
              <article key={d.id} className="area-card reveal">
                <div className="ac-top">
                  <span className="ac-ico" aria-hidden="true">
                    {AREA_ICONS[d.id]}
                  </span>
                  <span className="ac-code">{d.code}</span>
                </div>
                <h3>{d.name}</h3>
                <ul>
                  {QUESTIONS.filter((q) => q.dimension === d.id).map((q) => (
                    <li key={q.id}>{q.title}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. the letter */}
      <section className="sec" aria-labelledby="letter-h" style={{ paddingTop: 0 }}>
        <div className="wide letter-grid">
          <div>
            <p className="kicker" id="letter-h">
              <span className="dot" aria-hidden="true" />
              {letter.kicker}
            </p>
            <div className="say reveal">
              {letter.say.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <p className="loss reveal">{letter.loss}</p>
          </div>
          <div className="stage">
            <div className={`paper${prefersReducedMotion() ? ' on' : ''}`} id="paper" role="img" aria-label={letter.paperAria}>
              <div className="ph">
                <span>{letter.paperHead}</span>
                <b aria-hidden="true" />
              </div>
              <h3>{letter.paperTitle}</h3>
              <div className="ln m" />
              <div className="ln" />
              <div className="ln s" />
              <div className="ask">
                {letter.paperAsk.map((a) => (
                  <div key={a}>
                    <i />
                    {a}
                  </div>
                ))}
              </div>
              <p className="foot">{letter.paperFoot}</p>
            </div>
          </div>
        </div>
      </section>

      <Band b={brand.bands.letter} />

      {/* 4. the calm way out: before and after */}
      <section className="sec" aria-labelledby="calm-h">
        <div className="wide">
          <div className="sec-head">
            <p className="kicker">
              <span className="dot" aria-hidden="true" />
              {calm.kicker}
            </p>
            <h2 id="calm-h" className="reveal">
              {calm.heading}
            </h2>
          </div>
          <p className="core reveal">
            {calm.coreLead}
            <em>{calm.coreEm}</em>
          </p>
          <div className="deck" id="deck">
            <FileCard id="fgaps" kind="gaps" label="Before" data={calm.gaps} />
            <FileCard id="fgood" kind="good" label="After" data={calm.good} />
          </div>
          <p className="made-up">{calm.madeUp}</p>
        </div>
      </section>

      <Band b={brand.bands.week} />

      {/* 5. how it works */}
      <section className="sec" id="how-it-works" aria-labelledby="week-h">
        <div className="wide">
          <div className="sec-head">
            <p className="kicker">
              <span className="dot" aria-hidden="true" />
              {week.kicker}
            </p>
            <h2 id="week-h" className="reveal">
              {week.heading}
            </h2>
          </div>
          <div className="steps" id="steps">
            <svg className="route" viewBox="0 0 1000 4" preserveAspectRatio="none" aria-hidden="true">
              <line className="base" x1="40" y1="2" x2="960" y2="2" />
              <line className="beam" id="beam" x1="40" y1="2" x2="960" y2="2" pathLength={100} strokeDasharray="100" strokeDashoffset="0" />
            </svg>
            {week.steps.map((s, i) => (
              <div className="step" key={s.title}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <div className="ico">{STEP_ICONS[i]}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. the closing call to action: benefits and the true scarcity, once */}
      <section className="sec" aria-labelledby="cta-h" style={{ paddingTop: 0 }}>
        <div className="wide">
          <div className="cta-band reveal">
            <img src={brand.bands.benefits.src} srcSet={brand.bands.benefits.srcSet} sizes="100vw" alt="" loading="lazy" decoding="async" />
            <div>
              <p className="kicker">
                <span className="dot" aria-hidden="true" />
                {ctaBand.kicker}
              </p>
              <h2 id="cta-h">{ctaBand.heading}</h2>
              <p className="cta-body">{ctaBand.body}</p>
              <button type="button" className="btn btn-lg" onClick={onOpenAudit}>
                {hero.cta} <span className="arr" aria-hidden="true">&rarr;</span>
              </button>
            </div>
            <div>
              <p className="benefits">
                {benefits.body}
                <strong>{benefits.strong}</strong>
              </p>
              <p className="six">{close.six}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. contact */}
      <section className={`end${endShown ? ' shown' : ''}`} id="contact" aria-labelledby="peace">
        <div className="photo">
          <img src={end.image.src} srcSet={end.image.srcSet} sizes="100vw" alt={end.image.alt} width={1920} height={1272} loading="lazy" decoding="async" />
        </div>
        <canvas id="stars" ref={stars} aria-hidden="true" />
        <div className="end-in">
          <img className="end-logo" src={brand.logo.srcOnDark} alt={brand.logo.alt} width={brand.logo.width} height={brand.logo.height} loading="lazy" />
          <p className="peace" id="peace">
            {end.peace}
          </p>
          <ul className="contacts">
            <ContactRow row={0} href={`https://wa.me/${brand.whatsapp.number}`} external big={brand.whatsapp.label} small={end.whatsappSmall} />
            <ContactRow row={1} href={`tel:${brand.phone.tel}`} big={brand.phone.label} small={end.callSmall} />
            <ContactRow row={2} href={brand.website.url} external big={brand.website.label} small={end.webSmall} web />
          </ul>
        </div>
      </section>
    </main>
  );
}

function ContactRow({ row, href, big, small, external, web }: { row: number; href: string; big: string; small: string; external?: boolean; web?: boolean }) {
  const words = web ? [big] : big.split(' ');
  return (
    <li style={{ ['--row' as string]: row }}>
      <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        <span className={`tier-big${web ? ' web' : ''}`}>
          {words.map((w, i) => (
            <span key={i}>
              <span className="w" style={{ ['--i' as string]: i }}>
                {w}
              </span>
              {i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </span>
        <span className="tier-small">{small}</span>
      </a>
    </li>
  );
}

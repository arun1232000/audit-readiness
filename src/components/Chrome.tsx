/** Page chrome: the ground, the site header with the logo, the invitation, the footer. */
import { useEffect, useState } from 'react';
import { brand } from '../config/brand';
import { SHIELD_ICON } from './icons';
import { asset } from '../lib/paths';

export function Ground() {
  return (
    <div className="ground" aria-hidden="true">
      <div className="grid" />
      <div className="glow g1" />
      <div className="glow g2" />
      <div className="grain" />
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return <img className={className} src={brand.logo.srcOnDark} alt={brand.logo.alt} width={brand.logo.width} height={brand.logo.height} />;
}

/** Sticky header: transparent over the hero, solid once the page scrolls. */
export function SiteHeader({ onOpenAudit, home = false }: { onOpenAudit: () => void; home?: boolean }) {
  const [scrolled, setScrolled] = useState(!home);
  useEffect(() => {
    if (!home) return;
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [home]);

  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
      <div className="sh-inner wide">
        <a className="sh-logo" href={asset('')} aria-label={`${brand.name}, home`}>
          <Logo />
        </a>
        <nav className="sh-nav" aria-label="Main">
          {brand.nav.links.map((l) => (
            <a key={l.href} href={home ? l.href : asset(l.href)}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="sh-actions">
          <a className="btn btn-sm btn-ghost sh-call" href={`tel:${brand.phone.tel}`}>
            {brand.nav.call}
            <b>{brand.phone.label}</b>
          </a>
          <button type="button" className="btn btn-sm" onClick={onOpenAudit}>
            {brand.nav.start}
          </button>
        </div>
      </div>
    </header>
  );
}

export function Invite({
  hidden,
  on,
  returning,
  onGo,
  onLater,
  onRetake,
}: {
  hidden: boolean;
  on: boolean;
  returning: boolean;
  onGo: () => void;
  onLater: () => void;
  onRetake: () => void;
}) {
  const c = brand.invite;
  return (
    <aside className={`invite${on ? ' on' : ''}`} aria-label="The Audit" hidden={hidden}>
      <button className="invite-x" type="button" aria-label="Later" onClick={onLater}>
        &times;
      </button>
      <div className="invite-ico" aria-hidden="true">
        {SHIELD_ICON}
      </div>
      <p className="invite-k">{returning ? c.returningKicker : c.kicker}</p>
      <p className="invite-t">{returning ? c.returningTitle : c.title}</p>
      {!returning && <p className="invite-s">{c.sub}</p>}
      <button className="btn invite-go" type="button" onClick={onGo}>
        {returning ? c.returningGo : c.go} <span className="arr" aria-hidden="true">&rarr;</span>
      </button>
      {returning && (
        <button type="button" className="invite-alt" onClick={onRetake}>
          {c.returningAlt}
        </button>
      )}
    </aside>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wide">
        <div className="sf-grid">
          <div className="sf-brand">
            <Logo className="sf-logo" />
            <p className="sf-about">{brand.meta.description}</p>
          </div>
          <div className="sf-col">
            <h4>Contact</h4>
            <ul>
              <li>
                <a href={`https://wa.me/${brand.whatsapp.number}`} target="_blank" rel="noopener noreferrer">
                  <span>WhatsApp</span>
                  {brand.whatsapp.label}
                </a>
              </li>
              <li>
                <a href={`tel:${brand.phone.tel}`}>
                  <span>Calls</span>
                  {brand.phone.label}
                </a>
              </li>
              <li>
                <a href={brand.website.url} target="_blank" rel="noopener noreferrer">
                  <span>Web</span>
                  {brand.website.label}
                </a>
              </li>
            </ul>
          </div>
          <div className="sf-col">
            <h4>The Audit</h4>
            <ul>
              {brand.nav.links.map((l) => (
                <li key={l.href}>
                  <a href={asset(l.href)}>{l.label}</a>
                </li>
              ))}
              <li>
                <a href={brand.privacyPolicyPath}>Privacy policy</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="sf-legal">
          <p>{brand.legal}</p>
          <p>
            Photos from Wikimedia Commons, each under a free licence:{' '}
            {brand.credits.map((c, i) => (
              <span key={c.href}>
                <a href={c.href}>{c.text}</a> by {c.by}, <a href={c.licHref}>{c.lic}</a>
                {i < brand.credits.length - 1 ? '; ' : '. '}
              </span>
            ))}
            Photos resized and compressed; otherwise unchanged. Motion by GSAP and three.js (MIT).
          </p>
        </div>
      </div>
    </footer>
  );
}

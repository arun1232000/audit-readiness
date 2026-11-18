import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || '';

let loader: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('turnstile load failed'));
    document.head.appendChild(s);
  });
  return loader;
}

/** Cloudflare Turnstile widget; renders nothing unless VITE_TURNSTILE_SITE_KEY is set. */
export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !ref.current) return;
    let id: string | undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        id = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (t: string) => cb.current(t),
          'expired-callback': () => cb.current(null),
          'error-callback': () => cb.current(null),
        });
      })
      .catch(() => cb.current(null));
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}

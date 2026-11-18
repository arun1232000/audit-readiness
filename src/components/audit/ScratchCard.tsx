import { useEffect, useRef, useState } from 'react';
import { ASSESSMENT_COPY } from '../../data/assessment';

/** The scratch card: foil drawn on a canvas, scraped with a finger or the mouse. What is under it is always true. */
export function ScratchCard({ subtitle, onDone }: { subtitle: string; onDone?: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const doneCb = useRef(onDone);
  doneCb.current = onDone;

  useEffect(() => {
    const c = canvas.current;
    const boxEl = box.current;
    if (!c || !boxEl) return;
    const ctx = c.getContext('2d');
    if (!ctx) {
      setDone(true);
      return;
    }
    const w = boxEl.clientWidth || 600;
    const h = boxEl.clientHeight || 150;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr;
    c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#d9c47a');
    g.addColorStop(0.5, '#f3e3a2');
    g.addColorStop(1, '#c9ad5c');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.25).toFixed(2)})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    ctx.fillStyle = 'rgba(35,31,32,.78)';
    ctx.font = "700 18px 'Inter Variable', Inter, Arial, sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(ASSESSMENT_COPY.scratchFoilTitle, w / 2, h / 2 - 4);
    ctx.font = "400 13px 'Inter Variable', Inter, Arial, sans-serif";
    ctx.fillText(ASSESSMENT_COPY.scratchFoilSub, w / 2, h / 2 + 18);
    ctx.globalCompositeOperation = 'destination-out';

    let down = false;
    let last: { x: number; y: number } | null = null;
    const at = (e: PointerEvent) => {
      const b = c.getBoundingClientRect();
      return { x: e.clientX - b.left, y: e.clientY - b.top };
    };
    const scrape = (p: { x: number; y: number }) => {
      ctx.lineWidth = 38;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (last) {
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        ctx.arc(p.x, p.y, 19, 0, 6.283);
        ctx.fill();
      }
      last = p;
    };
    const cleared = () => {
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let clear = 0;
      let n = 0;
      for (let i = 3; i < d.length; i += 64) {
        n++;
        if (d[i]! < 40) clear++;
      }
      return n ? clear / n : 1;
    };
    c.onpointerdown = (e) => {
      down = true;
      last = null;
      c.setPointerCapture(e.pointerId);
      scrape(at(e));
    };
    c.onpointermove = (e) => {
      if (down) scrape(at(e));
    };
    c.onpointerup = c.onpointercancel = () => {
      down = false;
      last = null;
      if (cleared() > 0.45) setDone(true);
    };
    return () => {
      c.onpointerdown = c.onpointermove = c.onpointerup = c.onpointercancel = null;
    };
  }, []);

  useEffect(() => {
    if (done) doneCb.current?.();
  }, [done]);

  return (
    <div className="scratch">
      <p className="scratch-label">{ASSESSMENT_COPY.scratchLabel}</p>
      <div className={`scratch-box${done ? ' done' : ''}`} ref={box}>
        <div className="prize" aria-live="polite">
          <p className="prize-k">{ASSESSMENT_COPY.prizeKicker}</p>
          <p className="prize-t">{ASSESSMENT_COPY.prizeTitle}</p>
          <p className="prize-s">{subtitle}</p>
        </div>
        <canvas ref={canvas} id="foil" className={done ? 'gone' : undefined} aria-hidden="true" />
        <button className={`reveal-btn${done ? ' gone' : ''}`} type="button" onClick={() => setDone(true)}>
          {ASSESSMENT_COPY.scratchRevealBtn}
        </button>
      </div>
    </div>
  );
}

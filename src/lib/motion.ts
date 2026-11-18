/**
 * The motion layer, ported from "The Audit" v2 motion.js. Calm by design: one breath of ten seconds, nothing
 * races, and everything is skipped when the visitor asks for reduced motion. Each initialiser returns a cleanup.
 *  1. The road of light: a three.js field of warm points on the highway in the hero photo.
 *  2. Scroll motion (GSAP ScrollTrigger): headline rise, reveals, the letter unfolding, parallax bands,
 *     the two driver files, the route through the three habits.
 *  3. Stars over the northern lights on the end card.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';

export { prefersReducedMotion } from './reducedMotion';

type Cleanup = () => void;
const noop: Cleanup = () => {};

/** Skip WebGL on data-saver connections and very low-power devices; the photo carries the hero alone. */
function lowPower(): boolean {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return !!nav.connection?.saveData || (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2;
}

export function initRoad(canvas: HTMLCanvasElement): Cleanup {
  const hero = canvas.parentElement;
  if (!hero || lowPower()) return noop;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch {
    return noop; // no WebGL: the photo stands alone
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1 : 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400);
  camera.position.set(0, 2.2, 0);
  camera.lookAt(0, 1.2, -100);

  const N = window.innerWidth < 700 ? 700 : 1800; // lighter: about 30-45% fewer points than v2
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  const tint = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const lane = Math.random() < 0.7; // most points hug the road, some lie on the land beside it
    pos[i * 3] = lane ? (Math.random() - 0.5) * 9 : (Math.random() - 0.5) * 90;
    pos[i * 3 + 1] = lane ? 0.02 : Math.random() * 0.4;
    pos[i * 3 + 2] = -4 - Math.random() * 190;
    seed[i] = Math.random();
    tint[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('tint', new THREE.BufferAttribute(tint, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScan: { value: -10 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float seed; attribute float tint; uniform float uTime; uniform float uScan; uniform float uPx;
      varying float vA; varying float vT;
      void main(){
        vec3 p = position;
        float speed = 1.6 + seed * 1.4;
        p.z = -4.0 - mod(-(p.z + 4.0) + uTime * speed, 190.0);
        p.x += sin(uTime * 0.15 + seed * 6.28) * 0.15;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float depth = -mv.z;
        float breath = 0.55 + 0.45 * sin(uTime * 0.628 + seed * 1.2);
        float scan = exp(-pow((depth - uScan) / 6.0, 2.0)) * 1.6;
        float far = smoothstep(190.0, 120.0, depth) * smoothstep(3.0, 14.0, depth);
        vA = (0.22 + 0.5 * breath + scan) * far;
        vT = tint;
        gl_PointSize = uPx * (1.4 + seed * 1.8 + scan * 2.0) * (26.0 / depth + 0.55);
      }`,
    fragmentShader: `
      varying float vA; varying float vT;
      void main(){
        vec2 c = gl_PointCoord - 0.5; float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        vec3 yellow = vec3(0.965, 0.796, 0.082); vec3 dawn = vec3(0.77, 0.65, 0.45); vec3 white = vec3(1.0, 0.97, 0.9);
        vec3 col = vT < 0.55 ? yellow : (vT < 0.85 ? dawn : white);
        gl_FragColor = vec4(col, a * vA);
      }`,
  });
  scene.add(new THREE.Points(geo, mat));

  const size = () => {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // put the vanishing point over the road in the photo (12% right of centre, photo 1920x1275 covering at 1.06)
    camera.setViewOffset(w, h, -0.127 * Math.max(w, (h * 1920) / 1275), -h * 0.06, w, h);
    camera.updateProjectionMatrix();
  };
  size();
  window.addEventListener('resize', size);

  let visible = true;
  let mx = 0;
  let my = 0;
  const t0 = performance.now();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => (visible = !!es[0]?.isIntersecting)) : null;
  io?.observe(hero);
  const onMove = (e: PointerEvent) => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  let raf = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const t = (now - t0) / 1000;
    mat.uniforms.uTime!.value = t;
    mat.uniforms.uScan!.value = t < 8.5 ? 4 + (t / 8) * 180 : -50; // one slow scan at load, then it rests
    camera.position.x += (mx * 0.8 - camera.position.x) * 0.02;
    camera.position.y += (2.2 - my * 0.4 - camera.position.y) * 0.02;
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', size);
    window.removeEventListener('pointermove', onMove);
    io?.disconnect();
    geo.dispose();
    mat.dispose();
    renderer.dispose();
  };
}

export function initStars(canvas: HTMLCanvasElement): Cleanup {
  const ctx = canvas.getContext('2d');
  if (!ctx) return noop;
  let pts: { x: number; y: number; r: number; s: number; v: number }[] = [];
  let on = false;
  let W = 0;
  let H = 0;
  const size = () => {
    const r = Math.min(window.devicePixelRatio || 1, 1.5);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * r;
    canvas.height = H * r;
    ctx.setTransform(r, 0, 0, r, 0, 0);
    pts = [];
    const n = Math.round((W * H) / 9000);
    for (let i = 0; i < n; i++)
      pts.push({ x: Math.random() * W, y: Math.random() * H * 0.62, r: Math.random() * 1.2 + 0.2, s: Math.random() * 6.28, v: 0.02 + Math.random() * 0.05 });
  };
  size();
  window.addEventListener('resize', size);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => (on = !!es[0]?.isIntersecting)) : null;
  io?.observe(canvas);
  let raf = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!on) return;
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      p.x += p.v;
      if (p.x > W) p.x = 0;
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.628 + p.s));
      ctx.fillStyle = `rgba(255,246,225,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fill();
    }
  };
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', size);
    io?.disconnect();
  };
}

/** Scroll motion for the landing page. Scoped to `root`; reverting the context undoes every tween and trigger. */
export function initScrollMotion(root: HTMLElement, onEndShown: () => void): Cleanup {
  gsap.registerPlugin(ScrollTrigger);
  const ease = 'power2.out';
  const D = 0.8; // v3: shorter than v2's 1.1s
  const mm = gsap.matchMedia();
  const ctx = gsap.context(() => {
    gsap.from('.hero h1 .w', { y: 30, opacity: 0, duration: D, ease: 'power3.out', stagger: 0.09, delay: 0.1 });
    gsap.from(['.hero .kicker', '.hero .lede', '.hero .hero-cta', '.hero .hero-stats', '.hero .hero-card'], { y: 16, opacity: 0, duration: D, ease, stagger: 0.08, delay: 0.35 });

    // Scroll-scrubbed effects only where there is room and power for them.
    mm.add('(min-width: 900px)', () => {
      gsap.to('.hero .photo img', { yPercent: 8, scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.utils.toArray<HTMLElement>('.band .par').forEach((img) => {
        gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });

    gsap.set('.reveal', { opacity: 0 });
    ScrollTrigger.batch('.reveal', {
      start: 'top 86%',
      onEnter: (els) => {
        gsap.fromTo(els, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: D, ease, stagger: 0.1, overwrite: true });
      },
    });

    const paper = root.querySelector<HTMLElement>('#paper');
    if (paper) {
      gsap.fromTo(paper, { rotateX: 24, y: 40, opacity: 0.2 }, { rotateX: 0, y: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: paper, start: 'top 92%', end: 'top 45%', scrub: 1 } });
      ScrollTrigger.create({ trigger: paper, start: 'top 55%', once: true, onEnter: () => paper.classList.add('on') });
    }

    const deck = root.querySelector('#deck');
    if (deck) {
      const tl = gsap.timeline({ scrollTrigger: { trigger: deck, start: 'top 80%', end: 'top 30%', scrub: 1 } });
      tl.fromTo('#fgaps', { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'none' }, 0)
        .fromTo('#fgood', { opacity: 0, y: 70 }, { opacity: 1, y: 0, ease: 'none' }, 0.1)
        .to('#fgaps', { opacity: 0.62, rotate: -1.2, x: -6, ease: 'none' }, 0.6)
        .to('#fgood', { y: -10, ease: 'none' }, 0.6)
        .fromTo('#fgood .edge rect', { attr: { 'stroke-dashoffset': 100 } }, { attr: { 'stroke-dashoffset': 0 }, ease: 'none' }, 0.45);
      gsap.set('#fgood .tick path', { strokeDashoffset: 24 });
      ScrollTrigger.create({
        trigger: '#fgood',
        start: 'top 60%',
        once: true,
        onEnter: () => {
          gsap.to('#fgood .tick path', { strokeDashoffset: 0, duration: 0.9, ease: 'power1.inOut', stagger: 0.28 });
        },
      });
    }

    const steps = root.querySelector('#steps');
    if (steps) {
      gsap.fromTo('#beam', { attr: { 'stroke-dashoffset': 100 } }, { attr: { 'stroke-dashoffset': 0 }, ease: 'none', scrollTrigger: { trigger: steps, start: 'top 75%', end: 'bottom 60%', scrub: 1 } });
      gsap.fromTo('#steps .step', { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: D, ease, stagger: 0.18, scrollTrigger: { trigger: steps, start: 'top 78%' } });
    }

    const end = root.querySelector('#contact');
    if (end) ScrollTrigger.create({ trigger: end, start: 'top 60%', once: true, onEnter: onEndShown });
  }, root);

  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh);
  return () => {
    window.removeEventListener('load', refresh);
    mm.revert();
    ctx.revert();
  };
}

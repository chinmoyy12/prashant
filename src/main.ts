import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import './styles.css';
import { esc, imgTag, loadContent, objectPosition, resolveUrl, type PhotoItem } from './content';
import { initSwirl } from './swirl';
import type { Ribbon } from './gallery3d';
import type { Hero3D } from './hero3d';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

/* ---------- helpers ---------- */
const $ = <T extends Element = HTMLElement>(s: string, c: ParentNode = document): T => {
  const el = c.querySelector<T>(s);
  if (!el) throw new Error(`Missing element: ${s}`);
  return el;
};
const $$ = <T extends Element = HTMLElement>(s: string, c: ParentNode = document): T[] => [...c.querySelectorAll<T>(s)];
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = (n: number) => String(n).padStart(2, '0');
const visibility = (el: Element, on: () => void, off: () => void) =>
  new IntersectionObserver(([en]) => (en.isIntersecting ? on() : off()), { rootMargin: '100px' }).observe(el);

/* =========================================================
   Live content (published from the admin panel)
   ========================================================= */
const content = await loadContent();
const COLLECTIONS = content.collections;
const FRAMES = content.frames;

type Shot = { src: string; preview: string; title: string };
const toShot = (it: PhotoItem): Shot => ({ src: resolveUrl(it.img.src), preview: resolveUrl(it.img.md), title: it.title });
const lightboxAttrs = (it: PhotoItem) => `data-lightbox="${resolveUrl(it.img.src)}" data-preview="${resolveUrl(it.img.md)}" data-title="${esc(it.title)}"`;

function renderContent() {
  const heroLead = document.getElementById('heroLead');
  if (heroLead) heroLead.textContent = content.text.heroLead;
  const aboutBody = document.getElementById('aboutBody');
  if (aboutBody) aboutBody.textContent = content.text.aboutBody;
  document.querySelectorAll<HTMLElement>('.jpanel__media').forEach((slot) => {
    const it = content.journey[slot.dataset.slot as keyof typeof content.journey];
    slot.outerHTML = it
      ? `<figure class="jpanel__photo" ${lightboxAttrs(it)}>${imgTag(it.img, it.title, '(max-width: 860px) 86vw, 32vw')}</figure>`
      : `<div class="jpanel__num" aria-hidden="true">${slot.dataset.num ?? ''}</div>`;
  });
  document.querySelectorAll<HTMLElement>('[data-featured]').forEach((fig) => {
    const it = content.featured[Number(fig.dataset.featured)];
    if (!it) { fig.remove(); return; }
    fig.setAttribute('data-lightbox', resolveUrl(it.img.src));
    fig.setAttribute('data-preview', resolveUrl(it.img.md));
    fig.setAttribute('data-title', it.title);
    fig.innerHTML = `${imgTag(it.img, it.title, fig.classList.contains('fcard--b') ? '(max-width: 760px) 70vw, 34vw' : '(max-width: 760px) 40vw, 16vw')}<figcaption>${esc(it.title)}</figcaption>`;
  });
}
renderContent();

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
$('#year').textContent = String(new Date().getFullYear());

/* =========================================================
   Smooth scroll (Lenis) synced with ScrollTrigger
   ========================================================= */
const lenis = new Lenis({ lerp: reduced ? 1 : 0.09, smoothWheel: !reduced, wheelMultiplier: 1 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();

// pinned sections live inside a .pin-spacer – scroll to that so we land on their start
const scrollTarget = (el: HTMLElement): HTMLElement =>
  el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;

function goTo(hash: string) {
  const el = document.querySelector<HTMLElement>(hash);
  if (!el) return;
  lenis.scrollTo(scrollTarget(el), { duration: 1.6, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
}

/* ---------- mobile menu ---------- */
const burger = $<HTMLButtonElement>('#burger');
const mmenu = $('#mmenu');
function closeMenu() {
  document.body.classList.remove('menu-open');
  burger.setAttribute('aria-expanded', 'false');
  mmenu.setAttribute('aria-hidden', 'true');
}
burger.addEventListener('click', () => {
  const open = !document.body.classList.contains('menu-open');
  document.body.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  mmenu.setAttribute('aria-hidden', String(!open));
});

$$<HTMLAnchorElement>('[data-scroll-to]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const hash = a.getAttribute('href');
    if (!hash || !hash.startsWith('#')) return;
    e.preventDefault();
    closeMenu();
    goTo(hash);
  }),
);

/* =========================================================
   Custom cursor
   ========================================================= */
const cursor = $('.cursor');
const cursorLabel = $('.cursor__label');
function setCursorLabel(text?: string) {
  if (!finePointer) return;
  cursorLabel.textContent = text ?? '';
  cursor.classList.toggle('has-label', !!text);
}
if (finePointer) {
  document.body.classList.add('has-cursor');
  const dot = $('.cursor__dot');
  const ring = $('.cursor__ring');
  const dx = gsap.quickSetter(dot, 'x', 'px');
  const dy = gsap.quickSetter(dot, 'y', 'px');
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  gsap.set([dot, ring], { x: -100, y: -100 });
  window.addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
  document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));
  document.addEventListener('pointerover', (e) => {
    const target = e.target as Element | null;
    if (!target?.closest) return;
    cursor.classList.toggle('is-hover', !!target.closest('a, button, .acc__head, .frames__list li'));
    if (target.closest('[data-lightbox], .frame-card')) setCursorLabel('VIEW');
    else if (!target.closest('#ribbon, #framesPin')) setCursorLabel('');
  });
}

/* =========================================================
   Film grain (generated noise tile, no extra request)
   ========================================================= */
(() => {
  const c = document.createElement('canvas'); c.width = c.height = 180;
  const g = c.getContext('2d'); if (!g) return;
  const img = g.createImageData(180, 180);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  const el = document.createElement('div'); el.className = 'grain'; el.setAttribute('aria-hidden', 'true');
  el.style.backgroundImage = `url(${c.toDataURL('image/png')})`;
  document.body.appendChild(el);
})();

/* ---------- magnetic buttons ---------- */
if (finePointer && !reduced) {
  $$('.btn, .pillbtn, .acc__cta, .nav__icons a').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - r.left - r.width / 2) * 0.35); my((e.clientY - r.top - r.height / 2) * 0.45);
    });
    el.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
}

/* =========================================================
   Preloader
   ========================================================= */
function buildLoaderPath(): { x: number; y: number } {
  const svg = $<SVGSVGElement>('.loader__svg');
  const word = $('.loader__word span');
  const sr = svg.getBoundingClientRect();
  const wr = word.getBoundingClientRect();
  const k = 1000 / sr.width; // viewBox is 1000 × 600, stage has the same aspect ratio
  const cx = 500, cy = 300;
  const halfW = Math.max(150, (wr.width * k) / 2);
  const rx = halfW + 70, ry = Math.max(150, halfW * 0.62);
  const end = { x: (wr.right - sr.left) * k + 16, y: (wr.bottom - sr.top) * k - wr.height * k * 0.2 };
  const pts: [number, number][] = [];
  const a0 = -1.1, a1 = a0 + Math.PI * 2 + 0.35, steps = 220;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    const wob = 1 + 0.06 * Math.sin(a * 5 + 1.3) + 0.035 * Math.sin(a * 9 + 0.4) + 0.02 * Math.sin(a * 14);
    pts.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]);
  }
  const f = pts[0];
  const n = (v: number) => v.toFixed(1);
  let d = `M ${n(f[0] - 30)} ${n(f[1] - 70)} Q ${n(f[0] - 6)} ${n(f[1] - 30)} ${n(f[0])} ${n(f[1])}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${n(pts[i][0])} ${n(pts[i][1])}`;
  const l = pts[pts.length - 1];
  d += ` Q ${n(l[0] - 20)} ${n((l[1] + end.y) / 2 + 40)} ${n(end.x)} ${n(end.y)}`;
  $('#loaderPath').setAttribute('d', d);
  return end;
}

function runLoader(): Promise<void> {
  return new Promise((resolve) => {
    const path = $<SVGPathElement>('#loaderPath');
    const dotEl = $<SVGCircleElement>('#loaderDot');
    const count = $('#loaderCount');
    const end = buildLoaderPath();
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    const prog = { p: 0 };
    gsap.timeline({ onComplete: () => resolve() })
      .from('.loader__word span', { opacity: 0, filter: 'blur(14px)', scale: 0.92, duration: reduced ? 0.2 : 1.1, ease: 'power3.out' })
      .to(prog, {
        p: 1, duration: reduced ? 0.3 : 2.4, ease: 'power2.inOut',
        onUpdate() {
          const l = len * prog.p;
          path.style.strokeDashoffset = String(len - l);
          const pt = path.getPointAtLength(l);
          dotEl.setAttribute('cx', String(pt.x));
          dotEl.setAttribute('cy', String(pt.y));
          count.textContent = String(Math.round(prog.p * 100)).padStart(3, '0');
        },
      }, '-=0.6')
      .add(() => { dotEl.setAttribute('cx', String(end.x)); dotEl.setAttribute('cy', String(end.y)); })
      .to(path, { opacity: 0, duration: 0.7, ease: 'power2.out' }, '+=0.15')
      .to(dotEl, { attr: { r: 7.5 }, duration: 0.25, yoyo: true, repeat: 1, ease: 'power1.inOut' }, '<')
      .to('.loader__stage', { scale: 0.94, opacity: 0, duration: 0.7, ease: 'power3.in' }, '+=0.2')
      .to('.loader__meta', { opacity: 0, duration: 0.4 }, '<')
      .to('#loader', { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' }, '-=0.25')
      .add(() => heroIntro(), '-=0.55');
  });
}

/* =========================================================
   Hero
   ========================================================= */
const portrait = $('.hero__portrait');
const heroEl = $('.hero');
gsap.set(portrait, { xPercent: -50, x: 0 });
gsap.set('.hero__word', { yPercent: 115 });
gsap.set('.hero__portrait img', { yPercent: 40, opacity: 0, filter: 'blur(16px) grayscale(1)' });
gsap.set(['.hero__left', '.hero__right', '.hero__scroll'], { opacity: 0, y: 20 });

// 3D portrait loads while the preloader runs; falls back to the flat cut-out
let hero3d: Hero3D | null = null;
const heroScatter = { intro: 1, scroll: 0 };
const applyScatter = () => hero3d?.setScatter(Math.max(heroScatter.intro, heroScatter.scroll));
const hero3dReady: Promise<void> = (async () => {
  try {
    const { initHero3D } = await import('./hero3d');
    hero3d = await initHero3D({
      canvas: $<HTMLCanvasElement>('#heroCanvas'),
      colorUrl: 'photos/prasant/hero.webp',
      depthUrl: 'photos/prasant/hero-depth.png',
      pointerArea: heroEl,
    });
  } catch (err) {
    console.warn('3D portrait unavailable, using the flat image.', err);
    hero3d = null;
  }
  if (!hero3d) { $('#heroCanvas').hidden = true; return; }
  const h = hero3d;
  heroEl.classList.add('has-3d');
  applyScatter();
  visibility(heroEl, () => h.start(), () => h.stop());
})();

function heroIntro() {
  if (hero3d) {
    gsap.to(heroScatter, { intro: 0, duration: reduced ? 0.01 : 2.6, ease: 'power3.inOut', onUpdate: applyScatter, delay: 0.15 });
  }
  gsap.timeline()
    .to('.hero__word', { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12 })
    .to('.hero__portrait img', { yPercent: 0, opacity: 1, filter: 'blur(0px) grayscale(1)', duration: 1.6, ease: 'expo.out' }, '-=1.05')
    .to(['.hero__left', '.hero__right', '.hero__scroll'], { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08 }, '-=1.1')
    .from('.hero__list li', { opacity: 0, x: 20, stagger: 0.06, duration: 0.7, ease: 'power3.out' }, '-=0.8');
}

if (finePointer && !reduced) {
  const tx = gsap.quickTo('.hero__title', 'x', { duration: 1.2, ease: 'power3' });
  const ty = gsap.quickTo('.hero__title', 'y', { duration: 1.2, ease: 'power3' });
  const px = gsap.quickTo(portrait, 'x', { duration: 1.4, ease: 'power3' });
  $('.hero').addEventListener('pointermove', (e) => {
    const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
    tx(nx * -26); ty(ny * -14); px(nx * 22);
  });
}
gsap.to('.hero__title', { yPercent: -18, opacity: 0.35, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
gsap.to(portrait, { yPercent: 12, scale: 1.04, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
// scrolling away dissolves the 3D figure into particles that drift up into the night sky
ScrollTrigger.create({
  trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
  onUpdate: (st) => { heroScatter.scroll = Math.min(1, st.progress * 1.25); applyScatter(); },
});
gsap.to('#heroCanvas', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

/* =========================================================
   About — swirl background + expanding card
   ========================================================= */
const swirl = initSwirl($<HTMLCanvasElement>('#swirlBg'), $<HTMLCanvasElement>('#swirlFx'));
const card = $('#aboutCard');
function cardInset(stage: 0 | 1 | 2): string {
  const cw = card.offsetWidth, ch = card.offsetHeight;
  let w: number, h: number, r: number;
  if (stage === 0) { w = Math.min(260, innerWidth * 0.46); h = Math.min(w * 1.32, ch * 0.62); r = 14; }
  else if (stage === 1) { w = Math.min(cw, Math.max(innerWidth * 0.46, 320)); h = Math.min(ch, innerHeight * 0.58); r = 16; }
  else { w = cw; h = ch; r = 18; }
  const ix = Math.max(0, (cw - w) / 2), iy = Math.max(0, (ch - h) / 2);
  return `inset(${iy.toFixed(1)}px ${ix.toFixed(1)}px ${iy.toFixed(1)}px ${ix.toFixed(1)}px round ${r}px)`;
}
gsap.set(card, { clipPath: () => cardInset(0) });
gsap.timeline({
  defaults: { ease: 'none' },
  scrollTrigger: { trigger: '.about', start: 'top top', end: '+=320%', scrub: 1, pin: true, invalidateOnRefresh: true, anticipatePin: 1 },
})
  .fromTo(card, { clipPath: () => cardInset(0) }, { clipPath: () => cardInset(1), duration: 1, ease: 'power1.inOut' }, 0)
  .to('.about__w--1', { x: () => -innerWidth * 0.3, duration: 1, ease: 'power1.inOut' }, 0)
  .to('.about__w--2', { x: () => innerWidth * 0.3, duration: 1, ease: 'power1.inOut' }, 0)
  .to(card, { clipPath: () => cardInset(2), duration: 1, ease: 'power2.inOut' }, 1)
  .to('.about__w', { opacity: 0, filter: 'blur(10px)', duration: 0.6 }, 1)
  .to('.about__shade', { opacity: 0.7, duration: 1 }, 1)
  .fromTo('.about__media img', { scale: 1.25 }, { scale: 1.02, duration: 2 }, 0)
  .fromTo('.about__content > *', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.15, ease: 'power2.out' }, 2)
  .to({}, { duration: 0.5 });
gsap.fromTo('.about__title', { yPercent: 60 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'top top', scrub: true } });
gsap.fromTo('#swirlBg, #swirlFx', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'top top', scrub: true } });

visibility($('.about__pin'), () => swirl.start(), () => swirl.stop());

/* =========================================================
   Journey — horizontal scroll with glitch titles
   ========================================================= */
const track = $('#journeyTrack');
const panels = $$('.jpanel', track);
const tabs = $$('#journeyTabs span');
const crumb = $('#journeyCrumb');
const bar = $('#journeyBar');
const dist = () => {
  // measure the real content edge (ghost text overflows and would inflate scrollWidth)
  const last = panels[panels.length - 1];
  const padR = parseFloat(getComputedStyle(track).paddingRight) || 0;
  return Math.max(0, last.offsetLeft + last.offsetWidth + padR - innerWidth);
};
const hz = gsap.to(track, {
  x: () => -dist(), ease: 'none',
  scrollTrigger: {
    trigger: '.journey', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
    onUpdate: (s) => gsap.set(bar, { scaleX: s.progress }),
  },
});
function setTab(i: number, label?: string) {
  tabs.forEach((t, k) => t.classList.toggle('is-active', k === i));
  if (label && crumb.textContent !== label) {
    gsap.fromTo(crumb, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4 });
    crumb.textContent = label;
  }
}
panels.forEach((panel, idx) => {
  const title = $('.jpanel__title', panel);
  const ghost = $('.jpanel__ghost', panel);
  const photo = panel.querySelector<HTMLElement>('.jpanel__photo');
  const inPanel = { trigger: panel, containerAnimation: hz, start: 'left right', end: 'right left', scrub: true };
  if (idx === 0) {
    gsap.fromTo(title, { '--split': 1 }, { '--split': 0, ease: 'none', scrollTrigger: { trigger: '.journey', start: 'top 85%', end: 'top 10%', scrub: true } });
    gsap.fromTo(ghost, { xPercent: 0 }, { xPercent: -30, ease: 'none', scrollTrigger: { ...inPanel, start: 'left left' } });
    return;
  }
  gsap.timeline({ scrollTrigger: inPanel })
    .fromTo(title, { '--split': 1 }, { '--split': 0, ease: 'none', duration: 0.42 })
    .to(title, { '--split': 0, duration: 0.33 })
    .to(title, { '--split': 1, ease: 'none', duration: 0.25 });
  gsap.fromTo(ghost, { xPercent: 18 }, { xPercent: -28, ease: 'none', scrollTrigger: inPanel });
  const num = panel.querySelector<HTMLElement>('.jpanel__num');
  if (num) gsap.fromTo(num, { xPercent: 30, opacity: 0.2 }, { xPercent: -30, opacity: 1, ease: 'none', scrollTrigger: inPanel });
  if (photo) {
    gsap.fromTo(photo, { clipPath: 'inset(12% 12% 12% 12% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', ease: 'none', scrollTrigger: { ...inPanel, end: 'center center' } });
    if (innerWidth > 860) gsap.fromTo(photo, { rotateY: -32, transformPerspective: 900 }, { rotateY: 14, ease: 'none', scrollTrigger: inPanel });
    gsap.fromTo($('img', photo), { scale: 1.3 }, { scale: 1.05, ease: 'none', scrollTrigger: inPanel });
  }
  gsap.from($$('.jpanel__desc, .jpanel__stats, .jpanel__range', panel), {
    opacity: 0, y: 26, stagger: 0.1, ease: 'power2.out',
    scrollTrigger: { trigger: panel, containerAnimation: hz, start: 'left 85%', end: 'left 45%', scrub: true },
  });
  ScrollTrigger.create({
    trigger: panel, containerAnimation: hz, start: 'left 55%', end: 'right 55%',
    onToggle: (s) => { if (s.isActive) setTab(Number(panel.dataset.tab), panel.dataset.crumb); },
  });
});
ScrollTrigger.create({ trigger: panels[1], containerAnimation: hz, start: 'left 55%', onLeaveBack: () => setTab(-1, 'ORIGIN & FOUNDATIONS') });

/* =========================================================
   Featured — cards converge
   ========================================================= */
gsap.timeline({ scrollTrigger: { trigger: '.featured', start: 'top top', end: '+=160%', scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true } })
  .fromTo('.fcard--a', { x: () => -innerWidth * 0.42, y: () => innerHeight * 0.32, rotate: -14, scale: 0.6, filter: 'blur(10px)', opacity: 0 },
    { x: () => -innerWidth * 0.3, y: () => innerHeight * 0.1, rotate: 0, scale: 1, filter: 'blur(0px)', opacity: 1, ease: 'power2.out' }, 0)
  .fromTo('.fcard--b', { y: () => innerHeight * 0.55, scale: 0.55, filter: 'blur(12px)', opacity: 0 },
    { y: 0, scale: 1, filter: 'blur(0px)', opacity: 1, ease: 'power2.out' }, 0.1)
  .fromTo('.fcard--c', { x: () => innerWidth * 0.42, y: () => -innerHeight * 0.3, rotate: 12, scale: 0.6, filter: 'blur(10px)', opacity: 0 },
    { x: () => innerWidth * 0.3, y: () => innerHeight * 0.02, rotate: 0, scale: 1, filter: 'blur(0px)', opacity: 1, ease: 'power2.out' }, 0.05)
  .fromTo('.featured__title', { opacity: 0, letterSpacing: '0.2em', filter: 'blur(8px)' }, { opacity: 1, letterSpacing: '-0.03em', filter: 'blur(0px)', ease: 'power2.out' }, 0)
  .fromTo('.featured__sub', { opacity: 0 }, { opacity: 1 }, 0.4)
  .to('.fcard--a', { x: () => -innerWidth * 0.24, y: 0, duration: 0.6 }, 1.1)
  .to('.fcard--c', { x: () => innerWidth * 0.24, y: 0, duration: 0.6 }, 1.1)
  .to('.fcard--b', { scale: 1.08, duration: 0.6 }, 1.1)
  .to('.featured__title, .featured__sub', { opacity: 0, y: -30, duration: 0.5 }, 1.2);

/* =========================================================
   Collections — WebGL ribbon (lazy-loaded Three.js chunk)
   ========================================================= */
const ribbonName = $('#ribbonName'), ribbonType = $('#ribbonType'), ribbonIndex = $('#ribbonIndex');
function setRibbonCaption(i: number) {
  const item = COLLECTIONS[i];
  ribbonName.textContent = item.title;
  ribbonType.textContent = item.type ?? '';
  ribbonIndex.textContent = `${pad(i + 1)} / ${pad(COLLECTIONS.length)}`;
  gsap.fromTo([ribbonName, ribbonType], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out', overwrite: true });
}
function buildRibbonFallback() {
  const fb = $('#ribbonFallback');
  fb.innerHTML = COLLECTIONS.map((c) => `<figure ${lightboxAttrs(c)}>${imgTag(c.img, c.title, '(max-width: 600px) 70vw, 420px')}</figure>`).join('');
  fb.hidden = false;
  $<HTMLCanvasElement>('#ribbon').hidden = true;
  setRibbonCaption(0);
  $('.collections__hint').textContent = 'SWIPE · CLICK TO VIEW';
}
let ribbon: Ribbon | null = null;
const RIBBON_SPAN = 0.92;
const ribbonST = ScrollTrigger.create({
  trigger: '.collections', start: 'top top', end: '+=340%', pin: true, anticipatePin: 1,
  onUpdate: (s) => ribbon?.setScroll(s.progress * ribbon.total * RIBBON_SPAN),
});
async function setupRibbon() {
  if (location.protocol === 'file:') { buildRibbonFallback(); return; } // WebGL textures need http(s)
  try {
    const { initRibbon } = await import('./gallery3d');
    ribbon = initRibbon({
      canvas: $<HTMLCanvasElement>('#ribbon'),
      items: COLLECTIONS,
      onActive: setRibbonCaption,
      onOpen: (i) => openLightbox(COLLECTIONS.map(toShot), i),
      onHover: (over) => setCursorLabel(over ? 'VIEW' : 'DRAG'),
    });
  } catch (err) {
    console.warn('WebGL gallery unavailable, using fallback.', err);
    ribbon = null;
  }
  if (!ribbon) { buildRibbonFallback(); return; }
  const r = ribbon;
  r.setScroll(ribbonST.progress * r.total * RIBBON_SPAN);
  // start downloading textures once the gallery is ~1.5 screens away
  new IntersectionObserver(([e]) => { if (e.isIntersecting) r.loadTextures(); }, { rootMargin: '150% 0px' }).observe($('.collections__pin'));
  visibility($('.collections__pin'), () => r.start(), () => r.stop());
  const canvas = $('#ribbon');
  canvas.addEventListener('pointerenter', () => setCursorLabel('DRAG'));
  canvas.addEventListener('pointerleave', () => setCursorLabel(''));
}
void setupRibbon();
gsap.from('.collections__label', { yPercent: 100, opacity: 0, scrollTrigger: { trigger: '.collections', start: 'top 70%', end: 'top top', scrub: true } });

/* =========================================================
   Frames '26 — 3D ring
   ========================================================= */
const ring = $('#framesRing');
const list = $('#framesList');
const N = FRAMES.length;
const STEP = 360 / N;
ring.innerHTML = FRAMES.map((f, i) => `<div class="frame-card" data-i="${i}">${imgTag(f.img, f.title, '(max-width: 760px) 50vw, 240px', ' draggable="false"')}<span>${esc(f.title)}</span></div>`).join('');
list.innerHTML = FRAMES.map((f, i) => `<li data-i="${i}">${esc(f.title)}</li>`).join('');
void objectPosition;
const cards = $$('.frame-card', ring);
const listItems = $$('li', list);
const ringState = { tilt: 62, spin: 0, scale: 0.82, R: 200 };
const framesActive = $('#framesActive');
let activeFrame = -1;

function renderRing() {
  const { tilt, spin, scale, R } = ringState;
  ring.style.transform = `translateZ(${-R * 0.35}px) scale(${scale}) rotateY(${tilt}deg) rotateX(${-spin}deg)`;
  const flat = 1 - Math.min(1, tilt / 62);
  cards.forEach((c, i) => {
    const rel = ((i * STEP - spin) % 360 + 540) % 360 - 180;
    const back = Math.abs(rel) > 90 ? 0.25 : 0; // cards seen from behind
    c.style.setProperty('--dim', Math.min(0.85, (Math.min(1, Math.abs(rel) / 150) * 0.6 + back) * flat).toFixed(3));
  });
  const idx = ((Math.round(spin / STEP) % N) + N) % N;
  if (idx !== activeFrame) {
    activeFrame = idx;
    listItems.forEach((li, k) => li.classList.toggle('is-active', k === idx));
    framesActive.textContent = FRAMES[idx].title;
    gsap.fromTo(framesActive, { y: 12, filter: 'blur(6px)' }, { y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
  }
}
function layoutRing() {
  // portrait cards (concert photos are vertical)
  const ch = innerWidth < 760 ? Math.min(innerHeight * 0.34, innerWidth * 0.62) : Math.max(220, Math.min(innerHeight * 0.36, 330));
  const cw = ch * 0.7;
  ring.style.setProperty('--cw', `${cw}px`);
  ring.style.setProperty('--ch', `${ch}px`);
  ringState.R = ch / 2 / Math.tan(Math.PI / N) + ch * 0.14;
  cards.forEach((c, i) => { c.style.transform = `rotateX(${i * STEP}deg) translateZ(${ringState.R}px)`; });
  renderRing();
}
layoutRing();
window.addEventListener('resize', layoutRing);

const ENTRY = 0.18;
const framesTl = gsap.timeline({
  defaults: { ease: 'none' },
  scrollTrigger: { trigger: '.frames', start: 'top top', end: () => `+=${N * 70}%`, pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true },
  onUpdate: renderRing,
});
framesTl
  .to(ringState, { tilt: 0, scale: 1, duration: ENTRY, ease: 'power2.inOut' }, 0)
  .to('#framesCenter', { opacity: 0, scale: 0.9, duration: ENTRY * 0.7 }, 0)
  .to('#framesActive', { opacity: 1, duration: ENTRY * 0.6 }, ENTRY * 0.5)
  .to(ringState, { spin: (N - 1) * STEP, duration: 1 - ENTRY }, ENTRY);
gsap.fromTo('.frames__scene', { yPercent: 18, opacity: 0.4 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.frames', start: 'top bottom', end: 'top top', scrub: true } });

function frameScrollPos(i: number) {
  const st = framesTl.scrollTrigger;
  if (!st) return 0;
  return st.start + (ENTRY + (1 - ENTRY) * (i / Math.max(1, N - 1))) * (st.end - st.start);
}
listItems.forEach((li) => li.addEventListener('click', () => lenis.scrollTo(frameScrollPos(Number(li.dataset.i)), { duration: 1.4 })));

// mouse drag on the ring scrolls the page (touch already scrolls natively)
let ringDown = false, ringLastY = 0, ringDragged = false;
const framesPin = $('#framesPin');
framesPin.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse') return;
  ringDown = true; ringDragged = false; ringLastY = e.clientY;
});
window.addEventListener('pointermove', (e) => {
  if (!ringDown) return;
  const dy = e.clientY - ringLastY;
  ringLastY = e.clientY;
  if (dy !== 0) { ringDragged = true; lenis.scrollTo(lenis.scroll + dy * 2.2, { immediate: true }); }
});
window.addEventListener('pointerup', () => { ringDown = false; setTimeout(() => { ringDragged = false; }, 0); });
framesPin.addEventListener('pointerenter', () => setCursorLabel('DRAG'));
framesPin.addEventListener('pointerleave', () => setCursorLabel(''));
cards.forEach((c) => c.addEventListener('click', () => {
  if (ringDragged) return;
  openLightbox(FRAMES.map(toShot), Number(c.dataset.i));
}));

/* =========================================================
   Services accordion
   ========================================================= */
const accItems = $$('.acc__item');
const collapse = (panel: HTMLElement) =>
  gsap.fromTo(panel, { height: panel.offsetHeight }, { height: 0, duration: 0.6, ease: 'power3.inOut', onComplete: () => ScrollTrigger.refresh() });
accItems.forEach((item) => {
  const head = $('.acc__head', item);
  const panel = $('.acc__panel', item);
  head.addEventListener('click', () => {
    const willOpen = !item.classList.contains('is-open');
    accItems.forEach((other) => {
      if (other === item || !other.classList.contains('is-open')) return;
      other.classList.remove('is-open');
      $('.acc__head', other).setAttribute('aria-expanded', 'false');
      collapse($('.acc__panel', other));
    });
    item.classList.toggle('is-open', willOpen);
    head.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) gsap.fromTo(panel, { height: 0 }, { height: 'auto', duration: 0.7, ease: 'power3.inOut', onComplete: () => ScrollTrigger.refresh() });
    else collapse(panel);
  });
});
gsap.from('.acc__item', { opacity: 0, y: 40, stagger: 0.08, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.acc', start: 'top 85%' } });

/* =========================================================
   Let's talk
   ========================================================= */
const talkTitle = $('#talkTitle');
$('.talk').addEventListener('pointermove', (e) => {
  const r = talkTitle.getBoundingClientRect();
  talkTitle.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
  talkTitle.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
});
gsap.fromTo('.talk__title', { yPercent: 35, scale: 0.88, opacity: 0.2 }, { yPercent: 0, scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.talk', start: 'top bottom', end: 'top 15%', scrub: true } });
gsap.from('.talk__links > *, .talk__direct', { opacity: 0, y: 20, stagger: 0.06, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.talk', start: 'top 45%' } });

/* =========================================================
   Lightbox
   ========================================================= */
const lb = $('#lightbox');
const lbImg = $<HTMLImageElement>('#lightboxImg');
const lbCap = $('#lightboxCap');
const lbCount = $('#lightboxCount');
const modal = $('#contactModal');
let lbSet: Shot[] = [];
let lbIndex = 0;
function showShot(dir = 0) {
  const shot = lbSet[lbIndex];
  lbCap.textContent = shot.title;
  lbCount.textContent = lbSet.length > 1 ? `${pad(lbIndex + 1)} / ${pad(lbSet.length)}` : '';
  gsap.fromTo(lbImg, { opacity: 0, x: dir * 40 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' });
  // show the (usually cached) medium image instantly, then swap in the full-size one
  const want = lbIndex;
  lbImg.src = shot.preview;
  lbImg.alt = shot.title;
  const full = new Image();
  full.decoding = 'async';
  full.onload = () => { if (lbIndex === want && lb.classList.contains('is-open')) lbImg.src = shot.src; };
  full.src = shot.src;
  // warm the cache for the neighbours
  [1, -1].forEach((d) => { const n = lbSet[(lbIndex + d + lbSet.length) % lbSet.length]; if (n) new Image().src = n.preview; });
}
function openLightbox(set: Shot[], index: number) {
  lbSet = set; lbIndex = index;
  $('#lightboxPrev').hidden = $('#lightboxNext').hidden = set.length < 2;
  showShot();
  lb.classList.add('is-open');
  lb.setAttribute('aria-hidden', 'false');
  lenis.stop();
  setCursorLabel('');
}
function stepLightbox(d: number) {
  if (lbSet.length < 2) return;
  lbIndex = (lbIndex + d + lbSet.length) % lbSet.length;
  showShot(d);
}
function closeLightbox() {
  lb.classList.remove('is-open');
  lb.setAttribute('aria-hidden', 'true');
  if (!modal.classList.contains('is-open')) lenis.start();
}
lb.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.id === 'lightboxPrev') stepLightbox(-1);
  else if (t.id === 'lightboxNext') stepLightbox(1);
  else if (t.id !== 'lightboxImg') closeLightbox();
});
let touchX = 0;
lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 50) stepLightbox(dx < 0 ? 1 : -1); });
document.addEventListener('click', (e) => {
  const el = (e.target as Element | null)?.closest?.<HTMLElement>('[data-lightbox]');
  if (!el?.dataset.lightbox) return;
  // browse every photo in the same section
  const group = $$('[data-lightbox]', el.closest('section') ?? document);
  openLightbox(group.map((g) => ({ src: g.dataset.lightbox ?? '', preview: g.dataset.preview ?? g.dataset.lightbox ?? '', title: g.dataset.title ?? '' })), Math.max(0, group.indexOf(el)));
});

/* =========================================================
   Contact modal (mailto / WhatsApp — no backend needed)
   ========================================================= */
const PHONE_INTL = '919883226530';
const EMAIL = 'prrasant06@gmail.com';
const form = $<HTMLFormElement>('#contactForm');
const formError = $('#formError');
const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
function openModal() {
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  lenis.stop();
  setTimeout(() => field('name').focus(), 300);
}
function closeModal() {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  lenis.start();
}
$('#openContact').addEventListener('click', openModal);
$$('[data-close]', modal).forEach((b) => b.addEventListener('click', closeModal));
let via = 'email';
$$('[data-via]', form).forEach((b) => b.addEventListener('click', () => { via = b.dataset.via ?? 'email'; }));
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = field('name').value.trim();
  const email = field('email').value.trim();
  const topic = field('topic').value;
  const message = field('message').value.trim();
  if (!name || !message) { formError.textContent = 'Please add your name and a short message.'; return; }
  if (via === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { formError.textContent = 'Please enter a valid email address.'; return; }
  formError.textContent = '';
  const body = `Hi Prasant,\n\n${message}\n\n— ${name}${email ? ` (${email})` : ''}`;
  if (via === 'whatsapp') {
    window.open(`https://wa.me/${PHONE_INTL}?text=${encodeURIComponent(`[${topic}] ${body}`)}`, '_blank', 'noopener');
  } else {
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(`${topic} — enquiry from ${name}`)}&body=${encodeURIComponent(body)}`;
  }
});
document.addEventListener('keydown', (e) => {
  if (lb.classList.contains('is-open') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { stepLightbox(e.key === 'ArrowRight' ? 1 : -1); return; }
  if (e.key !== 'Escape') return;
  if (lb.classList.contains('is-open')) closeLightbox();
  if (modal.classList.contains('is-open')) closeModal();
  if (document.body.classList.contains('menu-open')) closeMenu();
});

/* =========================================================
   Nav active state (created last so pin spacing is known)
   ========================================================= */
const navLinks = $$<HTMLAnchorElement>('.nav__links a');
['home', 'about', 'journey', 'featured', 'collections', 'frames', 'services', 'contact'].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  ScrollTrigger.create({
    trigger: scrollTarget(el), start: 'top 55%', end: 'bottom 55%',
    onToggle: (s) => { if (s.isActive) navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`)); },
  });
});

/* =========================================================
   Boot
   ========================================================= */
const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
function splitReveals() {
  if (reduced) return;
  SplitText.create('.services__title', {
    type: 'chars', autoSplit: false,
    onSplit: (self) => gsap.from(self.chars, { yPercent: 110, opacity: 0, rotate: 6, stagger: 0.025, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: '.services', start: 'top 70%' } }),
  });
  SplitText.create('.talk__lead, .services__sub, .jpanel--intro .jpanel__desc', {
    type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
    onSplit: (self) => gsap.from(self.lines, { yPercent: 105, duration: 1, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: self.elements[0], start: 'top 88%' } }),
  });
}

void fontsReady.then(async () => {
  splitReveals();
  ScrollTrigger.refresh();
  await Promise.race([hero3dReady, new Promise((r) => setTimeout(r, 4000))]);
  await runLoader();
  document.body.classList.remove('is-loading');
  $('#loader').style.display = 'none';
  lenis.start();
  ScrollTrigger.refresh();
});
window.addEventListener('load', () => ScrollTrigger.refresh());

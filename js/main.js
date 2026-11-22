import { COLLECTIONS, FRAMES } from './content.js';
import { initSwirl } from './swirl.js';

const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = (n) => String(n).padStart(2, '0');

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
$('#year').textContent = new Date().getFullYear();

/* =========================================================
   Smooth scroll (Lenis) synced with ScrollTrigger
   ========================================================= */
const lenis = new Lenis({ lerp: reduced ? 1 : 0.09, smoothWheel: !reduced, wheelMultiplier: 1 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();

// pinned elements live inside a .pin-spacer – scroll to that so we land on the start
const scrollTarget = (el) => (el.parentElement && el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el);
function goTo(hash) {
  const el = document.querySelector(hash);
  if (!el) return;
  lenis.scrollTo(scrollTarget(el), { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
}
$$('[data-scroll-to]').forEach((a) => a.addEventListener('click', (e) => {
  const hash = a.getAttribute('href');
  if (!hash || !hash.startsWith('#')) return;
  e.preventDefault();
  closeMenu();
  goTo(hash);
}));

/* ---------- mobile menu ---------- */
const burger = $('#burger');
function closeMenu() { document.body.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); $('#mmenu').setAttribute('aria-hidden', 'true'); }
burger.addEventListener('click', () => {
  const open = !document.body.classList.contains('menu-open');
  document.body.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  $('#mmenu').setAttribute('aria-hidden', String(!open));
});

/* =========================================================
   Custom cursor
   ========================================================= */
const cursor = $('.cursor');
const cursorLabel = $('.cursor__label');
function setCursorLabel(text) {
  if (!finePointer) return;
  cursorLabel.textContent = text || '';
  cursor.classList.toggle('has-label', !!text);
}
if (finePointer) {
  document.body.classList.add('has-cursor');
  const dot = $('.cursor__dot'), ring = $('.cursor__ring');
  const dx = gsap.quickSetter(dot, 'x', 'px'), dy = gsap.quickSetter(dot, 'y', 'px');
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  gsap.set([dot, ring], { x: -100, y: -100 });
  window.addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
  document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('a, button, .acc__head, .frames__list li');
    cursor.classList.toggle('is-hover', !!t);
    const v = e.target.closest('[data-lightbox], .frame-card');
    if (v) setCursorLabel('VIEW'); else if (!e.target.closest('#ribbon')) setCursorLabel('');
  });
}

/* =========================================================
   Preloader
   ========================================================= */
function buildLoaderPath() {
  const svg = $('.loader__svg');
  const word = $('.loader__word span');
  const sr = svg.getBoundingClientRect();
  const wr = word.getBoundingClientRect();
  const k = 1000 / sr.width; // viewBox is 1000 wide, preserveAspectRatio meet + same aspect
  const offY = (sr.height - 600 / k) / 2;
  const cx = 500, cy = 300;
  const halfW = Math.max(150, (wr.width * k) / 2);
  const rx = halfW + 70, ry = Math.max(150, halfW * 0.62);
  const end = { x: (wr.right - sr.left) * k + 16, y: (wr.bottom - sr.top - offY) * k - (wr.height * k) * 0.2 };
  const pts = [];
  const a0 = -1.1, a1 = a0 + Math.PI * 2 + 0.35;
  const steps = 220;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; const a = a0 + (a1 - a0) * t;
    const wob = 1 + 0.06 * Math.sin(a * 5 + 1.3) + 0.035 * Math.sin(a * 9 + 0.4) + 0.02 * Math.sin(a * 14);
    pts.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]);
  }
  // lead-in: a short tail from above the ring
  const first = pts[0];
  let d = `M ${(first[0] - 30).toFixed(1)} ${(first[1] - 70).toFixed(1)} Q ${(first[0] - 6).toFixed(1)} ${(first[1] - 30).toFixed(1)} ${first[0].toFixed(1)} ${first[1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  const last = pts[pts.length - 1];
  d += ` Q ${(last[0] - 20).toFixed(1)} ${((last[1] + end.y) / 2 + 40).toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  $('#loaderPath').setAttribute('d', d);
  return end;
}

function runLoader() {
  return new Promise((resolve) => {
    const path = $('#loaderPath');
    const dotEl = $('#loaderDot');
    const count = $('#loaderCount');
    const end = buildLoaderPath();
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    const prog = { p: 0 };
    const tl = gsap.timeline({ onComplete: resolve });
    tl.from('.loader__word span', { opacity: 0, filter: 'blur(14px)', scale: 0.92, duration: reduced ? 0.2 : 1.1, ease: 'power3.out' })
      .to(prog, {
        p: 1, duration: reduced ? 0.3 : 2.4, ease: 'power2.inOut',
        onUpdate() {
          const l = len * prog.p; path.style.strokeDashoffset = String(len - l);
          const pt = path.getPointAtLength(l); dotEl.setAttribute('cx', pt.x); dotEl.setAttribute('cy', pt.y);
          count.textContent = String(Math.round(prog.p * 100)).padStart(3, '0');
        },
      }, '-=0.6')
      .add(() => { dotEl.setAttribute('cx', end.x); dotEl.setAttribute('cy', end.y); })
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
gsap.set(portrait, { xPercent: -50, x: 0 });
gsap.set('.hero__word', { yPercent: 115 });
gsap.set('.hero__portrait img', { yPercent: 40, opacity: 0, filter: 'blur(16px) grayscale(1)' });
gsap.set(['.hero__left', '.hero__right', '.hero__scroll'], { opacity: 0, y: 20 });

function heroIntro() {
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

/* =========================================================
   About — swirl background + expanding card
   ========================================================= */
const swirl = initSwirl($('#swirlBg'), $('#swirlFx'));
const card = $('#aboutCard');
function cardInset(stage) {
  const cw = card.offsetWidth, ch = card.offsetHeight;
  let w, h, r;
  if (stage === 0) { w = Math.min(260, innerWidth * 0.46); h = Math.min(w * 1.32, ch * 0.62); r = 14; }
  else if (stage === 1) { w = Math.min(cw, Math.max(innerWidth * 0.46, 320)); h = Math.min(ch, innerHeight * 0.58); r = 16; }
  else { w = cw; h = ch; r = 18; }
  const ix = Math.max(0, (cw - w) / 2), iy = Math.max(0, (ch - h) / 2);
  return `inset(${iy.toFixed(1)}px ${ix.toFixed(1)}px ${iy.toFixed(1)}px ${ix.toFixed(1)}px round ${r}px)`;
}
gsap.set(card, { clipPath: () => cardInset(0) });
const aboutTl = gsap.timeline({
  defaults: { ease: 'none' },
  scrollTrigger: { trigger: '.about', start: 'top top', end: '+=320%', scrub: 1, pin: true, invalidateOnRefresh: true, anticipatePin: 1 },
});
aboutTl
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

const visibility = (el, on, off) => new IntersectionObserver(([en]) => (en.isIntersecting ? on() : off()), { rootMargin: '100px' }).observe(el);
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
function setTab(i, label) {
  tabs.forEach((t, k) => t.classList.toggle('is-active', k === i));
  if (label && crumb.textContent !== label) {
    gsap.fromTo(crumb, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4 });
    crumb.textContent = label;
  }
}
panels.forEach((panel, idx) => {
  const title = $('.jpanel__title', panel);
  const ghost = $('.jpanel__ghost', panel);
  const photo = $('.jpanel__photo', panel);
  if (idx === 0) {
    gsap.fromTo(title, { '--split': 1 }, { '--split': 0, ease: 'none', scrollTrigger: { trigger: '.journey', start: 'top 85%', end: 'top 10%', scrub: true } });
    gsap.fromTo(ghost, { xPercent: 0 }, { xPercent: -30, ease: 'none', scrollTrigger: { trigger: panel, containerAnimation: hz, start: 'left left', end: 'right left', scrub: true } });
  } else {
    gsap.timeline({ scrollTrigger: { trigger: panel, containerAnimation: hz, start: 'left right', end: 'right left', scrub: true } })
      .fromTo(title, { '--split': 1 }, { '--split': 0, ease: 'none', duration: 0.42 })
      .to(title, { '--split': 0, duration: 0.33 })
      .to(title, { '--split': 1, ease: 'none', duration: 0.25 });
    gsap.fromTo(ghost, { xPercent: 18 }, { xPercent: -28, ease: 'none', scrollTrigger: { trigger: panel, containerAnimation: hz, start: 'left right', end: 'right left', scrub: true } });
    if (photo && innerWidth > 860) {
      gsap.fromTo(photo, { rotateY: -32, transformPerspective: 900 }, { rotateY: 14, ease: 'none', scrollTrigger: { trigger: panel, containerAnimation: hz, start: 'left right', end: 'right left', scrub: true } });
    }
    if (photo) gsap.fromTo($('img', photo), { scale: 1.3 }, { scale: 1.05, ease: 'none', scrollTrigger: { trigger: panel, containerAnimation: hz, start: 'left right', end: 'right left', scrub: true } });
    gsap.from($$('.jpanel__desc, .jpanel__stats, .jpanel__range', panel), { opacity: 0, y: 26, stagger: 0.1, ease: 'power2.out', scrollTrigger: { trigger: panel, containerAnimation: hz, start: 'left 85%', end: 'left 45%', scrub: true } });
    ScrollTrigger.create({
      trigger: panel, containerAnimation: hz, start: 'left 55%', end: 'right 55%',
      onToggle: (s) => { if (s.isActive) setTab(Number(panel.dataset.tab), panel.dataset.crumb); },
    });
  }
});
ScrollTrigger.create({ trigger: panels[1], containerAnimation: hz, start: 'left 55%', onLeaveBack: () => { setTab(-1, 'ORIGIN & FOUNDATIONS'); } });

/* =========================================================
   Featured — cards converge
   ========================================================= */
gsap.timeline({ scrollTrigger: { trigger: '.featured', start: 'top top', end: '+=160%', scrub: 1, pin: true, anticipatePin: 1 } })
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
   Collections — WebGL ribbon
   ========================================================= */
const ribbonName = $('#ribbonName'), ribbonType = $('#ribbonType'), ribbonIndex = $('#ribbonIndex');
function setRibbonCaption(i) {
  const item = COLLECTIONS[i];
  ribbonName.textContent = item.title; ribbonType.textContent = item.type;
  ribbonIndex.textContent = `${pad(i + 1)} / ${pad(COLLECTIONS.length)}`;
  gsap.fromTo([ribbonName, ribbonType], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out', overwrite: true });
}
function buildRibbonFallback() {
  const fb = $('#ribbonFallback');
  fb.innerHTML = COLLECTIONS.map((c, i) => `<figure data-lightbox="${c.src}" data-title="${c.title}"><img src="${c.src}" alt="${c.title}" loading="lazy" /></figure>`).join('');
  fb.hidden = false; $('#ribbon').hidden = true;
  setRibbonCaption(0);
  $('.collections__hint').textContent = 'SWIPE · CLICK TO VIEW';
}
let ribbon = null;
const ribbonST = ScrollTrigger.create({
  trigger: '.collections', start: 'top top', end: '+=220%', pin: true, anticipatePin: 1,
  onUpdate: (s) => { if (ribbon) ribbon.setScroll(s.progress * ribbon.total * 0.92); },
});
async function setupRibbon() {
  if (location.protocol === 'file:') { buildRibbonFallback(); return; } // WebGL textures need http(s)
  try {
    const { initRibbon } = await import('./gallery3d.js');
    ribbon = initRibbon({
      canvas: $('#ribbon'), items: COLLECTIONS,
      onActive: setRibbonCaption,
      onOpen: (i) => openLightbox(COLLECTIONS[i].src, COLLECTIONS[i].title),
      onHover: (over) => setCursorLabel(over ? 'VIEW' : 'DRAG'),
    });
  } catch (err) {
    console.warn('WebGL gallery unavailable, using fallback.', err);
    ribbon = null;
  }
  if (!ribbon) { buildRibbonFallback(); return; }
  ribbon.setScroll(ribbonST.progress * ribbon.total * 0.92);
  visibility($('.collections__pin'), () => ribbon.start(), () => ribbon.stop());
  $('#ribbon').addEventListener('pointerenter', () => setCursorLabel('DRAG'));
  $('#ribbon').addEventListener('pointerleave', () => setCursorLabel(''));
}
setupRibbon();
gsap.from('.collections__label', { yPercent: 100, opacity: 0, scrollTrigger: { trigger: '.collections', start: 'top 70%', end: 'top top', scrub: true } });

/* =========================================================
   Frames '26 — 3D ring
   ========================================================= */
const ring = $('#framesRing');
const list = $('#framesList');
const N = FRAMES.length;
const STEP = 360 / N;
ring.innerHTML = FRAMES.map((f, i) => `<div class="frame-card" data-i="${i}"><img src="${f.src}" alt="${f.title}" loading="lazy" draggable="false" /><span>${f.title}</span></div>`).join('');
list.innerHTML = FRAMES.map((f, i) => `<li data-i="${i}">${f.title}</li>`).join('');
const cards = $$('.frame-card', ring);
const listItems = $$('li', list);
const ringState = { tilt: 62, spin: 0, scale: 0.82, R: 200 };
function layoutRing() {
  const cw = innerWidth < 760 ? Math.min(innerWidth * 0.72, 340) : Math.max(240, Math.min(innerWidth * 0.26, 400));
  const ch = cw * 0.62;
  ring.style.setProperty('--cw', cw + 'px');
  ring.style.setProperty('--ch', ch + 'px');
  ringState.R = (ch / 2) / Math.tan(Math.PI / N) + ch * 0.14;
  cards.forEach((c, i) => { c.style.transform = `rotateX(${i * STEP}deg) translateZ(${ringState.R}px)`; });
  renderRing();
}
let activeFrame = -1;
const framesActive = $('#framesActive');
function renderRing() {
  const { tilt, spin, scale, R } = ringState;
  ring.style.transform = `translateZ(${-R * 0.35}px) scale(${scale}) rotateY(${tilt}deg) rotateX(${-spin}deg)`;
  const flat = 1 - Math.min(1, tilt / 62);
  cards.forEach((c, i) => {
    const rel = ((i * STEP - spin) % 360 + 540) % 360 - 180;
    const back = Math.abs(rel) > 90 ? 0.25 : 0; // cards seen from behind
    c.style.setProperty('--dim', Math.min(0.85, (Math.min(1, Math.abs(rel) / 150) * 0.6 + back) * flat).toFixed(3));
    c.style.zIndex = String(180 - Math.round(Math.abs(rel)));
  });
  const idx = ((Math.round(spin / STEP) % N) + N) % N;
  if (idx !== activeFrame) {
    activeFrame = idx;
    listItems.forEach((li, k) => li.classList.toggle('is-active', k === idx));
    framesActive.textContent = FRAMES[idx].title;
    gsap.fromTo(framesActive, { y: 12, filter: 'blur(6px)' }, { y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
  }
}
layoutRing();
window.addEventListener('resize', layoutRing);
const ENTRY = 0.18;
const framesTl = gsap.timeline({
  defaults: { ease: 'none' },
  scrollTrigger: { trigger: '.frames', start: 'top top', end: () => '+=' + (N * 70) + '%', pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true },
  onUpdate: renderRing,
});
framesTl
  .to(ringState, { tilt: 0, scale: 1, duration: ENTRY, ease: 'power2.inOut' }, 0)
  .to('#framesCenter', { opacity: 0, scale: 0.9, duration: ENTRY * 0.7 }, 0)
  .to('#framesActive', { opacity: 1, duration: ENTRY * 0.6 }, ENTRY * 0.5)
  .to(ringState, { spin: (N - 1) * STEP, duration: 1 - ENTRY }, ENTRY);
gsap.fromTo('.frames__scene', { yPercent: 18, opacity: 0.4 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.frames', start: 'top bottom', end: 'top top', scrub: true } });

function frameScrollPos(i) {
  const st = framesTl.scrollTrigger;
  return st.start + (ENTRY + (1 - ENTRY) * (i / Math.max(1, N - 1))) * (st.end - st.start);
}
listItems.forEach((li) => li.addEventListener('click', () => lenis.scrollTo(frameScrollPos(Number(li.dataset.i)), { duration: 1.4 })));
cards.forEach((c) => c.addEventListener('click', () => { if (!ringDragged) openLightbox(FRAMES[c.dataset.i].src, FRAMES[c.dataset.i].title); }));

// mouse drag on the ring scrolls the page (touch already scrolls natively)
let ringDown = false, ringLastY = 0, ringDragged = false;
const framesPin = $('#framesPin');
framesPin.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; ringDown = true; ringDragged = false; ringLastY = e.clientY; });
window.addEventListener('pointermove', (e) => {
  if (!ringDown) return;
  const dy = e.clientY - ringLastY; ringLastY = e.clientY;
  if (Math.abs(dy) > 0) { ringDragged = true; lenis.scrollTo(lenis.scroll + dy * 2.2, { immediate: true }); }
});
window.addEventListener('pointerup', () => { ringDown = false; setTimeout(() => { ringDragged = false; }, 0); });
framesPin.addEventListener('pointerenter', () => setCursorLabel('DRAG'));
framesPin.addEventListener('pointerleave', () => setCursorLabel(''));

/* =========================================================
   Services accordion
   ========================================================= */
const accItems = $$('.acc__item');
accItems.forEach((item) => {
  const head = $('.acc__head', item);
  const panel = $('.acc__panel', item);
  head.addEventListener('click', () => {
    const willOpen = !item.classList.contains('is-open');
    accItems.forEach((other) => {
      if (other !== item && other.classList.contains('is-open')) {
        other.classList.remove('is-open');
        $('.acc__head', other).setAttribute('aria-expanded', 'false');
        gsap.fromTo($('.acc__panel', other), { height: $('.acc__panel', other).offsetHeight }, { height: 0, duration: 0.6, ease: 'power3.inOut' });
      }
    });
    item.classList.toggle('is-open', willOpen);
    head.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) gsap.fromTo(panel, { height: 0 }, { height: 'auto', duration: 0.7, ease: 'power3.inOut', onComplete: () => ScrollTrigger.refresh() });
    else gsap.fromTo(panel, { height: panel.offsetHeight }, { height: 0, duration: 0.6, ease: 'power3.inOut', onComplete: () => ScrollTrigger.refresh() });
  });
});
gsap.from('.services__title, .services__sub', { opacity: 0, y: 40, filter: 'blur(8px)', stagger: 0.1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.services', start: 'top 75%' } });
gsap.from('.acc__item', { opacity: 0, y: 40, stagger: 0.08, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.acc', start: 'top 85%' } });

/* =========================================================
   Let's talk
   ========================================================= */
const talkTitle = $('#talkTitle');
$('.talk').addEventListener('pointermove', (e) => {
  const r = talkTitle.getBoundingClientRect();
  talkTitle.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
  talkTitle.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
});
gsap.fromTo('.talk__title', { yPercent: 35, scale: 0.88, opacity: 0.2 }, { yPercent: 0, scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.talk', start: 'top bottom', end: 'top 15%', scrub: true } });
gsap.from('.talk__lead, .talk__links > *, .talk__direct', { opacity: 0, y: 20, stagger: 0.06, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.talk', start: 'top 45%' } });

/* =========================================================
   Lightbox
   ========================================================= */
const lb = $('#lightbox'), lbImg = $('#lightboxImg'), lbCap = $('#lightboxCap');
function openLightbox(src, title) {
  lbImg.src = src; lbImg.alt = title || ''; lbCap.textContent = title || '';
  lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); lenis.stop();
  setCursorLabel('');
}
function closeLightbox() { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); if (!modal.classList.contains('is-open')) lenis.start(); }
lb.addEventListener('click', closeLightbox);
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-lightbox]');
  if (el) openLightbox(el.dataset.lightbox, el.dataset.title);
});

/* =========================================================
   Contact modal (mailto / WhatsApp — no backend needed)
   ========================================================= */
const modal = $('#contactModal');
const form = $('#contactForm');
const formError = $('#formError');
function openModal() { modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); lenis.stop(); setTimeout(() => form.elements.name.focus(), 300); }
function closeModal() { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); lenis.start(); }
$('#openContact').addEventListener('click', openModal);
$$('[data-close]', modal).forEach((b) => b.addEventListener('click', closeModal));
let via = 'email';
$$('[data-via]', form).forEach((b) => b.addEventListener('click', () => { via = b.dataset.via; }));
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const topic = form.elements.topic.value;
  const message = form.elements.message.value.trim();
  if (!name || !message) { formError.textContent = 'Please add your name and a short message.'; return; }
  if (via === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { formError.textContent = 'Please enter a valid email address.'; return; }
  formError.textContent = '';
  const body = `Hi Prasant,\n\n${message}\n\n— ${name}${email ? ` (${email})` : ''}`;
  if (via === 'whatsapp') {
    window.open(`https://wa.me/919883226530?text=${encodeURIComponent(`[${topic}] ${body}`)}`, '_blank', 'noopener');
  } else {
    window.location.href = `mailto:prrasant06@gmail.com?subject=${encodeURIComponent(`${topic} — enquiry from ${name}`)}&body=${encodeURIComponent(body)}`;
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (lb.classList.contains('is-open')) closeLightbox();
  if (modal.classList.contains('is-open')) closeModal();
  if (document.body.classList.contains('menu-open')) closeMenu();
});

/* =========================================================
   Nav active state (created last so pin spacing is known)
   ========================================================= */
const navLinks = $$('.nav__links a');
['home', 'about', 'journey', 'featured', 'collections', 'frames', 'services', 'contact'].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  ScrollTrigger.create({
    trigger: scrollTarget(el), start: 'top 55%', end: 'bottom 55%',
    onToggle: (s) => { if (s.isActive) navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id)); },
  });
});

/* =========================================================
   Boot
   ========================================================= */
const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 2500))]);
fontsReady.then(async () => {
  ScrollTrigger.refresh();
  await runLoader();
  document.body.classList.remove('is-loading');
  $('#loader').style.display = 'none';
  lenis.start();
  ScrollTrigger.refresh();
});
window.addEventListener('load', () => ScrollTrigger.refresh());

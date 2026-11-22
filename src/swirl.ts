// Monochrome "swirling night sky" flow-field background with a
// photographer silhouette on a hill. Static streamlines + live particles.

function mulberry(a: number): () => number { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

interface Vortex { x: number; y: number; r: number; s: number; moon?: boolean }
interface Particle { x: number; y: number; life: number }
export interface Swirl { start(): void; stop(): void }

export function initSwirl(bg: HTMLCanvasElement, fx: HTMLCanvasElement): Swirl {
  const bctx = bg.getContext('2d')!;
  const fctx = fx.getContext('2d')!;
  let W = 0, H = 0, dpr = 1, running = false, raf = 0;
  let vortices: Vortex[] = [], particles: Particle[] = [];

  function field(x: number, y: number): [number, number] {
    // base flow: wavy, mostly horizontal
    const nx = x / W, ny = y / H;
    let vx = 1, vy = 0.45 * Math.sin((nx * 1.6 + ny * 1.1) * Math.PI * 2) + 0.25 * Math.sin(nx * 9 + ny * 3);
    if (ny > 0.62) { vy *= 0.4; } // calmer near the ground
    for (const v of vortices) {
      const dx = x - v.x, dy = y - v.y; const r2 = dx * dx + dy * dy; const s2 = v.r * v.r;
      const d = Math.sqrt(r2) + 1e-3; const mag = v.s * 3.2 * Math.exp(-r2 / (s2 * 5));
      vx += -dy / d * mag; vy += dx / d * mag;
    }
    const m = Math.hypot(vx, vy) || 1; return [vx / m, vy / m];
  }

  function drawGround(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.fillStyle = '#020202';
    // far hills
    ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, H * 0.76 - Math.sin(x * 0.004 + 1) * H * 0.04 - Math.sin(x * 0.013) * H * 0.012);
    ctx.lineTo(W, H); ctx.fill();
    // town with spires on the left
    ctx.globalAlpha = 1; const rand = mulberry(7); let x = W * 0.02;
    while (x < W * 0.42) {
      const w = 14 + rand() * 34, h = H * (0.04 + rand() * 0.1); const base = H * 0.8;
      ctx.fillRect(x, base - h, w, h + 40);
      if (rand() < 0.35) { ctx.beginPath(); ctx.moveTo(x, base - h); ctx.lineTo(x + w / 2, base - h - H * (0.05 + rand() * 0.12)); ctx.lineTo(x + w, base - h); ctx.fill(); }
      // lit windows
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let wy = base - h + 8; wy < base - 6; wy += 11) for (let wx = x + 4; wx < x + w - 4; wx += 8) if (rand() < 0.12) ctx.fillRect(wx, wy, 2, 3);
      ctx.fillStyle = '#020202'; x += w + rand() * 4;
    }
    // near hill
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x2 = 0; x2 <= W; x2 += 6) ctx.lineTo(x2, H * 0.84 - Math.sin(x2 * 0.0025 + 2.4) * H * 0.05);
    ctx.lineTo(W, H); ctx.fill();
    // photographer with tripod on the hill (right)
    const px = W * 0.74, py = H * 0.84 - Math.sin(px * 0.0025 + 2.4) * H * 0.05 + 2, s = Math.max(0.6, H / 900);
    ctx.save(); ctx.translate(px, py); ctx.scale(s, s); ctx.strokeStyle = '#020202'; ctx.lineCap = 'round';
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(-6, 0); ctx.moveTo(0, -46); ctx.lineTo(7, 0); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -62, 8, 18, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(1, -86, 6.5, 0, 7); ctx.fill();
    ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(4, -72); ctx.lineTo(16, -76); ctx.stroke();
    ctx.fillRect(14, -84, 14, 10); // camera
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(22, -74); ctx.lineTo(12, 0); ctx.moveTo(22, -74); ctx.lineTo(32, 0); ctx.moveTo(22, -74); ctx.lineTo(24, 0); ctx.stroke();
    ctx.restore(); ctx.restore();
  }

  function render() {
    const rect = bg.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(1, Math.round(rect.width)); H = Math.max(1, Math.round(rect.height));
    for (const c of [bg, fx]) { c.width = W * dpr; c.height = H * dpr; }
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rand = mulberry(42); const S = Math.min(W, H);
    vortices = [
      { x: W * 0.16, y: H * 0.22, r: S * 0.09, s: 1 },
      { x: W * 0.40, y: H * 0.14, r: S * 0.06, s: 0.9 },
      { x: W * 0.83, y: H * 0.18, r: S * 0.12, s: 1.2, moon: true },
      { x: W * 0.60, y: H * 0.36, r: S * 0.14, s: -0.9 },
      { x: W * 0.30, y: H * 0.46, r: S * 0.08, s: 0.8 },
      { x: W * 0.95, y: H * 0.52, r: S * 0.07, s: -0.8 },
      { x: W * 0.05, y: H * 0.55, r: S * 0.06, s: 0.8 },
    ];
    bctx.fillStyle = '#050505'; bctx.fillRect(0, 0, W, H);
    const g = bctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#191919'); g.addColorStop(0.7, '#0c0c0c'); g.addColorStop(1, '#030303');
    bctx.fillStyle = g; bctx.fillRect(0, 0, W, H);

    // streamlines
    const step = 3, spacing = Math.max(7, S / 110);
    bctx.lineCap = 'round';
    for (let gy = -spacing; gy < H * 0.86; gy += spacing) {
      for (let gx = -spacing; gx < W + spacing; gx += spacing) {
        let x = gx + rand() * spacing, y = gy + rand() * spacing;
        const len = 18 + rand() * 40; let near = 0;
        for (const v of vortices) near = Math.max(near, 1 - Math.min(1, Math.hypot(x - v.x, y - v.y) / (v.r * 2.4)));
        const a = 0.12 + rand() * 0.35 + near * 0.45;
        bctx.strokeStyle = `rgba(235,235,235,${Math.min(0.85, a).toFixed(3)})`;
        bctx.lineWidth = 0.6 + rand() * 0.9;
        bctx.beginPath(); bctx.moveTo(x, y);
        for (let i = 0; i < len; i++) { const [vx, vy] = field(x, y); x += vx * step; y += vy * step; bctx.lineTo(x, y); }
        bctx.stroke();
      }
    }
    // star / moon swirls
    for (const v of vortices) {
      const rg = bctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.r * (v.moon ? 1.6 : 1.1));
      rg.addColorStop(0, `rgba(255,255,255,${v.moon ? 0.95 : 0.6})`); rg.addColorStop(0.25, 'rgba(255,255,255,0.25)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      bctx.fillStyle = rg; bctx.beginPath(); bctx.arc(v.x, v.y, v.r * 1.6, 0, 7); bctx.fill();
      bctx.strokeStyle = 'rgba(255,255,255,0.35)';
      for (let k = 1; k <= 5; k++) { bctx.lineWidth = 0.8; bctx.beginPath(); bctx.arc(v.x, v.y, v.r * 0.18 * k + rand() * 2, rand() * 6, rand() * 6 + 4.5); bctx.stroke(); }
      if (v.moon) {
        bctx.save(); bctx.shadowColor = 'rgba(255,255,255,0.9)'; bctx.shadowBlur = v.r * 0.6;
        bctx.fillStyle = '#f6f6f6'; bctx.beginPath(); bctx.arc(v.x, v.y, v.r * 0.3, 0, 7); bctx.fill(); bctx.restore();
        bctx.fillStyle = 'rgba(0,0,0,0.12)'; bctx.beginPath(); bctx.arc(v.x + v.r * 0.08, v.y - v.r * 0.05, v.r * 0.09, 0, 7); bctx.arc(v.x - v.r * 0.1, v.y + v.r * 0.09, v.r * 0.06, 0, 7); bctx.fill();
      }
    }
    // small stars
    for (let i = 0; i < 70; i++) { const x = rand() * W, y = rand() * H * 0.7, r = 0.6 + rand() * 1.6; bctx.fillStyle = `rgba(255,255,255,${0.4 + rand() * 0.6})`; bctx.beginPath(); bctx.arc(x, y, r, 0, 7); bctx.fill(); }
    drawGround(bctx);

    // live particles
    const count = Math.round(Math.min(700, (W * H) / 2600));
    particles = Array.from({ length: count }, () => ({ x: rand() * W, y: rand() * H * 0.8, life: rand() * 200 }));
    fctx.clearRect(0, 0, W, H);
  }

  function tick() {
    if (!running) return;
    fctx.save(); fctx.globalCompositeOperation = 'destination-out'; fctx.fillStyle = 'rgba(0,0,0,0.08)'; fctx.fillRect(0, 0, W, H); fctx.restore();
    fctx.strokeStyle = 'rgba(255,255,255,0.75)'; fctx.lineWidth = 1.1; fctx.beginPath();
    for (const p of particles) {
      const [vx, vy] = field(p.x, p.y); const nx = p.x + vx * 1.6, ny = p.y + vy * 1.6;
      fctx.moveTo(p.x, p.y); fctx.lineTo(nx, ny); p.x = nx; p.y = ny; p.life--;
      if (p.life < 0 || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H * 0.8) { p.x = Math.random() * W; p.y = Math.random() * H * 0.78; p.life = 120 + Math.random() * 200; }
    }
    fctx.stroke();
    raf = requestAnimationFrame(tick);
  }

  render();
  let rt = 0; window.addEventListener('resize', () => { clearTimeout(rt); rt = window.setTimeout(render, 200); });
  return {
    start() { if (!running) { running = true; raf = requestAnimationFrame(tick); } },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}

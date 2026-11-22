// Curved / S-bending WebGL ribbon gallery (Three.js)
import {
  LinearFilter, Mesh, PerspectiveCamera, PlaneGeometry, Raycaster, SRGBColorSpace, Scene,
  ShaderMaterial, TextureLoader, Vector2, WebGLRenderer, type Texture,
} from 'three';
import type { Photo } from './content';

const vertex = /* glsl */`
  uniform float uViewW;
  uniform float uViewH;
  uniform float uVelocity;
  uniform float uBend;
  varying vec2 vUv;
  varying float vShade;
  const float PI = 3.141592653589793;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    float nx = wp.x / (uViewW * 0.5);              // -1 .. 1 across the screen
    float ax = abs(nx);
    // S-shaped ribbon: left side swings toward the camera & down, right side away & up
    wp.z += -nx * ax * uViewW * 0.22 * uBend;
    wp.y += nx * nx * nx * uViewH * 0.12 * uBend;
    // velocity wave
    wp.y += sin(uv.x * PI) * uVelocity * 26.0;
    wp.z -= abs(uVelocity) * sin(uv.x * PI) * 60.0;
    vShade = clamp(1.0 - ax * 0.12, 0.75, 1.0);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragment = /* glsl */`
  uniform sampler2D uTex;
  uniform vec2 uImgRes;
  uniform vec2 uPlaneRes;
  uniform float uVelocity;
  uniform float uHover;
  uniform float uRadius;
  uniform float uLoaded;
  varying vec2 vUv;
  varying float vShade;
  vec2 cover(vec2 uv) {
    float rp = uPlaneRes.x / uPlaneRes.y;
    float ri = uImgRes.x / uImgRes.y;
    vec2 s = rp > ri ? vec2(1.0, ri / rp) : vec2(rp / ri, 1.0);
    return (uv - 0.5) * s + 0.5;
  }
  void main() {
    vec2 uv = cover(vUv);
    uv = (uv - 0.5) * (1.0 - 0.07 * uHover) + 0.5;
    float shift = uVelocity * 0.018;
    vec3 col;
    col.r = texture2D(uTex, uv + vec2(shift, 0.0)).r;
    col.g = texture2D(uTex, uv).g;
    col.b = texture2D(uTex, uv - vec2(shift, 0.0)).b;
    col = mix(vec3(0.82), col, uLoaded) * vShade;
    // rounded corners
    vec2 p = (vUv - 0.5) * uPlaneRes;
    vec2 q = abs(p) - uPlaneRes * 0.5 + uRadius;
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
    float a = 1.0 - smoothstep(-1.0, 1.0, d);
    gl_FragColor = vec4(col, a);
  }
`;

export interface RibbonOptions {
  canvas: HTMLCanvasElement;
  items: Photo[];
  onActive?: (index: number) => void;
  onOpen?: (index: number) => void;
  onHover?: (over: boolean) => void;
}
export interface Ribbon { setScroll(px: number): void; readonly total: number; start(): void; stop(): void }

type Uniforms = {
  uTex: { value: Texture | null }; uImgRes: { value: Vector2 }; uPlaneRes: { value: Vector2 };
  uVelocity: { value: number }; uHover: { value: number }; uRadius: { value: number }; uLoaded: { value: number };
  uViewW: { value: number }; uViewH: { value: number }; uBend: { value: number };
};
type Card = Mesh<PlaneGeometry, ShaderMaterial> & { userData: { index: number; hover: number } };

export function initRibbon({ canvas, items, onActive, onOpen, onHover }: RibbonOptions): Ribbon | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 10, 6000);
  const loader = new TextureLoader();
  const geometry = new PlaneGeometry(1, 1, 40, 20);

  let W = 1, H = 1, cardW = 400, cardH = 270, gap = 40, total = 1;
  const state = { target: 0, current: 0, scrollBase: 0, drag: 0, velocity: 0, active: -1, hovered: -1, running: false, bend: 1 };

  const meshes: Card[] = items.map((item, i) => {
    const uniforms: Uniforms = {
      uTex: { value: null }, uImgRes: { value: new Vector2(16, 10) }, uPlaneRes: { value: new Vector2(cardW, cardH) },
      uVelocity: { value: 0 }, uHover: { value: 0 }, uRadius: { value: 10 }, uLoaded: { value: 0 },
      uViewW: { value: 1 }, uViewH: { value: 1 }, uBend: { value: 1 },
    };
    const material = new ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, transparent: true });
    const mesh = new Mesh(geometry, material) as Card;
    mesh.userData = { index: i, hover: 0 };
    scene.add(mesh);
    loader.load(item.src, (tex) => {
      tex.colorSpace = SRGBColorSpace;
      tex.minFilter = LinearFilter; tex.generateMipmaps = false;
      uniforms.uTex.value = tex;
      const img = tex.image as HTMLImageElement;
      uniforms.uImgRes.value.set(img.width, img.height);
      uniforms.uLoaded.value = 1;
    });
    return mesh;
  });

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    const dist = 1000;
    camera.position.set(0, 0, dist);
    camera.fov = 2 * Math.atan(H / 2 / dist) * (180 / Math.PI);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    cardW = Math.min(Math.max(W * (W < 700 ? 0.62 : 0.27), 220), 480);
    cardH = cardW * 0.66;
    gap = cardW * 0.1;
    total = items.length * (cardW + gap);
    state.bend = W < 700 ? 0.45 : 1;
    meshes.forEach((m) => {
      m.scale.set(cardW, cardH, 1);
      const u = m.material.uniforms as Uniforms;
      u.uPlaneRes.value.set(cardW, cardH); u.uViewW.value = W; u.uViewH.value = H; u.uRadius.value = Math.max(6, cardW * 0.025);
    });
  }

  // ---- input: drag ----
  const pointer = new Vector2(-10, -10);
  const ray = new Raycaster();
  let down = false, lastX = 0, moved = 0;
  canvas.addEventListener('pointerdown', (e) => { down = true; lastX = e.clientX; moved = 0; canvas.setPointerCapture?.(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (!down) return;
    const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
    state.drag -= dx * 1.4;
  });
  function pick(e: PointerEvent): number {
    const r = canvas.getBoundingClientRect();
    const p = new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(p, camera);
    const hit = ray.intersectObjects(meshes, false)[0];
    return hit ? (hit.object as Card).userData.index : -1;
  }
  const end = (e: PointerEvent) => {
    if (!down) return; down = false;
    if (moved < 6) { const i = pick(e); if (i >= 0) onOpen?.(i); }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', () => { down = false; });
  canvas.addEventListener('pointerleave', () => { pointer.set(-10, -10); });

  function wrap(x: number) { return ((x + total / 2) % total + total) % total - total / 2; }

  function frame() {
    if (!state.running) return;
    state.target = state.scrollBase + state.drag;
    const prev = state.current;
    state.current += (state.target - state.current) * 0.075;
    const v = Math.max(-1.6, Math.min(1.6, (state.current - prev) / 30));
    state.velocity += (v - state.velocity) * 0.15;

    let best = 0, bestD = Infinity;
    meshes.forEach((m, i) => {
      const x = wrap(i * (cardW + gap) - state.current);
      m.position.set(x, 0, 0);
      const u = m.material.uniforms as Uniforms;
      u.uVelocity.value = state.velocity; u.uBend.value = state.bend;
      if (Math.abs(x) < bestD) { bestD = Math.abs(x); best = i; }
    });

    // hover (raycast against the flat planes – accurate near the centre)
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(meshes, false)[0];
    const h: number = hit ? (hit.object as Card).userData.index : -1;
    if (h !== state.hovered) { state.hovered = h; onHover?.(h >= 0); }
    meshes.forEach((m, i) => { m.userData.hover += ((i === h ? 1 : 0) - m.userData.hover) * 0.1; m.material.uniforms.uHover.value = m.userData.hover; });

    if (best !== state.active) { state.active = best; onActive?.(best); }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    setScroll(px: number) { state.scrollBase = px; },
    get total() { return total; },
    start() { if (!state.running) { state.running = true; requestAnimationFrame(frame); } },
    stop() { state.running = false; },
  };
}

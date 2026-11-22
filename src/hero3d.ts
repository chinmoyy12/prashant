// "3D Prasant": a depth-displaced, relightable portrait mesh plus a particle twin
// used for the assemble (intro) and dissolve (scroll) transitions.
import {
  BufferAttribute, BufferGeometry, Group, LinearFilter, Mesh, PerspectiveCamera,
  PlaneGeometry, Points, SRGBColorSpace, Scene, ShaderMaterial, Texture, TextureLoader, Vector2, WebGLRenderer,
} from 'three';

const meshVertex = /* glsl */`
  uniform sampler2D uDepth;
  uniform float uDepthScale;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += texture2D(uDepth, uv).r * uDepthScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const meshFragment = /* glsl */`
  uniform sampler2D uColor;
  uniform sampler2D uDepth;
  uniform vec2 uTexel;
  uniform vec2 uMouse;      // uv space
  uniform vec2 uLight;      // -1..1 light direction from the cursor
  uniform float uReveal;    // colour "developing" strength under the cursor
  uniform float uOpacity;
  uniform float uAspect;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uColor, vUv);
    if (c.a < 0.02) discard;
    float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    // lift the shadows so darker skin keeps its detail in black & white
    float tone = smoothstep(-0.1, 0.9, pow(lum, 0.5));
    vec3 mono = vec3(tone);
    // normal from the depth map for relighting
    float dx = texture2D(uDepth, vUv + vec2(uTexel.x, 0.0)).r - texture2D(uDepth, vUv - vec2(uTexel.x, 0.0)).r;
    float dy = texture2D(uDepth, vUv + vec2(0.0, uTexel.y)).r - texture2D(uDepth, vUv - vec2(0.0, uTexel.y)).r;
    vec3 n = normalize(vec3(-dx * 7.0, -dy * 7.0, 1.0));
    vec3 l = normalize(vec3(uLight.x, uLight.y, 0.9));
    float diff = clamp(dot(n, l), 0.0, 1.0);
    float rim = pow(1.0 - n.z, 2.0) * clamp(dot(n.xy, uLight), 0.0, 1.0);
    vec3 shaded = mono * (0.82 + 0.28 * diff) + rim * 0.45;
    // colour develops in a soft circle around the cursor
    vec2 d = (vUv - uMouse) * vec2(uAspect, 1.0);
    float m = (1.0 - smoothstep(0.08, 0.26, length(d))) * uReveal;
    vec3 lifted = pow(c.rgb, vec3(0.8));
    vec3 col = mix(shaded, lifted * (0.9 + 0.25 * diff) + rim * 0.35, m);
    // fade into the floor
    float fade = smoothstep(0.0, 0.28, vUv.y);
    gl_FragColor = vec4(col, c.a * fade * uOpacity);
  }
`;

const pointsVertex = /* glsl */`
  attribute vec2 aUv;
  attribute vec3 aRand;
  uniform sampler2D uDepth;
  uniform sampler2D uColor;
  uniform float uDepthScale;
  uniform float uScatter;
  uniform float uTime;
  uniform float uSize;
  uniform vec2 uPlane;
  varying float vAlpha;
  varying float vLum;
  void main() {
    vec4 c = texture2D(uColor, aUv);
    vLum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    vec3 p = vec3((aUv - 0.5) * uPlane, texture2D(uDepth, aUv).r * uDepthScale);
    float s = smoothstep(0.0, 1.0, clamp(uScatter * 1.25 - aRand.z * 0.25, 0.0, 1.0));
    float ang = aRand.x * 6.2831 + uTime * 0.25;
    vec3 drift = vec3(cos(ang) * (220.0 + aRand.y * 520.0), 180.0 + aRand.y * 640.0, sin(ang) * (260.0 + aRand.x * 420.0));
    p += drift * s;
    p.x += sin(uTime * 0.8 + aRand.y * 20.0) * 6.0 * s;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (1.0 + s * 1.6) * (900.0 / -mv.z);
    vAlpha = c.a * (1.0 - smoothstep(0.75, 1.0, s)) * smoothstep(0.0, 0.25, aUv.y);
  }
`;

const pointsFragment = /* glsl */`
  uniform float uOpacity;
  varying float vAlpha;
  varying float vLum;
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float d = length(q);
    if (d > 0.5) discard;
    float a = (1.0 - smoothstep(0.2, 0.5, d)) * vAlpha * uOpacity;
    gl_FragColor = vec4(vec3(smoothstep(-0.1, 0.9, pow(vLum, 0.5)) * 0.85), a);
  }
`;

export interface Hero3D {
  /** 0 = assembled portrait, 1 = fully dissolved into particles */
  setScatter(v: number): void;
  start(): void;
  stop(): void;
}

export interface Hero3DOptions {
  canvas: HTMLCanvasElement;
  colorUrl: string;
  depthUrl: string;
  /** element whose pointer movement drives the 3D tilt */
  pointerArea: HTMLElement;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

export async function initHero3D({ canvas, colorUrl, depthUrl, pointerArea }: Hero3DOptions): Promise<Hero3D | null> {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;

  const loader = new TextureLoader();
  const [colorTex, depthTex, colorImg] = await Promise.all([
    loader.loadAsync(colorUrl), loader.loadAsync(depthUrl), loadImage(colorUrl),
  ]);
  const prep = (t: Texture, srgb: boolean) => { t.minFilter = LinearFilter; t.generateMipmaps = false; if (srgb) t.colorSpace = SRGBColorSpace; };
  prep(colorTex, true); prep(depthTex, false);
  const imgAspect = colorImg.naturalWidth / colorImg.naturalHeight;

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 10, 8000);
  const group = new Group();
  scene.add(group);

  const meshUniforms = {
    uColor: { value: colorTex }, uDepth: { value: depthTex },
    uTexel: { value: new Vector2(1 / colorImg.naturalWidth * 2, 1 / colorImg.naturalHeight * 2) },
    uDepthScale: { value: 100 }, uMouse: { value: new Vector2(-2, -2) }, uLight: { value: new Vector2(0.4, 0.5) },
    uReveal: { value: 0 }, uOpacity: { value: 0 }, uAspect: { value: imgAspect },
  };
  const mesh = new Mesh(
    new PlaneGeometry(1, 1, 180, 250),
    new ShaderMaterial({ vertexShader: meshVertex, fragmentShader: meshFragment, uniforms: meshUniforms, transparent: true, depthWrite: false }),
  );
  group.add(mesh);

  // ---- particle twin: sample opaque pixels of the cut-out ----
  const small = window.innerWidth < 760;
  const step = small ? 5 : 3;
  const sw = Math.round(colorImg.naturalWidth / step), sh = Math.round(colorImg.naturalHeight / step);
  const cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const uvs: number[] = [], rands: number[] = [];
  if (ctx) {
    ctx.drawImage(colorImg, 0, 0, sw, sh);
    const data = ctx.getImageData(0, 0, sw, sh).data;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      if (data[(y * sw + x) * 4 + 3] < 128) continue;
      uvs.push((x + 0.5) / sw, 1 - (y + 0.5) / sh);
      rands.push(Math.random(), Math.random(), Math.random());
    }
  }
  const pg = new BufferGeometry();
  const count = uvs.length / 2;
  pg.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
  pg.setAttribute('aUv', new BufferAttribute(new Float32Array(uvs), 2));
  pg.setAttribute('aRand', new BufferAttribute(new Float32Array(rands), 3));
  const pointUniforms = {
    uColor: { value: colorTex }, uDepth: { value: depthTex }, uDepthScale: { value: 100 },
    uScatter: { value: 1 }, uTime: { value: 0 }, uSize: { value: 2 }, uPlane: { value: new Vector2(1, 1) }, uOpacity: { value: 1 },
  };
  const points = new Points(pg, new ShaderMaterial({
    vertexShader: pointsVertex, fragmentShader: pointsFragment, uniforms: pointUniforms,
    transparent: true, depthWrite: false,
  }));
  points.frustumCulled = false;
  group.add(points);

  let W = 1, H = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    const dist = 1400;
    camera.position.set(0, 0, dist);
    camera.fov = 2 * Math.atan(H / 2 / dist) * (180 / Math.PI);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    // figure: bottom-aligned, ~88% of the hero height (wider crop on phones)
    let fh = H * (W < 760 ? 0.62 : 0.76);
    let fw = fh * imgAspect;
    if (fw > W * 0.96) { fw = W * 0.96; fh = fw / imgAspect; }
    mesh.scale.set(fw, fh, 1);
    group.position.set(0, -H / 2 + fh / 2, 0);
    const depthScale = fh * 0.12;
    meshUniforms.uDepthScale.value = depthScale / 1; // mesh is scaled in x/y only
    pointUniforms.uDepthScale.value = depthScale;
    pointUniforms.uPlane.value.set(fw, fh);
    pointUniforms.uSize.value = Math.max(1.6, (fh / sh) * 0.95) * Math.min(window.devicePixelRatio || 1, 2);
  }

  // ---- pointer → tilt, light & colour reveal ----
  const target = { rx: 0, ry: 0, lx: 0.4, ly: 0.5, reveal: 0 };
  const cur = { rx: 0, ry: 0, lx: 0.4, ly: 0.5, reveal: 0 };
  const mouseUv = new Vector2(-2, -2);
  pointerArea.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width * 2 - 1;
    const ny = (e.clientY - r.top) / r.height * 2 - 1;
    target.ry = nx * 0.32; target.rx = ny * 0.12;
    target.lx = nx; target.ly = -ny;
    // cursor in the portrait's uv space
    const fw = mesh.scale.x, fh = mesh.scale.y;
    const left = r.left + (r.width - fw) / 2, top = r.bottom - fh;
    mouseUv.set((e.clientX - left) / fw, 1 - (e.clientY - top) / fh);
    target.reveal = e.pointerType === 'mouse' ? 1 : 0;
  });
  pointerArea.addEventListener('pointerleave', () => { target.rx = 0; target.ry = 0; target.reveal = 0; });

  let scatter = 1, running = false, t0 = performance.now();
  function frame() {
    if (!running) return;
    const t = (performance.now() - t0) / 1000;
    const k = 0.06;
    cur.rx += (target.rx - cur.rx) * k; cur.ry += (target.ry - cur.ry) * k;
    cur.lx += (target.lx - cur.lx) * k; cur.ly += (target.ly - cur.ly) * k;
    cur.reveal += (target.reveal - cur.reveal) * 0.08;
    // idle sway keeps the figure alive on touch screens
    group.rotation.y = cur.ry + Math.sin(t * 0.5) * 0.04;
    group.rotation.x = cur.rx + Math.sin(t * 0.37) * 0.015;
    meshUniforms.uLight.value.set(cur.lx * 0.9 + 0.1, cur.ly * 0.9 + 0.2);
    meshUniforms.uMouse.value.lerp(mouseUv, 0.18);
    meshUniforms.uReveal.value = cur.reveal * (1 - scatter);
    const meshVis = 1 - Math.min(1, scatter / 0.12);
    meshUniforms.uOpacity.value = meshVis;
    pointUniforms.uScatter.value = scatter;
    pointUniforms.uTime.value = t;
    pointUniforms.uOpacity.value = Math.min(1, scatter / 0.04) * 0.95;
    points.visible = scatter > 0.001;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    setScatter(v: number) { scatter = Math.max(0, Math.min(1, v)); },
    start() { if (!running) { running = true; t0 = performance.now() - 1; requestAnimationFrame(frame); } },
    stop() { running = false; },
  };
}

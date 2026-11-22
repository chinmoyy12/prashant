// Resizes a photo in the browser before upload: three sizes + blurred preview + average colour.
// Doing this client-side keeps uploads small and fast, and strips camera/GPS metadata.

export interface ProcessedImage {
  full: Blob; md: Blob; sm: Blob;
  ext: 'webp' | 'jpg';
  w: number; h: number;
  lqip: string; color: string;
}

const SIZES = { full: 2000, md: 1100, sm: 560 } as const;
const MAX_FULL_BYTES = 4_000_000;

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function draw(src: CanvasImageSource, sw: number, sh: number, edge: number): HTMLCanvasElement {
  const k = Math.min(1, edge / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * k));
  c.height = Math.max(1, Math.round(sh * k));
  const g = c.getContext('2d');
  if (!g) throw new Error('This browser cannot process images.');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

const toBlob = (c: HTMLCanvasElement, type: string, q: number) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the image.'))), type, q));

export async function processImage(file: File): Promise<ProcessedImage> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error(`${file.name}: use a JPG, PNG or WebP photo.`);
  }
  let src: ImageBitmap | HTMLImageElement;
  try { src = await decode(file); } catch { throw new Error(`${file.name}: this photo could not be opened.`); }
  const sw = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const sh = 'naturalHeight' in src ? src.naturalHeight : src.height;
  if (sw < 400 || sh < 400) throw new Error(`${file.name}: the photo is too small (at least 400 px needed).`);

  // WebP where the browser can encode it (Chrome, Edge, Firefox); JPEG otherwise (Safari)
  const probe = await toBlob(draw(src, sw, sh, 8), 'image/webp', 0.8);
  const webp = probe.type === 'image/webp';
  const type = webp ? 'image/webp' : 'image/jpeg';

  const fullCanvas = draw(src, sw, sh, SIZES.full);
  let q = webp ? 0.82 : 0.86;
  let full = await toBlob(fullCanvas, type, q);
  while (full.size > MAX_FULL_BYTES && q > 0.5) { q -= 0.08; full = await toBlob(fullCanvas, type, q); }
  const md = await toBlob(draw(fullCanvas, fullCanvas.width, fullCanvas.height, SIZES.md), type, webp ? 0.8 : 0.84);
  const sm = await toBlob(draw(fullCanvas, fullCanvas.width, fullCanvas.height, SIZES.sm), type, webp ? 0.74 : 0.8);

  const tiny = draw(fullCanvas, fullCanvas.width, fullCanvas.height, 24);
  const lqip = tiny.toDataURL(type, 0.45);
  const one = draw(tiny, tiny.width, tiny.height, 1).getContext('2d')?.getImageData(0, 0, 1, 1).data;
  const color = one ? `#${[one[0], one[1], one[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}` : '#222222';

  if ('close' in src) src.close();
  return { full, md, sm, ext: webp ? 'webp' : 'jpg', w: fullCanvas.width, h: fullCanvas.height, lqip, color };
}

/** "IMG_2024_street-food.jpg" → "Street Food" */
export function titleFromFile(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/^(img|dsc|_?sez|pxl|photo)[-_ ]?\d*[-_ ]?/i, '').replace(/[-_]+/g, ' ').trim();
  if (!base || /^\d+$/.test(base)) return 'Untitled frame';
  return base.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 80);
}

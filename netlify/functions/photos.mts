// POST /api/upload           multipart: full, md, sm (WebP or JPEG, resized in the browser) → image urls
// GET  /api/img/<id>-<size>.<ext>                                                 → the image (CDN-cached forever)
import type { Config, Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import { errorResponse, json, requireAuth } from './_shared/auth.mts';

const SIZES = { full: 4_500_000, md: 1_500_000, sm: 500_000 } as const;
type Size = keyof typeof SIZES;
const FILE_RE = /^(u-[a-f0-9]{16})-(full|md|sm)\.(webp|jpg)$/;

const isWebp = (b: Uint8Array) =>
  b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
const isJpeg = (b: Uint8Array) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

export default async (req: Request, context: Context) => {
  const store = getStore('photos');
  const path = new URL(req.url).pathname;

  if (path.startsWith('/api/img/') && req.method === 'GET') {
    const m = FILE_RE.exec(context.params.file ?? '');
    if (!m) return errorResponse('Not found', 404);
    const data = await store.get(m[0], { type: 'arrayBuffer' });
    if (!data) return errorResponse('Not found', 404);
    return new Response(data, {
      headers: {
        'content-type': m[3] === 'jpg' ? 'image/jpeg' : 'image/webp',
        // ids are content hashes, so a given url never changes
        'cache-control': 'public, max-age=31536000, immutable',
        'netlify-cdn-cache-control': 'public, durable, max-age=31536000, immutable',
        'access-control-allow-origin': '*',
      },
    });
  }

  if (path === '/api/upload' && req.method === 'POST') {
    const denied = await requireAuth(req);
    if (denied) return denied;
    let form: FormData;
    try { form = await req.formData(); } catch { return errorResponse('Upload failed: the files could not be read.', 400); }
    const files = {} as Record<Size, Uint8Array>;
    let ext: 'webp' | 'jpg' | null = null;
    for (const size of Object.keys(SIZES) as Size[]) {
      const f = form.get(size);
      if (!(f instanceof Blob)) return errorResponse(`Upload failed: the ${size} image is missing.`, 400);
      if (f.size > SIZES[size]) return errorResponse(`Upload failed: the ${size} image is too large.`, 413);
      const bytes = new Uint8Array(await f.arrayBuffer());
      const kind = isWebp(bytes) ? 'webp' : isJpeg(bytes) ? 'jpg' : null;
      if (!kind || (ext && kind !== ext)) return errorResponse('Upload failed: images must be WebP or JPEG.', 415);
      ext = kind;
      files[size] = bytes;
    }
    // same photo → same id, which lets the admin spot duplicates
    const id = `u-${createHash('sha256').update(files.full).digest('hex').slice(0, 16)}`;
    for (const size of Object.keys(SIZES) as Size[]) {
      await store.set(`${id}-${size}.${ext}`, files[size].slice().buffer as ArrayBuffer, { metadata: { uploaded: new Date().toISOString() } });
    }
    return json({ id, src: `/api/img/${id}-full.${ext}`, md: `/api/img/${id}-md.${ext}`, sm: `/api/img/${id}-sm.${ext}` });
  }

  return errorResponse('Not found', 404);
};

export const config: Config = { path: ['/api/upload', '/api/img/:file'] };

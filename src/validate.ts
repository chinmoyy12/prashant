// Strict validation of site content. Runs in the admin (before publishing) and on the server
// (before saving), so a bad or tampered request can never break the public site.
import { JOURNEY_SLOTS, LIMITS, type PhotoImage, type PhotoItem, type SiteContent } from './types';

const STATIC_IMG = /^photos\/work\/[a-z0-9-]+-(full|md|sm)\.webp$/;
const UPLOAD_IMG = /^\/api\/img\/u-[a-f0-9]{16}-(full|md|sm)\.(webp|jpg)$/;
const LQIP = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;
const COLOR = /^#[0-9a-f]{6}$/i;

export class ContentError extends Error {}

function str(v: unknown, max: number, field: string, required = true): string {
  if (v === undefined || v === null || v === '') {
    if (required) throw new ContentError(`${field} is required`);
    return '';
  }
  if (typeof v !== 'string') throw new ContentError(`${field} must be text`);
  const s = v.trim();
  if (s.length > max) throw new ContentError(`${field} is longer than ${max} characters`);
  return s;
}

function num(v: unknown, field: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new ContentError(`${field} is out of range`);
  return v;
}

function image(v: unknown, field: string): PhotoImage {
  if (!v || typeof v !== 'object') throw new ContentError(`${field} is missing its photo`);
  const o = v as Record<string, unknown>;
  const id = str(o.id, 64, `${field} id`);
  if (!/^[a-z0-9-]+$/.test(id)) throw new ContentError(`${field} has an invalid id`);
  const urls = ['src', 'md', 'sm'].map((k) => {
    const u = str(o[k], 200, `${field} ${k}`);
    if (!STATIC_IMG.test(u) && !UPLOAD_IMG.test(u)) throw new ContentError(`${field} has an invalid image address`);
    return u;
  });
  const lqip = str(o.lqip, 4000, `${field} preview`);
  if (!LQIP.test(lqip)) throw new ContentError(`${field} has an invalid preview`);
  const color = str(o.color, 7, `${field} colour`);
  if (!COLOR.test(color)) throw new ContentError(`${field} has an invalid colour`);
  const f = o.focus;
  if (!Array.isArray(f) || f.length !== 2) throw new ContentError(`${field} has an invalid focus point`);
  return {
    id, src: urls[0], md: urls[1], sm: urls[2],
    w: Math.round(num(o.w, `${field} width`, 1, 20000)),
    h: Math.round(num(o.h, `${field} height`, 1, 20000)),
    lqip, color,
    focus: [Math.round(num(f[0], `${field} focus`, 0, 1) * 1000) / 1000, Math.round(num(f[1], `${field} focus`, 0, 1) * 1000) / 1000],
  };
}

function item(v: unknown, field: string): PhotoItem {
  if (!v || typeof v !== 'object') throw new ContentError(`${field} is empty`);
  const o = v as Record<string, unknown>;
  const out: PhotoItem = { img: image(o.img, field), title: str(o.title, LIMITS.title, `${field} title`) };
  const type = str(o.type, LIMITS.type, `${field} subtitle`, false);
  if (type) out.type = type;
  return out;
}

function list(v: unknown, field: string, min: number, max: number): PhotoItem[] {
  if (!Array.isArray(v)) throw new ContentError(`${field} must be a list`);
  if (v.length < min || v.length > max) {
    throw new ContentError(min === max ? `${field} needs exactly ${min} photos` : `${field} needs between ${min} and ${max} photos`);
  }
  return v.map((x, i) => item(x, `${field} #${i + 1}`));
}

/** Returns a clean copy of the content, or throws ContentError with a readable message. */
export function validateContent(input: unknown): SiteContent {
  if (!input || typeof input !== 'object') throw new ContentError('Content is missing');
  const o = input as Record<string, unknown>;
  const t = (o.text ?? {}) as Record<string, unknown>;
  const j = (o.journey ?? {}) as Record<string, unknown>;
  const journey = {} as SiteContent['journey'];
  for (const slot of JOURNEY_SLOTS) journey[slot] = j[slot] ? item(j[slot], `Journey · ${slot}`) : null;
  const content: SiteContent = {
    version: typeof o.version === 'number' ? o.version : 0,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : new Date(0).toISOString(),
    text: { heroLead: str(t.heroLead, LIMITS.heroLead, 'Hero line'), aboutBody: str(t.aboutBody, LIMITS.aboutBody, 'About text') },
    journey,
    featured: list(o.featured, 'Featured', LIMITS.featured.min, LIMITS.featured.max),
    collections: list(o.collections, 'Collections', LIMITS.collections.min, LIMITS.collections.max),
    frames: list(o.frames, 'Pujo Nights', LIMITS.frames.min, LIMITS.frames.max),
  };
  // every photo may appear only once across the whole site
  const seen = new Map<string, string>();
  const check = (it: PhotoItem | null, where: string) => {
    if (!it) return;
    const prev = seen.get(it.img.id);
    if (prev) throw new ContentError(`"${it.title}" is used twice (${prev} and ${where}). Each photo can appear only once.`);
    seen.set(it.img.id, where);
  };
  JOURNEY_SLOTS.forEach((s) => check(content.journey[s], `Journey · ${s}`));
  content.featured.forEach((it) => check(it, 'Featured'));
  content.collections.forEach((it) => check(it, 'Collections'));
  content.frames.forEach((it) => check(it, 'Pujo Nights'));
  return content;
}

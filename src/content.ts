// Loads the live site content (photos, titles, text) published from the admin panel.
// Falls back to the built-in copy if the API is slow or unreachable, so the site always renders.
import defaults from './data/default-content.json';
import type { PhotoImage, PhotoItem, SiteContent } from './types';
import { validateContent } from './validate';

export type { PhotoImage, PhotoItem, SiteContent };

/** Where the content API lives. Empty = same site (Netlify). The GitHub Pages build points at Netlify. */
export const API_BASE: string = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');

export const DEFAULT_CONTENT = defaults as SiteContent;

/** Uploaded images are served by the API; built-in ones ship with the site. */
export function resolveUrl(url: string): string {
  return url.startsWith('/api/') ? `${API_BASE}${url}` : url;
}

export async function loadContent(timeoutMs = 2500): Promise<SiteContent> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/content`, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return validateContent(await res.json());
  } catch (err) {
    if (location.protocol !== 'file:') console.info('Using built-in content:', (err as Error).message);
    return DEFAULT_CONTENT;
  } finally {
    clearTimeout(timer);
  }
}

export const objectPosition = (img: PhotoImage) => `${(img.focus[0] * 100).toFixed(1)}% ${(img.focus[1] * 100).toFixed(1)}%`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
export { esc };

/** Responsive <img> with blurred preview, focus-aware cropping and lazy decoding. */
export function imgTag(img: PhotoImage, alt: string, sizes: string, extra = ''): string {
  const srcset = `${resolveUrl(img.sm)} 560w, ${resolveUrl(img.md)} 1100w, ${resolveUrl(img.src)} 2000w`;
  const style = `object-position:${objectPosition(img)};background:${img.color} url(${img.lqip}) ${objectPosition(img)}/cover no-repeat`;
  return `<img src="${resolveUrl(img.md)}" srcset="${srcset}" sizes="${sizes}" width="${img.w}" height="${img.h}" alt="${esc(alt)}" loading="lazy" decoding="async" style="${style}"${extra} />`;
}

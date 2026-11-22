// GET  /api/content  → the live site content (public, read by the website on every visit)
// PUT  /api/content  → publish new content from the admin panel (signed-in only)
import type { Config } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import defaults from '../../src/data/default-content.json' with { type: 'json' };
import { validateContent, ContentError } from '../../src/validate.ts';
import type { SiteContent } from '../../src/types.ts';
import { errorResponse, json, requireAuth } from './_shared/auth.mts';

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'content-type' };

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const store = getStore({ name: 'site', consistency: 'strong' });

  if (req.method === 'GET') {
    const stored = (await store.get('content', { type: 'json' })) as SiteContent | null;
    // no CDN caching: a published change is visible on the very next page load
    return json(stored ?? defaults, 200, CORS);
  }

  if (req.method === 'PUT') {
    const denied = await requireAuth(req);
    if (denied) return denied;
    let body: unknown;
    try { body = await req.json(); } catch { return errorResponse('The request was not valid JSON.', 400); }
    try {
      const clean = validateContent(body);
      const prev = (await store.get('content', { type: 'json' })) as SiteContent | null;
      clean.version = (prev?.version ?? (defaults as SiteContent).version) + 1;
      clean.updatedAt = new Date().toISOString();
      // keep the previous version so a mistake can be undone
      if (prev) await store.setJSON('content-previous', prev);
      await store.setJSON('content', clean);
      return json(clean);
    } catch (err) {
      if (err instanceof ContentError) return errorResponse(err.message, 422);
      throw err;
    }
  }

  return errorResponse('Method not allowed', 405);
};

export const config: Config = { path: '/api/content' };

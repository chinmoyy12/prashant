// POST /api/login     {email, password}        → {token, expires}
// GET  /api/session                            → 200 if the token is still valid
// POST /api/password  {current, next}          → {token, expires} (other sessions are signed out)
import type { Config, Context } from '@netlify/functions';
import { changePassword, checkLogin, errorResponse, issueToken, json, requireAuth } from './_shared/auth.mts';

export default async (req: Request, context: Context) => {
  const path = new URL(req.url).pathname;

  if (path === '/api/login' && req.method === 'POST') {
    let body: { email?: unknown; password?: unknown };
    try { body = await req.json(); } catch { return errorResponse('The request was not valid JSON.', 400); }
    if (typeof body.email !== 'string' || typeof body.password !== 'string' || body.password.length > 200) {
      return errorResponse('Enter your email and password.', 400);
    }
    const result = await checkLogin(body.email, body.password, context.ip);
    if (!result.ok) return errorResponse(result.message, result.status);
    return json(await issueToken());
  }

  if (path === '/api/session' && req.method === 'GET') {
    const denied = await requireAuth(req);
    return denied ?? json({ ok: true });
  }

  if (path === '/api/password' && req.method === 'POST') {
    const denied = await requireAuth(req);
    if (denied) return denied;
    let body: { current?: unknown; next?: unknown };
    try { body = await req.json(); } catch { return errorResponse('The request was not valid JSON.', 400); }
    if (typeof body.current !== 'string' || typeof body.next !== 'string' || body.next.length > 200) {
      return errorResponse('Enter your current and new password.', 400);
    }
    const problem = await changePassword(body.current, body.next);
    if (problem) return errorResponse(problem, 400);
    return json(await issueToken());
  }

  return errorResponse('Not found', 404);
};

export const config: Config = { path: ['/api/login', '/api/session', '/api/password'] };

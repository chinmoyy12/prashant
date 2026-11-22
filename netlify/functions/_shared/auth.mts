// Shared auth helpers for the admin API.
// Credentials live in Netlify environment variables, never in the repository:
//   ADMIN_EMAIL           login email
//   ADMIN_PASSWORD_HASH   scrypt$<saltB64>$<hashB64>  (a changed password is stored in Blobs instead)
//   SESSION_SECRET        random secret used to sign session tokens
import { createHmac, randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const SESSION_HOURS = 12;
const MAX_FAILS = 8;
const LOCK_MINUTES = 15;

export const authStore = () => getStore({ name: 'auth', consistency: 'strong' });

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

export const errorResponse = (message: string, status: number) => json({ error: message }, status);

function env(name: string): string {
  const v = Netlify.env.get(name);
  if (!v) throw new Error(`Server is missing the ${name} setting`);
  return v;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyHash(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function currentHash(): Promise<string> {
  const changed = await authStore().get('password-hash', { type: 'text' });
  return changed ?? env('ADMIN_PASSWORD_HASH');
}

async function tokenVersion(): Promise<number> {
  const v = await authStore().get('token-version', { type: 'text' });
  return v ? Number(v) : 1;
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const sign = (data: string) => createHmac('sha256', env('SESSION_SECRET')).update(data).digest('base64url');

export async function issueToken(): Promise<{ token: string; expires: number }> {
  const expires = Date.now() + SESSION_HOURS * 3600_000;
  const payload = b64url(JSON.stringify({ sub: env('ADMIN_EMAIL').toLowerCase(), exp: expires, tv: await tokenVersion() }));
  return { token: `${payload}.${sign(payload)}`, expires };
}

/** Returns null when the request carries a valid session, otherwise a 401 response. */
export async function requireAuth(req: Request): Promise<Response | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return errorResponse('Please sign in again.', 401);
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return errorResponse('Please sign in again.', 401);
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp: number; tv: number; sub: string };
    if (data.exp < Date.now()) return errorResponse('Your session expired. Please sign in again.', 401);
    if (data.tv !== (await tokenVersion())) return errorResponse('Please sign in again.', 401);
    if (data.sub !== env('ADMIN_EMAIL').toLowerCase()) return errorResponse('Please sign in again.', 401);
  } catch {
    return errorResponse('Please sign in again.', 401);
  }
  return null;
}

const ipKey = (ip: string) => `fail-${createHash('sha256').update(ip || 'unknown').digest('hex').slice(0, 24)}`;

/** Checks email + password with a lockout after repeated failures. */
export async function checkLogin(email: string, password: string, ip: string): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const store = authStore();
  const key = ipKey(ip);
  const rec = ((await store.get(key, { type: 'json' })) as { count: number; until: number } | null) ?? { count: 0, until: 0 };
  if (rec.until > Date.now()) {
    const mins = Math.ceil((rec.until - Date.now()) / 60000);
    return { ok: false, status: 429, message: `Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.` };
  }
  const emailOk = email.trim().toLowerCase() === env('ADMIN_EMAIL').toLowerCase();
  const passOk = verifyHash(password, await currentHash()); // always run, so timing doesn't reveal the email
  if (emailOk && passOk) {
    if (rec.count) await store.delete(key);
    return { ok: true };
  }
  const count = rec.count + 1;
  await store.setJSON(key, { count: count >= MAX_FAILS ? 0 : count, until: count >= MAX_FAILS ? Date.now() + LOCK_MINUTES * 60000 : 0 });
  return { ok: false, status: 401, message: 'Email or password is incorrect.' };
}

export async function changePassword(current: string, next: string): Promise<string | null> {
  if (!verifyHash(current, await currentHash())) return 'Your current password is incorrect.';
  if (next.length < 8) return 'Use at least 8 characters for the new password.';
  const store = authStore();
  await store.set('password-hash', hashPassword(next));
  await store.set('token-version', String((await tokenVersion()) + 1)); // signs out other sessions
  return null;
}

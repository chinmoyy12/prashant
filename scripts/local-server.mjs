// Local stand-in for Netlify: serves dist/ and runs the real functions in netlify/functions
// against Netlify's official Blobs emulator. Used for end-to-end testing without `netlify dev`.
// Usage: npm run build && node scripts/local-server.mjs [port]   (reads credentials from .env)
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, createReadStream } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { BlobsServer } from '@netlify/blobs/server';

const PORT = Number(process.argv[2] ?? 8888);
const ROOT = resolve('dist');

// env from .env
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
globalThis.Netlify = { env: { get: (k) => process.env[k], has: (k) => k in process.env } };

// Blobs emulator
const blobs = new BlobsServer({ directory: process.env.BLOBS_DIR ?? '.netlify/local-blobs', token: 'local-token', port: 0 });
const { port: blobsPort } = await blobs.start();
const edge = `http://localhost:${blobsPort}`;
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({ edgeURL: edge, uncachedEdgeURL: edge, siteID: 'local-site', token: 'local-token' })).toString('base64');

// bundle + load functions
const fnDir = 'netlify/functions';
const entries = readdirSync(fnDir).filter((f) => f.endsWith('.mts')).map((f) => join(fnDir, f));
await build({ entryPoints: entries, bundle: true, platform: 'node', format: 'esm', outdir: '.netlify/local-fns', outExtension: { '.js': '.mjs' }, packages: 'external', logLevel: 'warning' });
const routes = [];
for (const e of entries) {
  const name = e.split('/').pop().replace('.mts', '.mjs');
  const mod = await import(pathToFileURL(resolve('.netlify/local-fns', name)).href + `?t=${Date.now()}`);
  for (const p of [mod.config.path].flat()) {
    const keys = [];
    const re = new RegExp('^' + p.replace(/:([a-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ re, keys, handler: mod.default });
  }
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = routes.find((r) => r.re.test(url.pathname));
  if (route) {
    const m = route.re.exec(url.pathname);
    const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks);
    try {
      const response = await route.handler(new Request(url, { method: req.method, headers: req.headers, body }), { ip: req.socket.remoteAddress ?? '127.0.0.1', params });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server error' }));
    }
    return;
  }
  let file = join(ROOT, decodeURIComponent(url.pathname));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Local site + API on http://localhost:${PORT} (blobs emulator on ${blobsPort})`));

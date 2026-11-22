// Fails the build if any portfolio photo is used more than once, or if a referenced
// image file is missing. Run: npm run check (also runs before every build).
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const content = readFileSync('src/content.ts', 'utf8');
const errors = [];
const placements = [];

// index.html: every <figure data-lightbox> is one placement
for (const m of html.matchAll(/data-lightbox="photos\/work\/([^"]+)\.jpg"/g)) placements.push({ name: m[1], where: 'index.html' });
// content.ts: every work('name', ...) call is one placement
for (const m of content.matchAll(/work\('([^']+)'/g)) placements.push({ name: m[1], where: 'src/content.ts' });

const seen = new Map();
for (const p of placements) {
  if (seen.has(p.name)) errors.push(`"${p.name}" is used twice (${seen.get(p.name)} and ${p.where})`);
  else seen.set(p.name, p.where);
  for (const f of [`public/photos/work/${p.name}.jpg`, `public/photos/work/sm/${p.name}.jpg`]) {
    if (!existsSync(f)) errors.push(`missing file ${f}`);
  }
}
// any other image referenced from the page must exist
for (const m of html.matchAll(/(?:src|content)="(photos\/[^"]+)"/g)) {
  if (!existsSync(`public/${m[1]}`)) errors.push(`index.html references missing public/${m[1]}`);
}

if (errors.length) {
  console.error('Photo check failed:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log(`Photo check passed: ${placements.length} photos, each used once, all files present.`);

// Fails the build if the built-in content uses a photo more than once, or references a missing file.
// (Content published from the admin panel is checked the same way by the server before it is saved.)
// Run: npm run check — also runs before every build.
import { readFileSync, existsSync } from 'node:fs';

const content = JSON.parse(readFileSync('src/data/default-content.json', 'utf8'));
const items = [
  ...Object.entries(content.journey).filter(([, v]) => v).map(([k, v]) => [`Journey · ${k}`, v]),
  ...content.featured.map((v) => ['Featured', v]),
  ...content.collections.map((v) => ['Collections', v]),
  ...content.frames.map((v) => ['Pujo Nights', v]),
];
const errors = [];
const seen = new Map();
for (const [where, it] of items) {
  const id = it.img.id;
  if (seen.has(id)) errors.push(`"${id}" is used twice (${seen.get(id)} and ${where})`);
  else seen.set(id, where);
  for (const key of ['src', 'md', 'sm']) {
    const url = it.img[key];
    if (!url.startsWith('/api/') && !existsSync(`public/${url}`)) errors.push(`missing file public/${url} (${where})`);
  }
}
const html = readFileSync('index.html', 'utf8');
for (const m of html.matchAll(/(?:src|href|content)="(photos\/[^"]+)"/g)) {
  if (!existsSync(`public/${m[1]}`)) errors.push(`index.html references missing public/${m[1]}`);
}
if (errors.length) {
  console.error('Photo check failed:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log(`Photo check passed: ${items.length} photos, each used once, all files present.`);

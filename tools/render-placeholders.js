// Renders tools/placeholders.html scenes into assets/photos/*.jpg (+ profile.png)
// Usage: node tools/render-placeholders.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const out = path.join(__dirname, '..', 'assets', 'photos');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => { console.error('page error', e); process.exitCode = 1; });
  await page.goto('file://' + path.join(__dirname, 'placeholders.html'));
  const names = await page.evaluate(() => window.sceneNames);
  for (const n of names) {
    const data = await page.evaluate(n => window.render(n), n);
    const ext = n === 'profile' ? 'png' : 'jpg';
    fs.writeFileSync(path.join(out, `${n}.${ext}`), Buffer.from(data.split(',')[1], 'base64'));
    console.log('wrote', n);
  }
  await browser.close();
})();

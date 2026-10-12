// Captures README screenshots from a running site. Start one first (npm run dev, or npm run preview), then:
//   node scripts/screenshots.mjs [baseUrl]      default http://localhost:3000
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const shots = [['library', '/'], ['dice', '/play/dice/?autostart=1&s=%7B%22decisionTime%22%3A0%7D'], ['options-sim', '/play/options-sim/?autostart=1&s=%7B%22tickMs%22%3A0%7D'], ['cube-folding', '/play/cube-folding/?autostart=1'], ['assessment', '/assessment/'], ['stats', '/stats/']];
mkdirSync('docs/screenshots', { recursive: true });
const browser = await chromium.launch();
for (const [label, opts] of [['desktop', { viewport: { width: 1280, height: 860 } }], ['mobile', devices['Pixel 7']]]) {
  const page = await browser.newPage(opts);
  for (const [name, path] of shots) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `docs/screenshots/${name}-${label}.png` });
  }
  await page.close();
}
await browser.close();
console.log('Saved screenshots to docs/screenshots/');

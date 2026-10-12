/**
 * Observes ONE free (Easy, logged-out) session of a game by sampling the DOM while you play or while it idles.
 * Usage:  HEADED=1 GAME=dice npm run investigate -- -g "observe session"
 *   - With HEADED=1 you play in the visible browser; the script records snapshots every SAMPLE_MS for DURATION_S.
 *   - It clicks a "Start"/"Play" button only if one is visible. It never logs in or changes difficulty.
 * Output: investigation/output/<id>/session-<timestamp>/snap-NNN.txt (+ .png every 5th sample).
 */
import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ORIGIN, TARGETS } from './targets';
import { disallowedPrefixes, isAllowed } from './robots';

test('observe session', async ({ page }) => {
  const id = process.env.GAME ?? 'dice';
  const t = TARGETS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown GAME ${id}`);
  const disallowed = await disallowedPrefixes(ORIGIN);
  if (!isAllowed(t.path, disallowed)) throw new Error(`robots.txt disallows ${t.path}`);
  const duration = Number(process.env.DURATION_S ?? 90), sample = Number(process.env.SAMPLE_MS ?? 1000);
  test.setTimeout((duration + 60) * 1000);
  const dir = join('investigation/output', id, `session-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  await page.goto(ORIGIN + t.path, { waitUntil: 'networkidle' });
  const start = page.getByRole('button', { name: /^(start|play)/i }).first();
  if (await start.isVisible().catch(() => false)) await start.click();
  const net: string[] = [];
  page.on('request', (r) => { if (['xhr', 'fetch'].includes(r.resourceType())) net.push(`${r.method()} ${r.url()}`); });
  for (let i = 0; i * sample < duration * 1000; i++) {
    writeFileSync(join(dir, `snap-${String(i).padStart(3, '0')}.txt`), await page.locator('body').innerText().catch(() => ''));
    if (i % 5 === 0) await page.screenshot({ path: join(dir, `snap-${String(i).padStart(3, '0')}.png`) });
    await page.waitForTimeout(sample);
  }
  // Request URLs are logged only to understand timing/flow. Do not call private endpoints directly.
  writeFileSync(join(dir, 'network.txt'), net.join('\n'));
});

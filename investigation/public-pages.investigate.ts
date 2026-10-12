/**
 * Captures each public game page: visible text (rules, settings, defaults), form controls and a screenshot.
 * Read-only: no login, no form submission, no paywalled tiers. Run: npm run investigate -- -g "public pages"
 */
import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ORIGIN, POLITE_DELAY_MS, TARGETS } from './targets';
import { disallowedPrefixes, isAllowed } from './robots';

const OUT = 'investigation/output';

test('public pages', async ({ page }) => {
  test.setTimeout(TARGETS.length * 60_000);
  const disallowed = await disallowedPrefixes(ORIGIN);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'robots-disallowed.json'), JSON.stringify(disallowed, null, 2));
  const only = process.env.ONLY?.split(',');
  for (const t of TARGETS) {
    if (only && !only.includes(t.id)) continue;
    const dir = join(OUT, t.id);
    mkdirSync(dir, { recursive: true });
    if (!isAllowed(t.path, disallowed)) { writeFileSync(join(dir, 'SKIPPED.txt'), `Disallowed by robots.txt: ${t.path}\n`); continue; }
    const resp = await page.goto(ORIGIN + t.path, { waitUntil: 'networkidle' });
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({ url: page.url(), status: resp?.status(), capturedAt: new Date().toISOString() }, null, 2));
    writeFileSync(join(dir, 'page.txt'), await page.locator('body').innerText());
    const controls = await page.evaluate(() => Array.from(document.querySelectorAll('button, input, select, [role=slider], [role=switch], [role=tab]')).map((el) => ({
      tag: el.tagName.toLowerCase(), role: el.getAttribute('role'), type: el.getAttribute('type'), name: el.getAttribute('name'),
      label: (el.getAttribute('aria-label') || (el as HTMLElement).innerText || '').trim().slice(0, 80),
      value: (el as HTMLInputElement).value ?? null, disabled: (el as HTMLButtonElement).disabled ?? false,
      options: el.tagName === 'SELECT' ? Array.from((el as HTMLSelectElement).options).map((o) => o.text) : undefined,
    })));
    writeFileSync(join(dir, 'controls.json'), JSON.stringify(controls, null, 2));
    await page.screenshot({ path: join(dir, 'page.png'), fullPage: true });
    await page.waitForTimeout(POLITE_DELAY_MS);
  }
});

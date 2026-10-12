import { test, expect } from '@playwright/test';
import { p } from './base';

test('library lists every activity and filters', async ({ page }) => {
  await page.goto(p('/'));
  await expect(page.locator('[data-testid^=game-]')).toHaveCount(51);
  await page.getByRole('button', { name: /Cognitive/ }).click();
  await expect(page.locator('[data-testid^=game-]')).toHaveCount(13);
  await page.getByRole('button', { name: /^All/ }).click();
  await page.keyboard.press('/');
  await page.keyboard.type('Sweet Spot');
  await expect(page.locator('[data-testid^=game-]')).toHaveCount(1);
});

test('difficulty presets, custom settings and start from setup', async ({ page }) => {
  await page.goto(p('/play/dice'));
  await page.getByRole('button', { name: 'hard' }).click();
  await expect(page.getByRole('spinbutton').first()).toHaveValue('5');
  await page.getByRole('spinbutton').first().fill('5');
  await expect(page.getByRole('button', { name: 'custom' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('start').click();
  await expect(page.getByTestId('dice').locator('> div')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start')).toBeVisible();
});

test('practice mode removes optional timers', async ({ page }) => {
  await page.goto(p('/play/math'));
  await page.getByRole('radio', { name: 'practice' }).click();
  await page.getByTestId('start').click();
  await expect(page.getByLabel('Time remaining')).toHaveCount(0);
});

test('theme toggle persists', async ({ page }) => {
  await page.goto(p('/'));
  const btn = page.getByRole('button', { name: 'Change theme' });
  await btn.click(); await btn.click(); // system → light → dark
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('mistakes appear in review and stats chart a session', async ({ page }) => {
  await page.goto(p(`/play/math?${new URLSearchParams({ s: JSON.stringify({ duration: 0, questions: 1 }), autostart: '1' })}`));
  await page.getByTestId('answer-input').fill('-987654');
  await page.getByTestId('answer-input').press('Enter');
  await expect(page.getByTestId('results')).toBeVisible();
  await page.goto(p('/review'));
  await expect(page.getByText('-987654')).toBeVisible();
  await page.goto(p('/stats'));
  await expect(page.getByText('Score history')).toBeVisible();
});

test('custom session runs two drills back to back', async ({ page }) => {
  await page.goto(p('/session'));
  await page.getByRole('button', { name: 'Fractions to Decimals' }).click();
  await page.getByRole('button', { name: 'Cube Folding' }).click();
  await page.getByRole('button', { name: /Start 2 drills/ }).click();
  await expect(page.getByText('Drill 1 of 2')).toBeVisible();
});

test('daily challenge lists three drills without hydration errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(p('/daily'));
  await expect(page.locator('ol li')).toHaveCount(3);
  expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);
});

test('library shows every activity including assessments and simulators', async ({ page }) => {
  await page.goto(p('/'));
  const n = await page.locator('[data-testid^=game-]').count();
  expect(n).toBeGreaterThanOrEqual(51);
  await expect(page.getByTestId('game-options-sim')).toBeVisible();
  await expect(page.getByTestId('game-oa-hard-six')).toBeVisible();
});

test('every difficulty, including Custom, is selectable with no lock', async ({ page }) => {
  await page.goto(p('/play/oa-math-80'));
  for (const d of ['easy', 'medium', 'hard', 'custom']) {
    await page.getByRole('button', { name: d, exact: true }).click();
    await expect(page.getByRole('button', { name: d, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.getByText(/upgrade|subscribe|unlock/i)).toHaveCount(0);
});

test('custom interview battery runs two sections and shows an overall score', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(p('/assessment'));
  await page.getByRole('spinbutton').first().fill('5');
  await page.getByRole('button', { name: 'Bet Grid' }).click();
  await page.getByRole('button', { name: 'Cube Folding' }).click();
  await page.getByRole('button', { name: /Use 2 sections/ }).click();
  await page.getByTestId('start-battery').click();
  await page.keyboard.press('g'); // global shortcut must not leave a running assessment
  await expect(page.getByText('Drill 1 of 2')).toBeVisible();
  // 5 minutes → 2.5 min per section: Bet Grid gets 3 rounds, Cube Folding 6 questions.
  await page.waitForTimeout(500);
  for (let i = 0; i < 20 && !(await page.getByRole('button', { name: /^Next:/ }).count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(120); }
  await page.getByRole('button', { name: /^Next:/ }).click();
  await page.waitForTimeout(500);
  for (let i = 0; i < 20 && !(await page.getByTestId('battery-results').count()); i++) { await page.keyboard.press('1'); await page.waitForTimeout(80); await page.keyboard.press('Enter'); await page.waitForTimeout(120); }
  await expect(page.getByTestId('battery-results')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('overall')).toContainText('/100');
});

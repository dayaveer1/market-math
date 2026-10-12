import { test, expect } from '@playwright/test';
import { p } from './base';
import { SCENARIOS } from './scenarios';

for (const [name, sc] of Object.entries(SCENARIOS)) {
  test(`plays ${name} to the results screen and saves progress`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const q = new URLSearchParams({ s: JSON.stringify(sc.s), seed: '11', autostart: '1' });
    await page.goto(p(`/play/${sc.game}?${q}`));
    await page.waitForTimeout(400); // dynamic import of the game chunk
    await sc.run(page);
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 10_000 });
    const score = await page.getByTestId('final-score').innerText();
    expect(score.trim().length).toBeGreaterThan(0);
    expect(score).not.toContain('NaN');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('floorwork:v1') ?? '{}'));
    expect(saved.state.records.at(-1).gameId).toBe(sc.game);
    if (sc.expectMistakes) expect(saved.state.mistakes.length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}

test('restart from results with R starts a fresh session', async ({ page }) => {
  await page.goto(p(`/play/math?${new URLSearchParams({ s: JSON.stringify({ duration: 1, questions: 0 }), autostart: '1' })}`));
  await expect(page.getByTestId('results')).toBeVisible({ timeout: 5000 });
  await page.keyboard.press('r');
  await expect(page.getByTestId('quiz')).toBeVisible();
});

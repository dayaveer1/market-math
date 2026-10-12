/**
 * GitHub Pages behaviour. Meaningful against the static export (playwright.static.config.ts), but also safe on `npm run dev`.
 */
import { test, expect } from '@playwright/test';
import { BASE, p } from './base';
import { GAMES } from '../../src/lib/registry';

const PAGES = ['/', '/assessment/', '/stats/', '/review/', '/session/', '/daily/'];

test('every top-level page loads directly and survives a refresh', async ({ page }) => {
  for (const path of PAGES) {
    const res = await page.goto(p(path));
    expect(res?.status(), path).toBeLessThan(400);
    await expect(page.getByRole('link', { name: 'Floorwork' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('link', { name: 'Floorwork' })).toBeVisible();
  }
});

test('all 51 activity pages load directly and after refresh', async ({ page }) => {
  test.setTimeout(240_000);
  expect(GAMES.length).toBe(51);
  for (const g of GAMES) {
    const res = await page.goto(p(`/play/${g.id}/`));
    expect(res?.status(), g.id).toBeLessThan(400);
    await expect(page.getByTestId('start'), g.id).toBeVisible();
    await expect(page.getByRole('heading', { name: g.name })).toBeVisible();
  }
  await page.reload();
  await expect(page.getByTestId('start')).toBeVisible();
});

test('a URL without the trailing slash still reaches the page', async ({ page }) => {
  await page.goto(p('/stats'));
  await expect(page).toHaveURL(new RegExp(`${BASE}/stats/?$`));
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
});

test('header navigation keeps the base path', async ({ page }) => {
  await page.goto(p('/'));
  for (const [name, path] of [['Progress', '/stats'], ['Interview assessment', '/assessment'], ['Daily', '/daily'], ['Library', '/']] as const) {
    await page.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${BASE}${path === '/' ? '/?$' : path + '/?$'}`));
  }
  await page.locator('[data-testid=game-dice]').click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/play/dice/?$`));
  await expect(page.getByTestId('start')).toBeVisible();
});

test('unknown pages show the 404 page', async ({ page }) => {
  const res = await page.goto(p('/no-such-page/'));
  if (BASE) expect(res?.status()).toBe(404);
  await expect(page.getByText('Page not found')).toBeVisible();
  await page.getByRole('link', { name: 'Go to the library' }).click();
  await expect(page.locator('[data-testid^=game-]').first()).toBeVisible();
});

test('progress persists across refreshes and direct loads', async ({ page }) => {
  await page.goto(p(`/play/fractions/?${new URLSearchParams({ s: JSON.stringify({ duration: 0, questions: 1 }), autostart: '1' })}`));
  await page.getByTestId('answer-input').fill('-5');
  await page.getByTestId('answer-input').press('Enter');
  await expect(page.getByTestId('results')).toBeVisible();
  await page.reload();
  await page.goto(p('/stats/'));
  await expect(page.getByText('Score history')).toBeVisible();
  await page.goto(p('/review/'));
  await expect(page.getByText('-5')).toBeVisible();
});

test('daily challenge uses the visitor’s date, not the build date', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2031-02-03T10:00:00'));
  await page.goto(p('/daily/'));
  await expect(page.getByRole('heading', { name: /2031-02-03/ })).toBeVisible();
});

test('pages fit the viewport without horizontal scrolling', async ({ page }) => {
  for (const path of [...PAGES, '/play/options-sim/', '/play/cube-folding/']) {
    await page.goto(p(path));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});

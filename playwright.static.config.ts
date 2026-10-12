import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against the STATIC EXPORT, served the way GitHub Pages serves it, under the base path from site.config.json
 * (e.g. /market-math/). Build first with the test hook: `npm run test:static` does both steps.
 */
const base = (JSON.parse(readFileSync('site.config.json', 'utf8')).basePath ?? '').replace(/\/$/, '');
process.env.E2E_BASE_PATH ??= base;
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: { command: 'node scripts/serve-out.mjs --port 4173', url: `http://localhost:4173${base}/`, reuseExistingServer: !process.env.CI, timeout: 30_000 },
});

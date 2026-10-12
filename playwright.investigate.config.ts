import { defineConfig, devices } from '@playwright/test';

/**
 * Investigation harness for the PUBLIC, logged-out pages of the reference site (Phase 1).
 * Single worker, polite delays, no login, no paywalled tiers. Output goes to investigation/output/.
 */
export default defineConfig({
  testDir: './investigation',
  testMatch: /.*\.investigate\.ts/,
  timeout: 180_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'], headless: process.env.HEADED ? false : true, trace: 'retain-on-failure', screenshot: 'off' },
});

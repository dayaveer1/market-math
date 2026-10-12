import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against the STATIC EXPORT served like GitHub Pages under /floorwork/.
 * Build first with the test hook: `node scripts/build-static.mjs --base /floorwork --e2e` (npm run test:static does both).
 */
process.env.E2E_BASE_PATH ??= '/floorwork';
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
  webServer: { command: 'node scripts/serve-out.mjs --base /floorwork --port 4173', url: 'http://localhost:4173/floorwork/', reuseExistingServer: !process.env.CI, timeout: 30_000 },
});

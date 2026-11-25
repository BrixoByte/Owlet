import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

// The public site lives in /site (one level above /qa). The app itself
// is served at /playground/ — specs must goto('/playground/') for it.
const APP_ROOT = path.resolve(__dirname, '..', 'site');
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './specs',
  testIgnore: ['**/_archive/**', '**/screenshots.spec.ts'],
  outputDir: './report/test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  // Rule 8 of the brief: rerun failures up to 2 times; a pass after a fail = FLAKY.
  retries: 2,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'report/html', open: 'never' }],
    ['json', { outputFile: 'report/results.json' }],
    ['junit', { outputFile: 'report/junit.xml' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  webServer: {
    command: `node scripts/serve.mjs "${APP_ROOT}" ${PORT}`,
    cwd: __dirname,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } },
    },
  ],
});

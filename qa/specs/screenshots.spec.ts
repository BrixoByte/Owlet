import { test, expect } from '@playwright/test';
import { statSync } from 'node:fs';
import path from 'node:path';

// Regenerates the README screenshot and the landing og-image from the real app.
// Skipped in normal runs; use `npm run screenshots` (sets SCREENSHOTS=1).
// Writes: assets/screenshot.png (1280x800) and landing/assets/og-image.png (1200x630).
// Both must stay under 400 KB (asserted below).

const REPO = path.resolve(__dirname, '..', '..');
const MAX_BYTES = 400 * 1024;

test.describe('regenerate images @screenshots', () => {
  test.skip(!process.env.SCREENSHOTS, 'run with: npm run screenshots');
  test.use({ colorScheme: 'dark' });

  test('README screenshot: dark theme, sample project, preview visible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('owlet:ui:prefs', JSON.stringify({ theme: 'dark' })));
    await page.reload();
    await page.getByTestId('welcome').getByTestId('welcome-card').filter({ hasText: /New project/ }).click();
    await expect(page.locator('.CodeMirror-code').first()).toContainText('Hello, Owlet!');
    await expect(page.getByTestId('preview').contentFrame().locator('h1')).toHaveText('Hello, Owlet!');
    await page.mouse.move(0, 0);

    const out = path.join(REPO, 'assets', 'screenshot.png');
    await page.screenshot({ path: out });
    expect(statSync(out).size, 'screenshot.png size').toBeLessThan(MAX_BYTES);
  });

  test('landing og-image: 1200x630 hero', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 630 });
    await page.goto('/landing/index.html');
    await page.evaluate(() => localStorage.setItem('owlet-landing-theme', 'dark'));
    await page.reload();
    await expect(page.locator('h1')).toBeVisible();

    const out = path.join(REPO, 'landing', 'assets', 'og-image.png');
    await page.screenshot({ path: out });
    expect(statSync(out).size, 'og-image.png size').toBeLessThan(MAX_BYTES);
  });
});

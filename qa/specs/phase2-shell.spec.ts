import { test, expect } from '../fixtures/collector';

// Phase 2 smoke: first load and shell. Tagged @smoke so `npm run test:smoke` runs it.

test.describe('first load @smoke', () => {
  test('welcome screen renders with the three start cards and no Owlet console errors', async ({ page, collector }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Owlet/);

    const welcome = page.locator('#welcome');
    await expect(welcome).toBeVisible();
    await expect(welcome.getByRole('button', { name: /Open folder/ })).toBeVisible();
    await expect(welcome.getByRole('button', { name: /New project/ })).toBeVisible();
    await expect(welcome.getByRole('button', { name: /Clone repository/ })).toBeVisible();

    const ownErrors = collector.findings.filter((f) =>
      ['console-error', 'pageerror', 'requestfailed', 'http-error'].includes(f.kind));
    expect(ownErrors, 'console/page errors on first load').toEqual([]);
  });

  test('"New project" card leaves the welcome screen and opens an editor', async ({ page }) => {
    await page.goto('/');
    await page.locator('#welcome').getByRole('button', { name: /New project/ }).click();
    await expect(page.locator('#welcome')).toBeHidden();
    await expect(page.locator('.CodeMirror').first()).toBeVisible();
  });
});

import { test, expect } from '../fixtures/collector';

// Landing render check (KI-2): the page renders, shows no console errors, and
// no user-visible text mentions split view.

test.describe('landing render @landing', () => {
  test('landing renders with no console errors and no split-view copy', async ({ page, collector }) => {
    await page.goto('/');
    await expect(page.locator('#hero-title')).toBeVisible();
    await expect(page.locator('.hero-eyebrow')).toContainText('v0.1 beta');
    const text = (await page.locator('body').innerText()).toLowerCase();
    expect(text).not.toContain('split view');
    expect(text).not.toContain('side by side');
    expect(collector.findings.filter((f) => f.kind === 'console-error')).toEqual([]);
  });
});

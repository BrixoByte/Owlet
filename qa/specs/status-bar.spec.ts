import { test, expect } from '../fixtures/collector';
import { openEmptyProject, openProjectWithFile } from '../fixtures/helpers';

// QA-014: the bottom status bar is restored. Cursor, selection, indentation and language
// are real readouts of the active editor; preview-labelled controls show the honest notice.

// Show the Explorer (the rail button toggles it, so it is only clicked when closed).
async function openExplorer(page: import('@playwright/test').Page) {
  const rail = page.locator('button.rail-btn[data-view="explorer"]');
  if ((await rail.getAttribute('aria-pressed')) !== 'true') await rail.click();
}

test.describe('status bar @statusbar', () => {
  test('every status item is present with a data-testid', async ({ page }) => {
    await openEmptyProject(page);
    const bar = page.getByTestId('status-bar');
    await expect(bar).toBeVisible();
    for (const id of ['sb-branch', 'sb-sync', 'connection', 'sb-sandbox', 'sb-ai', 'sb-errors', 'sb-warnings',
      'sb-cursor', 'sb-selection', 'sb-indent', 'sb-lang', 'collab', 'sb-bell']) {
      await expect(bar.getByTestId(id), id).toHaveCount(1);
    }
  });

  test('Ln/Col updates while typing', async ({ page, collector }) => {
    await openProjectWithFile(page, 'index.html');
    await page.locator('.CodeMirror').first().click();
    await expect(page.getByTestId('sb-cursor')).toHaveText('Ln 1, Col 1');
    await page.keyboard.type('abc');
    await expect(page.getByTestId('sb-cursor')).toHaveText('Ln 1, Col 4');
    await page.keyboard.press('Enter');
    await page.keyboard.type('de');
    await expect(page.getByTestId('sb-cursor')).toHaveText('Ln 2, Col 3');
    expect(collector.findings.filter((f) => f.kind === 'console-error')).toEqual([]);
  });

  test('language shows the active file mode', async ({ page }) => {
    await openEmptyProject(page);
    await expect(page.getByTestId('sb-lang')).toHaveText('HTML');
    await openExplorer(page);
    await page.getByTestId('tree-item').filter({ hasText: 'style.css' }).click();
    await expect(page.getByTestId('sb-lang')).toHaveText('CSS');
    await page.getByTestId('tree-item').filter({ hasText: 'script.js' }).click();
    await expect(page.getByTestId('sb-lang')).toHaveText('JavaScript');
  });

  test('language picker changes the active editor mode', async ({ page }) => {
    await openEmptyProject(page);
    await page.getByTestId('sb-lang').click();
    await page.getByRole('menuitemcheckbox', { name: 'CSS' }).click();
    await expect(page.getByTestId('sb-lang')).toHaveText('CSS');
  });

  test('preview-labelled items show the not-connected notice', async ({ page, collector }) => {
    await openEmptyProject(page);
    await expect(page.getByTestId('sb-bell')).toContainText('Preview');
    await expect(page.getByTestId('sb-branch')).toContainText('Preview');
    await page.getByTestId('sb-bell').click();
    await expect(page.locator('.toast').filter({ hasText: 'Notifications center: not connected yet.' })).toBeVisible();
    await page.getByTestId('sb-branch').click();
    await expect(page.locator('.toast').filter({ hasText: 'Branch switcher: not connected yet.' })).toBeVisible();
    await page.getByTestId('share-chip').click();
    await expect(page.locator('.toast').filter({ hasText: 'Invite and share links: not connected yet.' })).toBeVisible();
    expect(collector.findings.filter((f) => f.kind === 'console-error')).toEqual([]);
  });
});

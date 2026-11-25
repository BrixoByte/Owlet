import { test, expect, type Page } from '../fixtures/collector';
import { openEmptyProject, openProjectWithFile, createFile } from '../fixtures/helpers';

// Phase 1 (QA-008): restore the last project on reload, keep tabs, active tab and
// cursor, honour "Close project", and survive corrupt or blocked storage.

// Read the active CodeMirror instance (internal check, used only to assert cursor position).
async function activeCursorLine(page: Page): Promise<number> {
  return page.evaluate(() => (document.querySelector('.CodeMirror') as any).CodeMirror.getCursor().line);
}

test.describe('session restore @session', () => {
  test('restores multiple tabs, the active tab and the cursor line after reload', async ({ page }) => {
    await openProjectWithFile(page, 'index.html');
    await page.locator('.CodeMirror').first().click();
    await page.keyboard.type('one');
    await page.keyboard.press('Escape');            // close the autocomplete popup before Enter
    await page.keyboard.press('Enter');
    await page.keyboard.type('two');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');
    await page.keyboard.type('three');
    await page.keyboard.press('Escape');            // close the autocomplete popup so ArrowUp moves the text cursor
    await page.keyboard.press('ArrowUp');           // cursor now on line 2 (index 1)
    await createFile(page, 'style.css');
    await page.locator('.CodeMirror').first().click();
    await page.keyboard.type('p { color: red; }');
    await page.keyboard.press('Control+s');
    await page.reload();

    await expect(page.locator('.tab', { hasText: 'index.html' })).toBeVisible();
    await expect(page.locator('.tab', { hasText: 'style.css' })).toBeVisible();
    await expect(page.locator('.CodeMirror-code').first()).toContainText('p { color: red; }');
    await page.locator('.tab', { hasText: 'index.html' }).click();
    await expect(page.locator('.CodeMirror-code').first()).toContainText('three');
    const stored = await page.evaluate(() => localStorage.getItem('owlet.cursors.v1') + ' | project: ' + localStorage.getItem('owlet:project:Untitled project'));
    expect(await activeCursorLine(page), 'stored cursors: ' + stored).toBe(1);
  });

  test('explicit Close project keeps the copy in Recent and does not reopen on reload', async ({ page }) => {
    await openProjectWithFile(page, 'index.html');
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Close project' }).click();
    await page.reload();

    await expect(page.locator('#welcome')).toBeVisible();
    await expect(page.locator('#welcome-recent')).toContainText('Untitled project');
  });

  test('corrupted session storage falls back to Welcome without console errors', async ({ page, collector }) => {
    await openProjectWithFile(page, 'index.html');
    await page.evaluate(() => {
      localStorage.setItem('owlet.cursors.v1', '{not json');
      localStorage.setItem('owlet.splitlayout.v1', '["broken"]');
      localStorage.setItem('owlet:lastProject', 'Missing project');
    });
    await page.reload();

    await expect(page.locator('#welcome')).toBeVisible();
    const ownErrors = collector.findings.filter((f) =>
      ['console-error', 'pageerror'].includes(f.kind) && !f.detail.includes('htmlhint') && !/fonts\.(gstatic|googleapis)\.com|downloadable font/.test(f.detail));
    expect(ownErrors, 'errors from corrupted session storage').toEqual([]);
  });

  test('blocked localStorage still boots the app with a visible Welcome screen', async ({ page, collector }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() { throw new DOMException('Access is denied for this document.', 'SecurityError'); },
      });
    });
    await page.goto('/');

    await expect(page.locator('#welcome')).toBeVisible();
    const pageErrors = collector.findings.filter((f) => f.kind === 'pageerror');
    expect(pageErrors, 'uncaught errors with storage blocked').toEqual([]);
  });
});

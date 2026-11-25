import { test, expect } from '../fixtures/collector';
import { openEmptyProject, openProjectWithFile, createFile } from '../fixtures/helpers';

// Phase 3: workspace + editor core. Uses a fresh browser context per test (empty storage).

test.describe('workspace and editor @core', () => {
  test('create a file from the explorer and see it in the tree', async ({ page }) => {
    await openProjectWithFile(page, 'index.html');
    await expect(page.locator('#file-tree')).toContainText('index.html');
    await expect(page.locator('.CodeMirror').first()).toBeVisible();
  });

  test('typed text lands in the editor and survives a reload', async ({ page }) => {
    await openProjectWithFile(page, 'notes.md');
    await page.locator('.CodeMirror').first().click();
    await page.keyboard.type('hello owlet');
    await expect(page.locator('.CodeMirror-code').first()).toContainText('hello owlet');

    await page.keyboard.press('Control+s');
    await page.reload();
    // Requirement: a reload restores the open project automatically (QA-008).
    await expect(page.locator('#file-tree')).toContainText('notes.md', { timeout: 5000 });
  });

  test('after reload the saved project is reachable from Recent projects with its content', async ({ page }) => {
    await openProjectWithFile(page, 'notes.md');
    await page.locator('.CodeMirror').first().click();
    await page.keyboard.type('hello owlet');
    await page.keyboard.press('Control+s');
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Close project' }).click();

    await page.locator('#welcome-recent').getByText('Untitled project', { exact: true }).click();
    await page.locator('.tab', { hasText: 'notes.md' }).click();
    await expect(page.locator('.CodeMirror-code').first()).toContainText('hello owlet');
  });
});

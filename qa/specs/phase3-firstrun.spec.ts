import { test, expect } from '../fixtures/collector';

// Phase 3 (QA-002, QA-007): first-run experience. No extra "open Explorer" clicks are needed here.

test.describe('first run @firstrun', () => {
  test('New project opens the editor, lists the starter files and renders a preview', async ({ page }) => {
    await page.goto('/');
    await page.locator('#welcome').getByRole('button', { name: /New project/ }).click();

    await expect(page.locator('#welcome')).toBeHidden();
    await expect(page.locator('.CodeMirror').first()).toBeVisible();
    await expect(page.locator('#file-tree')).toContainText('index.html');
    await expect(page.locator('#file-tree')).toContainText('style.css');
    await expect(page.locator('#file-tree')).toContainText('script.js');

    const frame = page.frameLocator('#preview-frame');
    await expect(frame.locator('h1')).toHaveText('Hello, Owlet!');
    await expect(frame.locator('body')).toHaveCSS('margin-top', '32px');
  });

  test('welcome "New file" card creates a file in one click, no hidden Explorer needed', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('#welcome').getByRole('button', { name: /New file/ });
    await expect(card).toBeVisible();
    await card.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox').fill('hello.txt');
    await dialog.getByRole('textbox').press('Enter');

    await expect(page.locator('#welcome')).toBeHidden();
    await expect(page.locator('.tab', { hasText: 'hello.txt' })).toBeVisible();
  });

  test('welcome card titles match their template and action names', async ({ page }) => {
    await page.goto('/');
    const titles = await page.locator('#welcome .card-title').allTextContents();
    expect(titles).toEqual(['Open folder', 'New project', 'New file', 'Clone repository']);
  });
});

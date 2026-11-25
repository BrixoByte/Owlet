import { test, expect, type Page } from '../fixtures/collector';
import { openProjectWithFile } from '../fixtures/helpers';

// QA-012: completion popup rules in HTML.
// - Plain text does not open the popup.
// - Tab always accepts; Enter accepts only after the selection was moved with the arrow keys.
// - Esc closes the popup.

// Read the document text of the active editor (internal check, asserts the typed result).
async function editorText(page: Page): Promise<string> {
  return page.evaluate(() => (document.querySelector('.CodeMirror') as any).CodeMirror.getValue());
}

test.describe('autocomplete rules @autocomplete', () => {
  test('plain text does not open the completion popup', async ({ page }) => {
    await openProjectWithFile(page, 'index.html');
    await page.locator('.CodeMirror').first().click();
    await page.keyboard.type('one');
    await expect(page.locator('.CodeMirror-hints')).toHaveCount(0);
    expect(await editorText(page)).toBe('one');
  });

  test('typing "one" then Enter in HTML text inserts a newline', async ({ page }) => {
    await openProjectWithFile(page, 'index.html');
    await page.locator('.CodeMirror').first().click();
    await page.keyboard.type('one');
    await page.keyboard.press('Enter');
    expect(await editorText(page)).toBe('one\n');
  });

  test('"<di" then Tab accepts the selected (first) suggestion', async ({ page }) => {
    await openProjectWithFile(page, 'index.html');
    await page.locator('.CodeMirror').first().click();
    await page.keyboard.type('<di');
    await expect(page.locator('.CodeMirror-hints')).toBeVisible();
    await page.keyboard.press('Tab');
    // html-hint ranks '<dir' first in this build; Tab must accept the highlighted item.
    expect(await editorText(page)).toBe('<dir');
  });

  test('"<di" then Arrow Down then Enter accepts the moved selection', async ({ page }) => {
    await openProjectWithFile(page, 'index.html');
    await page.locator('.CodeMirror').first().click();
    await page.keyboard.type('<di');
    await expect(page.locator('.CodeMirror-hints')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect(await editorText(page)).toBe('<div');
  });

  test('Esc closes the popup without changing the text', async ({ page }) => {
    await openProjectWithFile(page, 'index.html');
    await page.locator('.CodeMirror').first().click();
    await page.keyboard.type('<di');
    await expect(page.locator('.CodeMirror-hints')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.CodeMirror-hints')).toHaveCount(0);
    expect(await editorText(page)).toBe('<di');
  });
});

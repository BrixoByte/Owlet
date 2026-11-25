import { test, expect } from '../fixtures/collector';
import { openProjectWithFile, createFile } from '../fixtures/helpers';

// Phase 4: live preview and sandbox isolation.

test.describe('live preview @preview', () => {
  test('an HTML page with a relative stylesheet renders styled inside the preview', async ({ page }) => {
    await openProjectWithFile(page, 'index.html');
    await page.locator('.CodeMirror').first().click();
    await page.keyboard.type('<link rel="stylesheet" href="css/style.css"><h1 id="t">Hi</h1>');
    await createFile(page, 'css/style.css');
    await page.locator('.CodeMirror').nth(0).click();
    await page.keyboard.type('#t { color: rgb(255, 0, 0); }');
    await page.keyboard.press('Alt+r');

    const frame = page.frameLocator('#preview-frame');
    await expect(frame.locator('#t')).toHaveText('Hi');
    await expect(frame.locator('#t')).toHaveCSS('color', 'rgb(255, 0, 0)');
  });

  test('preview cannot read Owlet storage or parent DOM (sandbox isolation)', async ({ page }) => {
    await openProjectWithFile(page, 'index.html');
    await page.locator('.CodeMirror').first().click();
    await page.keyboard.type('<p id="probe">x</p><script>'
      + 'var r=[];try{r.push(String(parent.document.title))}catch(e){r.push("blocked")}'
      + 'try{r.push(String(parent.localStorage.length))}catch(e){r.push("blocked")}'
      + 'document.getElementById("probe").textContent=r.join("|");</script>');
    await page.keyboard.press('Alt+r');
    await expect(page.frameLocator('#preview-frame').locator('#probe')).toHaveText('blocked|blocked');
  });
});

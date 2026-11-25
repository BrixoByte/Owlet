import { test, expect } from '../fixtures/collector';
import { openEmptyProject } from '../fixtures/helpers';

// QA-015: preview.js mapText threw "regexp too big" in Firefox.
// Reproduction: a project with 600+ files in long nested paths must preview and
// pop out without page errors. Fixture files are created through Owlet.state.

const FILE_COUNT = 620;

async function addLargeProject(page: import('@playwright/test').Page) {
  await page.evaluate((count: number) => {
    const state = (window as any).Owlet.state;
    const files: Record<string, string> = Object.assign({}, state.files);
    for (let i = 0; i < count; i++) {
      const dir = 'packages/module-' + (i % 25) + '/src/components/group-' + (i % 13) + '/deeply/nested/folder-' + (i % 9);
      files[dir + '/asset-' + i + '.txt'] = 'asset ' + i + '\n';
    }
    files['styles/theme/deep/main-long-name-for-the-stylesheet.css'] = 'h1 { color: teal; }\n';
    state.loadFiles(files, state.projectName);
    (window as any).Owlet.preview.update();
  }, FILE_COUNT);
}

test.describe('large project preview @preview-large', () => {
  test('620 nested files preview without page errors', async ({ page, collector }) => {
    await openEmptyProject(page);
    await addLargeProject(page);
    await expect(page.getByTestId('preview').contentFrame().locator('h1')).toHaveText('Hello, Owlet!');
    const errors = collector.findings.filter((f) => f.kind === 'pageerror');
    expect(errors, 'page errors while previewing 620 files').toEqual([]);
  });

  test('620 nested files pop out (standalone data URLs) without page errors', async ({ page, collector }) => {
    await openEmptyProject(page);
    await addLargeProject(page);
    const popupPromise = page.waitForEvent('popup', { timeout: 15_000 }).catch(() => null);
    await page.getByRole('button', { name: /Open preview in new window|Open in new window/ }).click();
    await popupPromise;
    const errors = collector.findings.filter((f) => f.kind === 'pageerror');
    expect(errors, 'page errors while popping out 620 files').toEqual([]);
  });
});

import { test, expect } from '@playwright/test';
import * as src from '../scripts/shortcut-source';

// QA-005: README, docs and the in-app shortcut list must agree.
// - README table is generated from js/ui/shortcuts.js (must be up to date).
// - Every in-app shortcut appears in the docs list.
// - Every docs row is an in-app shortcut or an allow-listed context row (CONTEXT_ONLY).

// "Ctrl+Z / Ctrl+Y" in the docs is two shortcuts.
function docsKeys(): string[] {
  return src.parseDocsShortcuts().flatMap((d) => d.keys.split(' / '));
}

test.describe('shortcut parity @shortcuts', () => {
  test('README shortcuts table matches js/ui/shortcuts.js', () => {
    const table = src.renderReadmeTable(src.parseAppShortcuts());
    const result = src.applyToReadme(src.read('README.md'), table);
    expect(result.changed, 'README is stale: run npm run shortcuts:readme').toBe(false);
  });

  test('every in-app shortcut is documented on the docs page', () => {
    const docs = docsKeys();
    const missing = src.parseAppShortcuts().map((s) => s.keys).filter((k) => !docs.includes(k));
    expect(missing, 'in-app shortcuts missing from docs-data/using-owlet.js').toEqual([]);
  });

  test('docs rows are in-app shortcuts or allow-listed context rows', () => {
    const app = src.parseAppShortcuts().map((s) => s.keys);
    const unknown = docsKeys().filter((k) => !app.includes(k) && !src.CONTEXT_ONLY.includes(k));
    expect(unknown, 'docs rows that do not exist in js/ui/shortcuts.js').toEqual([]);
  });
});

// sync-shortcuts.js — regenerates the README shortcuts table from js/ui/shortcuts.js.
//
// Run:          npm run shortcuts:readme          (writes README.md)
// Check only:   node scripts/sync-shortcuts.js --check   (exit 1 when README is stale)

const fs = require('fs');
const path = require('path');
const src = require('./shortcut-source');

const readmePath = path.join(src.ROOT, 'README.md');
const table = src.renderReadmeTable(src.parseAppShortcuts());
const result = src.applyToReadme(fs.readFileSync(readmePath, 'utf8'), table);

if (process.argv.includes('--check')) {
  if (result.changed) {
    console.error('README shortcuts table is stale. Run: npm run shortcuts:readme');
    process.exit(1);
  }
  console.log('README shortcuts table is up to date.');
  process.exit(0);
}

if (result.changed) fs.writeFileSync(readmePath, result.text);
console.log(result.changed ? 'README shortcuts table updated.' : 'README shortcuts table already up to date.');

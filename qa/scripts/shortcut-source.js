// shortcut-source.js — single place that reads the shortcut lists and renders the
// README table. Used by sync-shortcuts.js (writes README) and by the parity spec.
//
// Sources of truth:
//   js/ui/shortcuts.js               in-app list (the README table is generated from it)
//   docs/js/docs-data/using-owlet.js docs list (may add contextual rows, see CONTEXT_ONLY)

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

// Docs-only rows that describe context (editor/terminal/console) rather than a global key.
const CONTEXT_ONLY = ['Ctrl+Space', 'Tab', 'Up', 'Down', 'Enter'];

const README_START = '<!-- shortcuts:start -->';
const README_END = '<!-- shortcuts:end -->';

// Read a file relative to the repo root.
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// In-app shortcuts: [{ keys, action, group }] in file order.
function parseAppShortcuts() {
  const out = [];
  let group = '';
  read('js/ui/shortcuts.js').split('\n').forEach((line) => {
    const g = line.match(/group:\s*'([^']+)'/);
    if (g) group = g[1];
    const m = line.match(/key:\s*'([^']+)',\s*action:\s*'([^']+)'/);
    if (m) out.push({ keys: m[1], action: m[2], group });
  });
  return out;
}

// Docs shortcuts: [{ keys, action, ctx }] in file order.
function parseDocsShortcuts() {
  const out = [];
  const re = /\{ keys: '([^']+)', action: '([^']+)', ctx: '([^']+)' \}/g;
  let m;
  const text = read('docs/js/docs-data/using-owlet.js');
  while ((m = re.exec(text)) !== null) out.push({ keys: m[1], action: m[2], ctx: m[3] });
  return out;
}

// Markdown code span that also works when the key itself contains a backtick.
function codeSpan(text) {
  return text.includes('`') ? '`` ' + text + ' ``' : '`' + text + '`';
}

// The README table body (no markers) from the in-app list.
function renderReadmeTable(entries) {
  const lines = ['| Shortcut | Action | Group |', '|---|---|---|'];
  entries.forEach((e) => lines.push('| ' + codeSpan(e.keys) + ' | ' + e.action + ' | ' + e.group + ' |'));
  return lines.join('\n');
}

// Replace the block between the README markers. Returns { text, changed }.
function applyToReadme(readmeText, table) {
  const start = readmeText.indexOf(README_START);
  const end = readmeText.indexOf(README_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error('README is missing the shortcuts markers: ' + README_START + ' ... ' + README_END);
  }
  const block = README_START + '\n' + table + '\n' + README_END;
  const next = readmeText.slice(0, start) + block + readmeText.slice(end + README_END.length);
  return { text: next, changed: next !== readmeText };
}

module.exports = {
  ROOT,
  CONTEXT_ONLY,
  README_START,
  README_END,
  read,
  parseAppShortcuts,
  parseDocsShortcuts,
  renderReadmeTable,
  applyToReadme,
};

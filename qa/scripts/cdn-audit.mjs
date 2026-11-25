// cdn-audit.mjs — checks every pinned CDN asset used by the app and sites.
// For each URL: HTTP status, MIME type, size, SHA-384 (for optional SRI) and
// whether the file mentions the global it must define. Read-only GET requests.
//
// Run:  node qa/scripts/cdn-audit.mjs
// Writes qa/report/cdn-audit.json

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// url -> global the script must define (null when it is a CSS file)
const ASSETS = [
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js', 'CodeMirror'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/addon/lint/lint.min.js', 'CodeMirror'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/addon/hint/show-hint.min.js', 'CodeMirror'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css', null],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/addon/hint/show-hint.css', null],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/addon/lint/lint.min.css', null],
  ['https://cdn.jsdelivr.net/npm/eslint-linter-browserify@8.57.0/linter.min.js', 'eslint'],
  ['https://cdnjs.cloudflare.com/ajax/libs/htmlhint/1.1.4/htmlhint.min.js', 'HTMLHint'],
  ['https://cdn.jsdelivr.net/npm/htmlhint@1.1.4/dist/htmlhint.min.js', 'HTMLHint'],
  ['https://cdn.jsdelivr.net/npm/css-tree@2.3.1/dist/csstree.min.js', 'csstree'],
  ['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'JSZip'],
  ['https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js', 'Terminal'],
  ['https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.min.css', null],
  ['https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js', 'FitAddon'],
  ['https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js', 'loadPyodide'],
  ['https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap', null],
];

const results = [];
for (const [url, global] of ASSETS) {
  const row = { url, expectedGlobal: global };
  try {
    const res = await fetch(url, { redirect: 'follow' });
    row.status = res.status;
    row.contentType = res.headers.get('content-type');
    const body = Buffer.from(await res.arrayBuffer());
    row.bytes = body.length;
    row.sha384 = 'sha384-' + createHash('sha384').update(body).digest('base64');
    if (global) {
      const text = body.toString('utf8');
      row.globalMentioned = text.includes(global);
    }
  } catch (e) {
    row.error = e.message;
  }
  results.push(row);
  console.log(String(row.status ?? 'ERR').padEnd(4), (row.bytes ?? '').toString().padStart(9), row.contentType ?? '', url);
}

mkdirSync(join(ROOT, 'qa', 'report'), { recursive: true });
writeFileSync(join(ROOT, 'qa', 'report', 'cdn-audit.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));

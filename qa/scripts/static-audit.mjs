// static-audit.mjs — zero-dependency checks that run WITHOUT a browser.
// Covers: internal links/anchors on every HTML page, GitHub blob links that
// point back into this repo, README vs in-app shortcut parity, and leftover
// branding. Writes qa/report/static-audit.json. Read-only against the app.
//
// Run:  node qa/scripts/static-audit.mjs

import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'qa', 'report');
const REPO_BLOB = 'https://github.com/BrixoByte/Owlet/blob/main/';

const PAGES = ['site/index.html', 'site/404.html', 'project/styleguide.html', 'site/docs/index.html', 'site/roadmap/index.html', 'site/playground/index.html'];
const JS_FILES = ['site/js/main.js', 'site/js/showcase.js', 'site/js/scenes.js', 'site/roadmap/js/roadmap-data.js', 'site/roadmap/js/roadmap.js', 'site/docs/js/docs.js', 'site/docs/js/search.js'];
const SKIP_SCHEMES = /^(data:|javascript:|mailto:|tel:)/i;

const findings = [];
const add = (f) => findings.push(f);
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const rel = (p) => relative(ROOT, p).split(sep).join('/');

function anchorsIn(text) {
  const ids = new Set();
  for (const m of text.matchAll(/\s(?:id|name)\s*=\s*["']([^"']+)["']/gi)) ids.add(m[1]);
  return ids;
}

function refsIn(text) {
  const out = [];
  const re = /\s(href|src|srcset)\s*=\s*(["'])(.*?)\2/gis;
  for (const m of text.matchAll(re)) {
    const attr = m[1].toLowerCase();
    const value = m[3].trim();
    if (!value || value.includes('{{') || value.includes('${')) continue;
    if (attr === 'srcset') {
      for (const part of value.split(',')) {
        const url = part.trim().split(/\s+/)[0];
        if (url) out.push({ attr, value: url });
      }
    } else {
      out.push({ attr, value });
    }
  }
  return out;
}

const externals = new Map();
const idCache = new Map();
const idsOf = (relPath) => {
  if (!idCache.has(relPath)) idCache.set(relPath, anchorsIn(read(relPath)));
  return idCache.get(relPath);
};

// 1) Internal links + anchors on every page.
let linkCount = 0;
for (const page of PAGES) {
  if (!existsSync(join(ROOT, page))) {
    add({ id: 'LINK-000', severity: 'High', area: 'site', title: 'Page missing', file: page });
    continue;
  }
  const text = read(page);
  for (const ref of refsIn(text)) {
    linkCount++;
    const v = ref.value;
    if (SKIP_SCHEMES.test(v)) continue;
    if (/^https?:\/\//i.test(v)) {
      externals.set(v, (externals.get(v) || []).concat(page));
      if (v.startsWith(REPO_BLOB)) {
        const target = v.slice(REPO_BLOB.length).split(/[#?]/)[0];
        if (!existsSync(join(ROOT, target))) {
          add({ id: 'LINK-REPO', severity: 'Medium', area: 'landing/docs', title: 'GitHub blob link points at a file missing from the repo',
            file: page, target, evidence: v });
        }
      }
      continue;
    }
    if (v.startsWith('#/')) continue; // docs/roadmap hash routes: verified by the browser suite
    const [pathPart, hash] = v.split('#');
    const path = pathPart.split('?')[0];
    let targetRel = page;
    if (path) {
      // Root-absolute links inside published pages resolve against site/
      // (404.html uses them because it serves at arbitrary depths).
      const absBase = path.startsWith('/') && page.startsWith('site/')
        ? join(ROOT, 'site')
        : dirname(join(ROOT, page));
      let abs = resolve(absBase, decodeURIComponent(path.replace(/^\/+/, '')));
      if (path.endsWith('/') || (existsSync(abs) && statSync(abs).isDirectory())) abs = join(abs, 'index.html');
      if (!existsSync(abs)) {
        add({ id: 'LINK-BROKEN', severity: 'Medium', area: 'links', title: 'Relative link/asset does not exist',
          file: page, attr: ref.attr, value: v });
        continue;
      }
      targetRel = rel(abs);
    }
    if (hash && hash !== 'top' && !hash.startsWith('/') && /\.html?$/i.test(targetRel) && !idsOf(targetRel).has(hash)) {
      add({ id: 'LINK-ANCHOR', severity: 'Low', area: 'links', title: 'Anchor target id not found on target page',
        file: page, value: v, targetFile: targetRel });
    }
  }
}

// 2) Hard-coded URLs in landing/docs/roadmap JS that point at this repo.
for (const jsRel of JS_FILES.filter((f) => existsSync(join(ROOT, f)))) {
  const text = read(jsRel);
  for (const m of text.matchAll(/["'`](https:\/\/github\.com\/BrixoByte\/Owlet\/blob\/main\/[^"'`\s]+)["'`]/g)) {
    const target = m[1].slice(REPO_BLOB.length).split(/[#?]/)[0];
    if (!existsSync(join(ROOT, target))) {
      add({ id: 'LINK-CONFIG', severity: 'Medium', area: 'landing', title: 'Config URL points at a file missing from the repo',
        file: jsRel, target, evidence: m[1] });
    }
  }
  const note = text.match(/NOTE:[^\n]*CODE_OF_CONDUCT[^\n]*/);
  if (note) add({ id: 'DOC-NOTE', severity: 'Info', area: 'landing', title: 'Source note acknowledges missing file', file: jsRel, evidence: note[0].trim() });
}

// 3) Shortcut parity: README table vs in-app shortcut list.
const readme = read('README.md');
const readmeKeys = [...readme.matchAll(/^\|\s*`+\s*(.+?)\s*`+\s*\|/gm)].map((m) => m[1]).filter((k) => /^(Ctrl|Alt|Shift|Esc)\b/.test(k));
const appShortcuts = read('site/playground/js/ui/shortcuts.js');
const appKeys = [...appShortcuts.matchAll(/key:\s*'([^']+)'/g)].map((m) => m[1]);
const notInApp = readmeKeys.filter((k) => !appKeys.includes(k));
if (notInApp.length) add({ id: 'SC-README', severity: 'Low', area: 'docs', title: 'README shortcut not in in-app list', keys: notInApp });
const notInReadme = appKeys.filter((k) => !readmeKeys.includes(k));
add({ id: 'SC-PARITY', severity: 'Info', area: 'docs', title: 'In-app shortcuts not listed in README (documentation gap, not a bug)',
  keys: notInReadme, readmeKeys, appKeys });

// Heuristic handler presence (static only; the Playwright suite must press each key).
const jsCorpus = ['site/playground/js/app.js', 'site/playground/js/editor.js', 'site/playground/js/editorgroups.js', 'site/playground/js/ui/shortcuts.js', 'site/playground/js/ui/layout.js', 'site/playground/js/ui/menubar.js']
  .filter((f) => existsSync(join(ROOT, f))).map(read).join('\n');
const handlerHints = {
  'Ctrl+S': /saveActive/, 'Ctrl+P': /openPalette/, 'Ctrl+W': /closeActive|closeTab/i,
  'Ctrl+B': /toggle\(\s*'side'/, 'Ctrl+J': /toggle\(\s*'bottom'/, 'Ctrl+`': /terminal\.toggle/, 'Alt+R': /altKey/,
  '?': /key === '\?'/
};
const handlerMissing = Object.keys(handlerHints).filter((k) => appKeys.includes(k) && !handlerHints[k].test(jsCorpus));
if (handlerMissing.length) add({ id: 'SC-HANDLER', severity: 'Medium', area: 'shortcuts', title: 'No static handler found for documented shortcut (verify in browser)', keys: handlerMissing });

// 4) Branding: leftover DevPad outside migration shims and historical notes.
const brandingAllowed = /migration|DevPad-era|Formerly known as DevPad|formerly-DevPad|devpad/i;
const brandHits = [];
const scanDirs = ['', 'site', 'site/js', 'site/css', 'site/docs', 'site/roadmap', 'site/playground', 'site/playground/js', 'site/playground/css', 'site/playground/js/ui', 'project'];
for (const d of scanDirs) {
  const abs = join(ROOT, d);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs)) {
    const p = join(abs, f);
    if (!statSync(p).isFile() || !/\.(html|js|css|md|json|webmanifest)$/i.test(f)) continue;
    if (/plan\.md|remain\.md|roadmap\.md|ui\.md/.test(f)) continue;
    read(rel(p)).split('\n').forEach((line, i) => {
      if (/DevPad/.test(line) && !brandingAllowed.test(line)) brandHits.push({ file: rel(p), line: i + 1, text: line.trim().slice(0, 160) });
    });
  }
}
if (brandHits.length) add({ id: 'BRAND-01', severity: 'Medium', area: 'branding', title: 'Leftover "DevPad" text', hits: brandHits });

// 5) Placeholders.
const placeholderHits = [];
for (const p of PAGES.concat(JS_FILES)) {
  if (!existsSync(join(ROOT, p))) continue;
  read(p).split('\n').forEach((line, i) => {
    if (/lorem ipsum|YOUR-USERNAME|your-username|TODO:? *(write|add|fill)/i.test(line)) placeholderHits.push({ file: p, line: i + 1, text: line.trim().slice(0, 160) });
  });
}
if (placeholderHits.length) add({ id: 'PH-01', severity: 'Medium', area: 'branding', title: 'Placeholder text', hits: placeholderHits });

// 6) External hosts referenced by static pages (network use is checked live later).
const externalHosts = [...externals.keys()].map((u) => { try { return new URL(u).host; } catch { return u; } });
const hostCounts = externalHosts.reduce((a, h) => ((a[h] = (a[h] || 0) + 1), a), {});

// 7) Repo hygiene files referenced by docs.
for (const f of ['CODE_OF_CONDUCT.md', 'LICENSE', 'CONTRIBUTING.md', '.github/ISSUE_TEMPLATE', 'site/assets/screenshot.png']) {
  if (!existsSync(join(ROOT, f))) {
    const severity = f === 'CODE_OF_CONDUCT.md' || f === 'site/assets/screenshot.png' ? 'Medium' : 'Low';
    add({ id: 'REPO-' + f.replace(/[^a-z0-9]+/gi, '_'), severity, area: 'repo', title: 'Referenced file/folder missing', file: f });
  }
}

const summary = { generatedAt: new Date().toISOString(), internalRefsChecked: linkCount,
  externalUrlCount: externals.size, externalHosts: hostCounts, findings: findings.length };
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'static-audit.json'), JSON.stringify({ summary, findings }, null, 2));
console.log(JSON.stringify(summary, null, 2));
for (const f of findings) console.log(`[${f.severity}] ${f.id} ${f.title}${f.file ? ' — ' + f.file : ''}${f.value ? ' — ' + f.value : ''}${f.target ? ' — ' + f.target : ''}`);

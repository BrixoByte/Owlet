/* ==========================================================================
   reference.js — Group 6: roadmap status (mirrors roadmap.md phases),
   changelog, FAQ, glossary and credits.
   ========================================================================== */
'use strict';
window.OwletDocs = window.OwletDocs || { groups: [] };

window.OwletDocs.groups.push({
    id: 'reference',
    title: 'Reference',
    file: 'reference.js',
    pages: [
        {
            id: 'reference/roadmap',
            title: 'Roadmap status',
            description: 'Where every roadmap phase stands right now — mapped from roadmap.md to what the code actually does.',
            blocks: [
                { t: 'p', x: ['The full plan lives in ', { a: 'roadmap.md', href: 'https://github.com/BrixoByte/Owlet/blob/main/roadmap.md' }, '. This table reflects the code as it exists today:'] },
                { t: 'table', head: ['Phase', 'Deliverable', 'Status'], rows: [
                    ['0 — Repo hygiene', 'Clean README, GitHub Pages demo', [{ badge: { kind: 'ok', text: 'Done' } }]],
                    ['1 — Multi-file workspace', 'File tree, tabs, storage, Blob preview', [{ badge: { kind: 'ok', text: 'Done' } }]],
                    ['2 — Console & linting', 'Console panel, ESLint/HTMLHint/csstree, auto-suggest', [{ badge: { kind: 'ok', text: 'Done' } }]],
                    ['3 — Python', 'Pyodide runtime, .py run, REPL', [{ badge: { kind: 'ok', text: 'Done' } }]],
                    ['4 — Terminal', 'xterm.js local mode + pluggable engine', [{ badge: { kind: 'ok', text: 'Done (local)' } }]],
                    ['5 — Cloud sandboxes', 'BYOK Daytona/E2B/Modal/Upstash Box', [{ badge: { kind: 'progress', text: 'In progress' } }]],
                    ['6 — Compiler APIs', 'Judge0-style BYOK endpoint', [{ badge: { kind: 'experimental', text: 'Configurable' } }]],
                    ['7 — PWA & offline', 'Service worker + manifest', [{ badge: { kind: 'ok', text: 'Done' } }]],
                    ['8 — UI polish', 'Workbench, presets, palette, a11y pass', [{ badge: { kind: 'progress', text: 'In progress' } }]],
                    ['9 — Tauri desktop', 'Rust-wrapped desktop app', [{ badge: { kind: 'planned', text: 'Planned' } }]],
                    ['10 — Share backend', 'Optional droplet/Workers backend', [{ badge: { kind: 'planned', text: 'Deferred' } }]]
                ] },
                { t: 'callout', kind: 'note', title: 'Beyond the phases', x: 'Share links, repo cloning, error details and layout presets shipped alongside the phases — real features that grew past the original roadmap.' }
            ]
        },
        {
            id: 'reference/changelog',
            title: 'Changelog',
            description: 'Notable changes to Owlet and these docs. Lightweight — the git history is the real record.',
            blocks: [
                { t: 'table', head: ['Date', 'Change'], rows: [
                    ['Current', 'Docs site: full six-group documentation with hash routing, search and shared landing-page theme.'],
                    ['Earlier', 'Workbench UI: layout presets, command palette, dock panels, mobile view.'],
                    ['Earlier', 'Share links (public + AES-GCM private), GitHub repo cloning, ZIP export.'],
                    ['Earlier', 'Terminal local mode, Pyodide Python, BYOK sandbox adapters, compiler API.'],
                    ['Earlier', 'Multi-file workspace, console, linting, live preview, PWA offline.']
                ] },
                { t: 'callout', kind: 'note', title: 'Why so light?', x: 'Owlet has no release tags yet — history lives in git. This page is a narrative summary for humans; see the commit log on GitHub for the exact record.' }
            ]
        },
        {
            id: 'reference/faq',
            title: 'FAQ',
            description: 'The questions people actually ask — storage, browser support, BYOK keys and what "offline-first" really means.',
            blocks: [
                { t: 'h2', x: 'Is my code uploaded anywhere?' },
                { t: 'p', x: 'No. Owlet has no backend. Projects live in your browser’s localStorage or in a folder on your disk. The only times code leaves your machine are the ones you trigger: a share link (code inside the URL you send), a repo clone (fetching, not sending), or a BYOK sandbox/compiler request you configured.' },
                { t: 'h2', x: 'Does it work without internet?' },
                { t: 'p', x: 'After the first visit, yes — the service worker caches the app. Caveats: the very first load needs the CDNs, Pyodide downloads ~10 MB once, and cloud/BYOK features obviously need a connection.' },
                { t: 'h2', x: 'Which browser should I use?' },
                { t: 'p', x: 'Chrome or Edge for everything (only Chromium has the File System Access API for real folders). Firefox and Safari work fully except "Open folder" and install.' },
                { t: 'h2', x: 'Can Owlet run Node.js / npm?' },
                { t: 'p', x: 'Not in the browser itself — JavaScript in the preview is sandboxed, and the local terminal is a virtual one. A real Node shell needs the cloud sandbox feature (BYOK), whose terminal bridge is still in progress.' },
                { t: 'h2', x: 'What languages can it run?' },
                { t: 'p', x: 'Out of the box: HTML/CSS/JS in the preview, JavaScript in the terminal REPL, and Python via Pyodide. Compiled languages (C++, Java, Rust, Go…) work if you configure a Judge0-style compiler endpoint — see Compiler APIs.' },
                { t: 'h2', x: 'I found a bug / want a feature — where?' },
                { t: 'p', x: ['The ', { a: 'issue tracker', href: 'https://github.com/BrixoByte/Owlet/issues' }, '. The thumbs buttons at the bottom of every docs page file a prefilled issue too.'] },
                { t: 'h2', x: 'Is Owlet free to use for teaching?' },
                { t: 'p', x: 'Yes — MIT licensed. Use it in classes, fork it, rebrand it. A credit link is appreciated but not required.' }
            ]
        },
        {
            id: 'reference/glossary',
            title: 'Glossary',
            description: 'The terms this documentation and the codebase use.',
            blocks: [
                { t: 'table', head: ['Term', 'Meaning'], rows: [
                    ['BYOK', 'Bring your own key — optional cloud features use an API key you supply, stored only in your browser.'],
                    ['Bridge', ['The script injected into the preview iframe that reports console calls and errors to Owlet (', { c: 'preview.js' }, ').']],
                    ['Contract', ['The documented boundary between the UI layer (', { c: 'js/ui/' }, ') and logic layer (', { c: 'js/' }, ') — ', { c: 'contract.js' }, ' + CONTRACT.md.']],
                    ['Dock', 'The bottom panel hosting Console, Terminal and Problems tabs.'],
                    ['Engine', 'What interprets terminal input — the local virtual engine today, a cloud engine when sandbox support lands.'],
                    ['Mock layer', ['js/ui/mock.js — fake data that fills designed-but-unwired UI (git, AI). Off via ', { c: 'owlet:ui:mock' }, '.']],
                    ['Preset', 'A named workbench layout: Classic, Preview Right, Focus or Zen.'],
                    ['Pyodide', 'CPython compiled to WebAssembly — the way real Python runs in your browser.'],
                    ['Rail', 'The narrow activity bar on the far left (Explorer, Source Control, Format, Wrap, AI, Extensions).'],
                    ['Snapshot', ['OwletUI.snapshot — the read-only copy of UI state panels render from.']],
                    ['Workbench', 'The whole editor shell: top bar, rail, sidebar, editor, preview, dock, status bar.']
                ] }
            ]
        },
        {
            id: 'reference/credits',
            title: 'Credits and license',
            description: 'Owlet is MIT licensed and stands on the shoulders of excellent CDN-hosted open source.',
            blocks: [
                { t: 'h2', x: 'License' },
                { t: 'p', x: ['Owlet is released under the ', { a: 'MIT License', href: 'https://github.com/BrixoByte/Owlet/blob/main/LICENSE' }, ' — use, copy, modify and distribute freely, including commercially.'] },
                { t: 'h2', x: 'Libraries' },
                { t: 'table', head: ['Library', 'Role', 'License'], rows: [
                    [[{ a: 'CodeMirror 5', href: 'https://codemirror.net/5/' }], 'Editor component', 'MIT'],
                    [[{ a: 'xterm.js', href: 'https://xtermjs.org/' }], 'Terminal', 'MIT'],
                    [[{ a: 'Pyodide', href: 'https://pyodide.org/' }], 'Python runtime', 'MPL-2.0'],
                    [[{ a: 'ESLint', href: 'https://eslint.org/' }], 'JavaScript linting (browser build)', 'MIT'],
                    [[{ a: 'HTMLHint', href: 'https://htmlhint.com/' }], 'HTML linting', 'MIT'],
                    [[{ a: 'css-tree', href: 'https://github.com/csstree/csstree' }], 'CSS parsing and linting', 'MIT'],
                    [[{ a: 'JSZip', href: 'https://stuk.github.io/jszip/' }], 'ZIP export', 'MIT/GPL'],
                    [[{ a: 'Inter / JetBrains Mono', href: 'https://fonts.google.com/' }], 'Typefaces', 'OFL']
                ] },
                { t: 'h2', x: 'This documentation' },
                { t: 'p', x: 'The docs site is part of the same repository, shares the MIT license, and is built with the same rules: vanilla HTML/CSS/JS, no build step, no tracking.' }
            ]
        }
    ]
});

/* ==========================================================================
   roadmap-data.js — the single source of truth for the public roadmap page.
   Update the roadmap by editing ONLY this file: every view (board, timeline,
   counters, filters, export) is generated from window.OwletRoadmap.

   Status vocabulary (honest — verified against the repo, not wishes):
     done        shipped and working in the codebase today
     in-progress real code exists but the feature is not complete
     planned     agreed direction, no code yet
     exploring   an idea under consideration, not committed

   Item-level `note` explains WHY a status is what it is (e.g. mock UI).
   ========================================================================== */
'use strict';

window.OwletRoadmap = {
    updated: '2025-11-24',

    principles: [
        { title: 'Vanilla only', text: 'Plain HTML, CSS and JavaScript with CDN script tags. No npm, no bundler, no framework — clone it and it runs.' },
        { title: 'Beginner-readable', text: 'The whole codebase is written so a new developer can read it and learn. Small functions, honest comments, no magic.' },
        { title: 'Offline-first', text: 'Everything that can run in the browser runs in the browser. A service worker makes the core IDE work on airplane mode.' },
        { title: 'No lock-in', text: 'Optional cloud features use your own API key (BYOK), stored only in your browser. There is no Owlet server.' },
        { title: '$0 to run', text: 'Static hosting on GitHub Pages, client-side execution, free-tier providers. The project itself costs nothing to operate.' }
    ],

    phases: [
        {
            id: 'phase-0', number: 0, title: 'Repo hygiene & live demo',
            summary: 'Make the project presentable: clean README, GitHub Pages demo, working links.',
            status: 'done', target: 'Now', tags: ['docs'],
            cost: 'Free', offline: true, needs: [],
            deliverable: 'Clean repo + live URL visitors can try instantly.',
            items: [
                { title: 'Fix README', description: 'Broken clone URL, encoding glitch and flat markdown corrected.', status: 'done' },
                { title: 'Enable GitHub Pages', description: 'index.html hosted for free; Live Demo link in the README.', status: 'done' },
                { title: 'Check dead links', description: 'CONTRIBUTING.md and LICENSE resolve.', status: 'done' },
                { title: 'Screenshot / GIF', description: 'Visual trust builder for the repo front page.', status: 'in-progress', note: 'Not yet added to the README.', good_first_issue: true, help_wanted: true }
            ]
        },
        {
            id: 'phase-1', number: 1, title: 'True multi-file workspace',
            summary: 'From fixed textareas to a real mini-IDE: file tree, tabs, storage, multi-file preview.',
            status: 'done', target: 'Now', tags: ['editor', 'ui'],
            cost: 'Free', offline: true, needs: [],
            deliverable: 'Open a folder from disk, edit multiple files, live-preview the whole project.',
            items: [
                { title: 'File tree sidebar', description: 'Create, rename and delete files and folders.', status: 'done' },
                { title: 'Tab bar', description: 'Open files as tabs with unsaved-dot indicator.', status: 'done' },
                { title: 'Storage layer', description: 'localStorage for browser projects; File System Access API for real folders (Chromium).', status: 'done' },
                { title: 'Multi-file preview', description: 'Relative paths resolved to Blob URLs so real projects render in the iframe.', status: 'done' }
            ]
        },
        {
            id: 'phase-2', number: 2, title: 'Console, linting & suggestions',
            summary: 'Errors made visible: console panel, lint squiggles, VS Code-style auto-suggest.',
            status: 'done', target: 'Now', tags: ['editor'],
            cost: 'Free', offline: true, needs: ['phase-1'],
            deliverable: 'console.log, lint squiggles and live suggestions inside Owlet — zero server.',
            items: [
                { title: 'Console panel', description: 'Bottom drawer capturing console output and errors from the preview iframe.', status: 'done' },
                { title: 'Error details', description: 'Runtime errors with file/line info and a details dialog; badge count on the console tab.', status: 'done', note: 'Grew beyond the original plan — includes a dedicated error-details view.' },
                { title: 'Auto-suggest', description: 'inputRead triggers showHint so suggestions appear while typing.', status: 'done' },
                { title: 'JS / HTML / CSS linting', description: 'ESLint, HTMLHint and css-tree wired to CodeMirror lint addon.', status: 'done' },
                { title: 'Python syntax check', description: 'Pyodide-side ast/pyflakes check.', status: 'planned', note: 'Python errors surface at run time instead.', help_wanted: true, good_first_issue: true }
            ]
        },
        {
            id: 'phase-3', number: 3, title: 'Python support',
            summary: 'Real CPython in the browser via Pyodide — offline, free, no server.',
            status: 'done', target: 'Now', tags: ['python'],
            cost: 'Free', offline: true, needs: ['phase-2'],
            deliverable: 'Write Python in Owlet, run it with zero server, works offline after first load.',
            items: [
                { title: 'Python editor mode', description: '.py files open a Python CodeMirror pane.', status: 'done' },
                { title: 'Run Python', description: 'pyodide.runPythonAsync streams stdout/stderr into the console.', status: 'done' },
                { title: 'Lazy loading', description: '~10 MB Pyodide downloads only on first Python run, then caches.', status: 'done' }
            ]
        },
        {
            id: 'phase-4', number: 4, title: 'Terminal panel',
            summary: 'VS Code-style xterm.js drawer with a pluggable engine — local mode today, cloud later.',
            status: 'done', target: 'Now', tags: ['ui'],
            cost: 'Free', offline: true, needs: ['phase-3'],
            deliverable: 'A working offline terminal, architected so a cloud shell plugs in later.',
            items: [
                { title: 'xterm.js terminal drawer', description: 'Bottom terminal, toggled with Ctrl+`.', status: 'done' },
                { title: 'Local mode: virtual commands', description: 'help, clear, ls, open, run, theme operating on the file tree.', status: 'done' },
                { title: 'Local mode: JS + Python REPLs', description: 'Evaluate JavaScript; Python lines routed through Pyodide.', status: 'done' },
                { title: 'Cloud mode switch', description: 'Terminal attaches to a sandbox shell.', status: 'in-progress', note: 'Engine hooks exist in terminal.js; no provider bridge yet — depends on Phase 5.' }
            ]
        },
        {
            id: 'phase-5', number: 5, title: 'Cloud sandboxes (BYOK)',
            summary: 'Optional power layer: your own free sandbox account for a real Node.js shell.',
            status: 'in-progress', target: 'Next', tags: ['cloud'],
            cost: 'BYOK', offline: false, needs: ['phase-4'],
            deliverable: 'One click → real Node.js + bash terminal inside Owlet, $0 cost to the project.',
            items: [
                { title: 'Provider adapters', description: 'Daytona, E2B, Modal and Upstash Box adapters exist in sandbox.js.', status: 'done', note: 'Connection test works; adapters return capability info.' },
                { title: 'Settings → Cloud Sandbox', description: 'API key stored in localStorage only.', status: 'done' },
                { title: 'Terminal bridge', description: 'Sandbox shell attached to the xterm.js panel.', status: 'in-progress', note: 'UI ready, backend not connected — syncFiles() is an explicit stub.', help_wanted: true },
                { title: 'File sync', description: 'Project files pushed into the sandbox.', status: 'in-progress', note: 'UI ready, backend not connected — provider-specific implementation needed.', help_wanted: true },
                { title: 'CORS proxy (optional)', description: '~20-line Cloudflare Worker for providers that block browser calls.', status: 'planned', note: 'Documented approach; not built.', good_first_issue: true }
            ]
        },
        {
            id: 'phase-6', number: 6, title: 'Other languages via compiler API',
            summary: 'C++, Java, Rust, Go and 30+ more through a configurable Judge0-style endpoint.',
            status: 'in-progress', target: 'Next', tags: ['cloud', 'editor'],
            cost: 'BYOK', offline: false, needs: ['phase-2'],
            deliverable: '"Run" works for non-web languages with a key; offline mode unaffected without one.',
            items: [
                { title: 'Compiler module', description: 'compiler.js posts source to a user-configured endpoint and prints results.', status: 'done', note: 'Works when an endpoint is configured — bring your own.' },
                { title: 'Configurable endpoint', description: 'No hardcoded provider; the old free Piston endpoint is whitelist-only.', status: 'done' },
                { title: 'Language coverage UI', description: 'Which file types route to the compiler vs the browser.', status: 'in-progress', note: 'Experimental — extension mapping is partial.', help_wanted: true, good_first_issue: true }
            ]
        },
        {
            id: 'phase-7', number: 7, title: 'PWA & true offline',
            summary: 'Service worker + manifest: installable, airplane-mode-capable IDE.',
            status: 'done', target: 'Now', tags: ['pwa'],
            cost: 'Free', offline: true, needs: ['phase-1'],
            deliverable: 'Installable, offline-capable IDE.',
            items: [
                { title: 'Service worker', description: 'sw.js caches the app shell so Owlet opens without internet.', status: 'done' },
                { title: 'Web app manifest', description: 'manifest.json enables install prompts and standalone windows.', status: 'done' }
            ]
        },
        {
            id: 'phase-8', number: 8, title: 'UI polish',
            summary: 'The workbench redesign from project/ui.md: presets, command palette, toasts, a11y pass.',
            status: 'in-progress', target: 'Now', tags: ['ui'],
            cost: 'Free', offline: true, needs: ['phase-1'],
            deliverable: 'A workbench that feels like a real IDE while staying beginner-readable.',
            items: [
                { title: 'Workbench redesign', description: 'Top bar, activity rail, dock panels and layout presets (Classic / Preview Right / Focus / Zen).', status: 'done', note: 'Shipped via the js/ui layer.' },
                { title: 'Command palette', description: 'Ctrl+P palette for files and commands.', status: 'done' },
                { title: 'Resizable panels + toasts', description: 'Panel resizing, toast notifications, status bar.', status: 'done' },
                { title: 'Designed-but-unwired panels', description: 'Source Control, AI chat, Extensions panels.', status: 'in-progress', note: 'UI ready, backend not connected — mock data only, honestly labelled.' },
                { title: 'Accessibility pass', description: 'WCAG AA contrast, focus rings, reduced motion, screen-reader paths.', status: 'in-progress', note: 'Partial — terminal and editor have known gaps.', help_wanted: true }
            ]
        },
        {
            id: 'phase-9', number: 9, title: 'Desktop app (Tauri)',
            summary: 'Same frontend wrapped in Rust: native fs everywhere, real PTY, ~20 MB installer.',
            status: 'planned', target: 'Later', tags: ['desktop'],
            cost: 'Free', offline: true, needs: ['phase-8'],
            deliverable: 'Owlet .exe / .dmg / .AppImage at a fraction of Electron\'s weight.',
            items: [
                { title: 'Tauri v2 shell', description: 'Rust backend hosting the existing HTML/CSS/JS.', status: 'planned', note: 'Requires a Rust toolchain; no code yet.' },
                { title: 'Native fs + PTY', description: 'Real file system and shell on every OS — no browser APIs needed.', status: 'planned' },
                { title: 'Global shortcuts & menus', description: 'Desktop-standard keyboard and menu integration.', status: 'planned' }
            ]
        },
        {
            id: 'phase-10', number: 10, title: 'Optional backend',
            summary: 'Only if sharing grows: a tiny API gateway for project save/share links.',
            status: 'exploring', target: 'Later', tags: ['cloud'],
            cost: 'Optional droplet', offline: false, needs: [],
            deliverable: 'Share links that work without encoding the whole project in the URL.',
            items: [
                { title: 'Evaluate need', description: 'URL-hash sharing already works; a backend only pays off if demand grows.', status: 'exploring', note: 'Deferred by design — $0 architecture holds.' },
                { title: 'Droplet or Workers option', description: '~$5–6 droplet, or free-tier Cloudflare Workers + KV/D1 for simple shares.', status: 'exploring' }
            ]
        },
        {
            id: 'phase-x', number: 11, title: 'Beyond the original plan',
            summary: 'Work that shipped outside the roadmap: share links, repo cloning, landing, docs.',
            status: 'done', target: 'Now', tags: ['docs', 'ui'],
            cost: 'Free', offline: true, needs: [],
            deliverable: 'A project that grew past its own roadmap.',
            items: [
                { title: 'Share links', description: 'Public and AES-GCM private links encoding the project in the URL — no server.', status: 'done' },
                { title: 'GitHub repo cloning', description: 'Import a public repo snapshot via the GitHub tarball API.', status: 'done' },
                { title: 'ZIP export', description: 'Download the project as a ZIP via JSZip.', status: 'done' },
                { title: 'Landing page', description: 'Public marketing page sharing the design system.', status: 'done' },
                { title: 'Documentation site', description: '42-page docs site with search, routing and the same theme.', status: 'done' }
            ]
        }
    ],

    changelog: [
        { date: '2025-11', title: 'Documentation site + roadmap page', notes: 'Full docs at /docs with search and hash routing; this public roadmap view.' },
        { date: '2025-11', title: 'Workbench UI redesign', notes: 'Layout presets, command palette, dock panels, activity rail — the js/ui contract layer.' },
        { date: '2025-10', title: 'Share links, cloning, ZIP export', notes: 'Public + encrypted share links, GitHub tarball import, JSZip export.' },
        { date: '2025-10', title: 'Terminal, Python, BYOK adapters', notes: 'xterm.js local terminal, Pyodide Python, sandbox provider scaffolding, compiler API.' },
        { date: '2025-09', title: 'Core IDE ships', notes: 'Multi-file workspace, console + linting, live preview, PWA offline, GitHub Pages demo.' }
    ]
};

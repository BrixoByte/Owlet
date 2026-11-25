/* ==========================================================================
   getting-started.js — Group 1: Introduction, Quick start, Browser support,
   Offline use & privacy. Every "works today" statement here was verified
   against the app source (README.md, js/*.js, index.html, project/CONTRACT.md).
   ========================================================================== */
'use strict';
window.OwletDocs = window.OwletDocs || { groups: [] };

window.OwletDocs.groups.push({
    id: 'getting-started',
    title: 'Getting started',
    file: 'getting-started.js',
    pages: [
        {
            id: 'getting-started/introduction',
            title: 'Introduction',
            description: 'Owlet is a free, offline-first web IDE that runs entirely in your browser. This page explains what it is, who it is for, and the principles behind it.',
            blocks: [
                { t: 'h2', x: 'What is Owlet?' },
                { t: 'p', x: ['Owlet is a code editor and playground for the web, built with plain HTML, CSS and JavaScript. It has a multi-file workspace, a CodeMirror editor with suggestions and linting, a live preview, a console, a terminal, and Python support via Pyodide. There is no server and no build step — you open ', { c: 'index.html' }, ' and it works.'] },
                { t: 'p', x: ['The project is open source under the ', { a: 'MIT License', href: 'https://github.com/BrixoByte/Owlet/blob/main/LICENSE' }, ', so you can use it, change it, and ship your own version, including commercially.'] },
                { t: 'h2', x: 'Who is it for?' },
                { t: 'list', items: [
                    ['Beginners learning HTML, CSS and JavaScript who want results without any setup.'],
                    ['Students and teachers who need an editor that works on any machine, instantly.'],
                    ['Frontend developers who want a zero-install scratchpad for quick experiments.'],
                    ['Contributors who want a small, readable codebase to learn from and improve.']
                ] },
                { t: 'h2', x: 'Principles' },
                { t: 'list', items: [
                    [{ b: 'Vanilla only' }, ' — plain HTML/CSS/JS and a few pinned CDN libraries. No npm, no bundler, no frameworks.'],
                    [{ b: 'Beginner-readable' }, ' — the whole codebase is meant to be readable by a new developer. Small files, small functions, comments that explain why.'],
                    [{ b: 'Offline-first' }, ' — everything that can run in your browser runs in your browser. A service worker caches the app so it opens without a connection.'],
                    [{ b: '$0 to run' }, ' — static hosting plus client-side execution. Optional power features use your own free API keys (BYOK), so the project never pays.'],
                    [{ b: 'No lock-in' }, ' — your files live in your own browser or on your own disk. Export a ZIP any time.']
                ] },
                { t: 'h2', x: 'Feature status at a glance' },
                { t: 'badge-list', items: [
                    { kind: 'ok', text: 'Editor, preview, console' },
                    { kind: 'ok', text: 'Python (Pyodide)' },
                    { kind: 'ok', text: 'Local terminal' },
                    { kind: 'ok', text: 'Offline / PWA' },
                    { kind: 'experimental', text: 'Cloud sandbox (BYOK)' },
                    { kind: 'experimental', text: 'Compiler API (BYOK)' },
                    { kind: 'planned', text: 'AI chat' },
                    { kind: 'planned', text: 'Git integration' },
                    { kind: 'planned', text: 'Editor split view' },
                    { kind: 'planned', text: 'Desktop app' }
                ] },
                { t: 'callout', kind: 'note', title: 'Honest docs', x: 'Every page in these docs states the real status of a feature. Anything unfinished carries a "Planned" or "In progress" badge — never documentation for something that does not work.' },
                { t: 'h2', x: 'Where to go next' },
                { t: 'cards', items: [
                    { title: 'Quick start', text: 'Open Owlet in under a minute.', href: '#/getting-started/quick-start' },
                    { title: 'Workspace and files', text: 'Create, rename and organise files.', href: '#/using-owlet/workspace' },
                    { title: 'Keyboard shortcuts', text: 'The full shortcut reference.', href: '#/using-owlet/shortcuts' },
                    { title: 'Contributing', text: 'Fork, change, pull request.', href: '#/contributing/ways' }
                ] }
            ]
        },
        {
            id: 'getting-started/quick-start',
            title: 'Quick start',
            description: 'Use Owlet online right now, or run it locally in three steps. No install, no account, no build.',
            blocks: [
                { t: 'h2', x: 'Option 1 — use it online' },
                { t: 'steps', items: [
                    { title: 'Open the live demo', text: ['Visit ', { a: 'the hosted Owlet', href: 'https://brixobyte.github.io/Owlet/' }, ' in a modern browser.'] },
                    { title: 'Create a file', text: ['Click the ', { b: 'New file' }, ' button in the Explorer sidebar and name it ', { c: 'index.html' }, '.'] },
                    { title: 'Type and look right', text: 'The live preview renders your page as you type. Linting and suggestions update along the way.' }
                ] },
                { t: 'callout', kind: 'tip', title: 'First run', x: ['A service worker caches the app on first load, so after that it opens even without internet. Press ', { kbd: 'Ctrl+S' }, ' any time to save — projects are also autosaved in your browser.'] },
                { t: 'h2', x: 'Option 2 — run it locally' },
                { t: 'steps', items: [
                    { title: 'Get the code', text: ['Clone the repository, or download it as a ZIP from ', { a: 'GitHub', href: 'https://github.com/BrixoByte/Owlet' }, ' and extract it.'] },
                    { title: 'Open index.html', text: ['Double-click ', { c: 'index.html' }, ', or drag it into your browser. That is the whole install — editing and preview work straight from ', { c: 'file://' }, '.'] },
                    { title: 'Or serve it (recommended)', text: 'For the full experience — offline install, service worker, reliable CDN caching — serve the folder over HTTP with any static server.' }
                ] },
                { t: 'code', remember: 'os', lang: 'bash', tabs: [
                    { label: 'Windows', lang: 'bash', code: 'git clone https://github.com/BrixoByte/Owlet.git\ncd Owlet\n\n# Option A: just open the file\nstart index.html\n\n# Option B: serve it (needs Python or Node)\npython -m http.server 8000\n# then open http://localhost:8000' },
                    { label: 'macOS', lang: 'bash', code: 'git clone https://github.com/BrixoByte/Owlet.git\ncd Owlet\n\n# Option A: just open the file\nopen index.html\n\n# Option B: serve it (needs Python or Node)\npython3 -m http.server 8000\n# then open http://localhost:8000' },
                    { label: 'Linux', lang: 'bash', code: 'git clone https://github.com/BrixoByte/Owlet.git\ncd Owlet\n\n# Option A: just open the file\nxdg-open index.html\n\n# Option B: serve it (needs Python or Node)\npython3 -m http.server 8000\n# then open http://localhost:8000' }
                ] },
                { t: 'callout', kind: 'note', title: 'No build step', x: ['There is no ', { c: 'npm install' }, ', no bundler and nothing to compile. Libraries like CodeMirror and xterm.js load from pinned CDNs when you are online.'] },
                { t: 'h2', x: 'Your first project' },
                { t: 'steps', items: [
                    { title: 'Create the three classic files', text: [{ c: 'index.html' }, ', ', { c: 'style.css' }, ', ', { c: 'script.js' }, ' — each opens as a tab.'] },
                    { title: 'Link them together', text: ['In ', { c: 'index.html' }, ' reference ', { c: 'style.css' }, ' and ', { c: 'script.js' }, '. Owlet resolves relative paths into the preview automatically.'] },
                    { title: 'Watch it run', text: ['The preview updates while you type. Errors and ', { c: 'console.log' }, ' output land in the Console panel at the bottom.'] },
                    { title: 'Save it', text: [{ kbd: 'Ctrl+S' }, ' saves the project into your browser. Find it later in the ', { b: 'Saved Projects' }, ' dialog (File menu).'] }
                ] },
                { t: 'callout', kind: 'tip', title: 'Open a real folder instead', x: ['On Chrome or Edge, click ', { b: 'Open folder' }, ' in the Explorer toolbar to edit a real directory on your disk. See ', { a: 'Workspace and files', href: '#/using-owlet/workspace' }, '.'] }
            ]
        },
        {
            id: 'getting-started/browser-support',
            title: 'Browser support',
            description: 'Which browsers run Owlet, and which features need specific browser APIs.',
            blocks: [
                { t: 'h2', x: 'Recommended browsers' },
                { t: 'table', head: ['Browser', 'Editing & preview', 'Local folders', 'Offline install', 'Notes'], rows: [
                    ['Chrome / Edge', 'Full', 'Full', 'Full', 'Best experience — has every API Owlet uses.'],
                    ['Firefox', 'Full', 'Not available', 'Partial', 'No File System Access API; projects save to browser storage instead.'],
                    ['Safari', 'Full', 'Not available', 'Partial', 'No File System Access API; CompressionStream fallback is automatic.'],
                    ['Mobile browsers', 'Basic', 'Not available', 'Partial', 'Owlet shows a simplified mobile view under 720 px — usable for quick edits, not a full IDE.']
                ] },
                { t: 'h2', x: 'Feature-by-feature requirements' },
                { t: 'table', head: ['Feature', 'Requires', 'Fallback'], rows: [
                    ['Open a local folder', 'File System Access API (Chrome, Edge)', 'Project kept in browser storage.'],
                    ['Offline / installable app', 'Service worker over http(s)', 'Works fine from file:// without it — just not cached for offline.'],
                    ['Share links (compressed)', 'CompressionStream API', 'Falls back to uncompressed links automatically.'],
                    ['Private share links', 'WebCrypto (AES-GCM)', 'Public links still work.'],
                    ['Python', 'WebAssembly + one ~10 MB CDN download', 'Pyodide caches after the first run.'],
                    ['Clone a GitHub repo', 'Network access to api.github.com', 'Type or paste files manually instead.']
                ] },
                { t: 'callout', kind: 'warning', title: 'file:// vs http://', x: ['Opening ', { c: 'index.html' }, ' directly works for writing and previewing code. Service workers and some storage features need an ', { c: 'http://' }, ' or ', { c: 'https://' }, ' origin — serve the folder with ', { c: 'python -m http.server' }, ' for the full feature set.'] },
                { t: 'callout', kind: 'note', title: 'CDN libraries', x: ['CodeMirror, xterm.js, Pyodide, ESLint, HTMLHint, csstree and JSZip load from pinned public CDNs. With no connection at all (and no service-worker cache yet), the editor falls back and some features stay unavailable until you are online once.'] }
            ]
        },
        {
            id: 'getting-started/offline-privacy',
            title: 'Offline use and privacy',
            description: 'What Owlet stores, where it stores it, and why your code never leaves your machine.',
            blocks: [
                { t: 'h2', x: 'Your code stays on your device' },
                { t: 'p', x: 'Owlet has no backend. Every project you create is stored in your own browser — or in a real folder on your disk if you open one. Nothing is uploaded, synced, or sent to any server, ever.' },
                { t: 'list', items: [
                    [{ b: 'No accounts' }, ' — there is nothing to sign into and nothing that identifies you.'],
                    [{ b: 'No analytics' }, ' — no tracking pixels, no telemetry, no third-party scripts phoning home.'],
                    [{ b: 'No cookies' }, ' — preferences use ', { c: 'localStorage' }, ', which never leaves the browser.']
                ] },
                { t: 'h2', x: 'What is stored, and where' },
                { t: 'table', head: ['Data', 'Where', 'Notes'], rows: [
                    ['Project files', [{ c: 'localStorage' }, ' key ', { c: 'owlet:project:<name>' }], 'One key per saved browser project.'],
                    ['Last opened project', [{ c: 'owlet:lastProject' }], 'Reopened on the next visit.'],
                    ['Theme, UI prefs', [{ c: 'owlet:ui:prefs' }], 'Shared across Owlet, the docs and the landing page.'],
                    ['Editor settings', [{ c: 'owlet:settings' }], 'Font size, tab size, word wrap, sandbox and compiler keys.'],
                    ['Panel layout', [{ c: 'owlet.layout.v2' }], 'Sidebar/preview/console arrangement.'],
                    ['Files from a local folder', 'Your disk', 'Read and written through the File System Access API with your permission each session.']
                ] },
                { t: 'h2', x: 'How offline works' },
                { t: 'p', x: ['The service worker (', { c: 'sw.js' }, ') caches the app shell — HTML, CSS, JavaScript and CDN libraries — after the first load. From then on Owlet opens without a connection and can be installed like a native app (', { c: 'manifest.json' }, ').'] },
                { t: 'callout', kind: 'note', title: 'Two real limits', x: ['(1) The very first load needs internet for the CDN libraries. (2) Pyodide (~10 MB) downloads on your first Python run and is then cached. Both are one-time costs.'] },
                { t: 'h2', x: 'Share links and privacy' },
                { t: 'p', x: ['Sharing packs your project into the URL itself — nobody else stores it. A ', { b: 'public' }, ' link contains your code (compressed, but readable by anyone with the link). A ', { b: 'private' }, ' link encrypts it with AES-GCM; the key is shown separately and is never inside the link.'] },
                { t: 'callout', kind: 'warning', title: 'Private means private', x: 'Anyone who has the full link can open the project inside it. Do not paste secrets or personal data into projects you plan to share.' },
                { t: 'h2', x: 'BYOK features' },
                { t: 'p', x: 'Optional cloud sandbox and compiler features use API keys you paste yourself. They are stored only in localStorage and sent only to the provider you choose — there is no Owlet server to hold them.' },
                { t: 'callout', kind: 'tip', title: 'Wipe everything', x: ['Clear site data in your browser (or run ', { c: 'localStorage.clear()' }, ' for the origin) to remove every saved project and preference in one step.'] }
            ]
        }
    ]
});

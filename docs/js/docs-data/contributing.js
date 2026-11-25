/* ==========================================================================
   contributing.js — Group 3: for contributors. Workflow follows
   CONTRIBUTING.md (GitHub Flow, MIT). Repo tour verified against index.html
   script order and README's project structure.
   ========================================================================== */
'use strict';
window.OwletDocs = window.OwletDocs || { groups: [] };

window.OwletDocs.groups.push({
    id: 'contributing',
    title: 'Contributing',
    file: 'contributing.js',
    pages: [
        {
            id: 'contributing/ways',
            title: 'Ways to contribute',
            description: 'Code is welcome, but bugs, docs, design ideas and teaching material all count — Owlet is a learning project at heart.',
            blocks: [
                { t: 'h2', x: 'You do not need to code' },
                { t: 'list', items: [
                    [{ b: 'Report bugs' }, ' — the most valuable contribution. One good reproduction beats ten vague reports.'],
                    [{ b: 'Write docs' }, ' — these pages are plain JS objects; editing one file adds a page.'],
                    [{ b: 'Improve the UI' }, ' — proposals in issues; see the Design guide for how tokens and components work.'],
                    [{ b: 'Create templates' }, ' — starter projects for the welcome screen are a great first change.'],
                    [{ b: 'Review pull requests' }, ' — read other people’s diffs and test them; reviewing teaches the codebase fastest.']
                ] },
                { t: 'h2', x: 'If you do code' },
                { t: 'p', x: 'Pick something small first. The codebase is deliberately plain — no build step, no framework — so your first commit can ship within an hour of cloning.' },
                { t: 'callout', kind: 'tip', title: 'The golden rule', x: 'Every module is wrapped in an IIFE and attaches to window.Owlet (or window.OwletUI for the UI layer). Match the style of the file you touch rather than imposing a new one.' }
            ]
        },
        {
            id: 'contributing/setup',
            title: 'Dev setup and repo tour',
            description: 'Zero tooling: clone, open index.html, change files, refresh. Here is the map.',
            blocks: [
                { t: 'h2', x: 'Setup' },
                { t: 'code', remember: 'setup', lang: 'bash', tabs: [
                    { label: 'Windows', lang: 'bash', code: 'git clone https://github.com/BrixoByte/Owlet.git\ncd Owlet\nstart index.html\n\n# or serve it (needed for the service worker)\npython -m http.server 8000' },
                    { label: 'macOS / Linux', lang: 'bash', code: 'git clone https://github.com/BrixoByte/Owlet.git\ncd Owlet\nopen index.html        # or xdg-open on Linux\n\n# or serve it (needed for the service worker)\npython3 -m http.server 8000' }
                ] },
                { t: 'p', x: 'No npm install. No bundler. Your editor of choice + browser devtools is the whole toolchain.' },
                { t: 'h2', x: 'Repo tour' },
                { t: 'filetree', gutter: 34, lines: [
                    { text: 'index.html', note: 'app shell: markup + pinned CDN script tags' },
                    { text: 'css/', note: 'design system: tokens → themes → components → layout' },
                    { text: 'js/state.js', note: 'single source of truth: files, tabs, groups, events' },
                    { text: 'js/storage.js', note: 'localStorage + File System Access backends' },
                    { text: 'js/filetree.js', note: 'Explorer sidebar tree' },
                    { text: 'js/tabs.js', note: 'editor tab bar' },
                    { text: 'js/editorgroups.js', note: 'the editor group (splitting removed)' },
                    { text: 'js/editor.js', note: 'CodeMirror wrapper: modes, hints, lint glue' },
                    { text: 'js/preview.js', note: 'Blob-URL preview + console bridge' },
                    { text: 'js/console.js', note: 'console panel + message model' },
                    { text: 'js/error-details.js', note: 'error details dialog' },
                    { text: 'js/lint.js', note: 'ESLint / HTMLHint / csstree wiring' },
                    { text: 'js/python.js', note: 'Pyodide loader + runner' },
                    { text: 'js/terminal.js', note: 'xterm.js + pluggable engines' },
                    { text: 'js/sandbox.js', note: 'BYOK cloud sandbox adapters' },
                    { text: 'js/compiler.js', note: 'BYOK compiler API adapter' },
                    { text: 'js/share.js', note: 'public + private share links' },
                    { text: 'js/clone.js', note: 'GitHub tarball import' },
                    { text: 'js/app.js', note: 'bootstrap, toolbar, shortcuts, dialogs' },
                    { text: 'js/ui/', note: 'design-system layer — talks to logic via contract.js' },
                    { text: 'sw.js + manifest.json', note: 'PWA / offline' },
                    { text: 'docs/', note: 'this documentation site' },
                    { text: 'landing/', note: 'the marketing page' }
                ] },
                { t: 'callout', kind: 'warning', title: 'Two architectures in one file', x: ['index.html loads logic modules (', { c: 'js/*.js' }, ') and then the UI layer (', { c: 'js/ui/*.js' }, '). The UI never touches logic directly — it goes through ', { c: 'js/ui/contract.js' }, '. Keep that boundary when you add features.'] }
            ]
        },
        {
            id: 'contributing/standards',
            title: 'Code standards',
            description: 'Plain ES5-friendly JavaScript, small functions, comments that explain why — so a beginner can read the whole codebase.',
            blocks: [
                { t: 'h2', x: 'Style rules' },
                { t: 'list', items: [
                    [{ b: 'var, not let/const' }, ' — the app codebase uses ES5-style declarations for consistency and maximum browser compatibility.'],
                    [{ b: 'IIFE modules' }, ' — wrap each file in ', { c: '(function () { ... })();' }, ' and expose an API on ', { c: 'window.Owlet' }, ' (or ', { c: 'OwletUI' }, ').'],
                    [{ b: 'Small functions' }, ' — one job each, named for what they do. If a function needs a section comment to navigate, split it.'],
                    [{ b: 'Comments explain why' }, ' — the code already says what. Especially mark stubs with ', { c: '// TODO:' }, '.'],
                    [{ b: 'No dependencies' }, ' — new CDN libraries need a strong justification; the beginner-readable principle wins.'],
                    [{ b: 'No innerHTML with raw strings' }, ' — build DOM with createElement/textContent (the docs renderer shows the pattern).']
                ] },
                { t: 'h2', x: 'Checking your work' },
                { t: 'code', lang: 'bash', code: '# Syntax-check every file you changed\nnode --check js/yourfile.js\n\n# Then the real test: open the app and use it.\n# There is no test suite — manual verification is honest verification.' },
                { t: 'callout', kind: 'note', title: 'No CI gate (yet)', x: 'There is no automated test suite. Before a PR, click through the feature you changed and the ones next to it — that is the suite.' }
            ]
        },
        {
            id: 'contributing/pr-workflow',
            title: 'Pull request workflow',
            description: 'Owlet uses GitHub Flow: fork, branch from main, one focused change per pull request.',
            blocks: [
                { t: 'h2', x: 'The loop' },
                { t: 'steps', items: [
                    { title: 'Fork and branch', text: [{ c: 'git checkout -b feature/your-thing' }, ' from an up-to-date ', { c: 'main' }, '.'] },
                    { title: 'Make the change', text: 'One feature or fix per PR — small diffs get reviewed, big ones stall.' },
                    { title: 'Update docs', text: 'If you changed behaviour, update the matching page in docs/js/docs-data/. If you changed the UI contract, update CONTRACT.md.' },
                    { title: 'Verify manually', text: 'Open the app, use the feature, try the edge cases, note any console errors.' },
                    { title: 'Open the PR', text: 'Describe what changed and how you tested it. Screenshots help for UI changes.' }
                ] },
                { t: 'h2', x: 'What reviewers look for' },
                { t: 'list', items: [
                    ['Does it still work from file:// and on GitHub Pages?'],
                    ['Does it stay within the logic/UI contract boundary?'],
                    ['Is it readable by a beginner — small functions, honest comments?'],
                    ['Are unfinished paths marked with TODO, not left looking complete?'],
                    ['Docs updated if behaviour changed?']
                ] },
                { t: 'callout', kind: 'tip', title: 'Draft PRs are fine', x: 'Open early and mark the PR a draft. Feedback on direction is cheaper than a rewrite.' }
            ]
        },
        {
            id: 'contributing/first-issues',
            title: 'Good first issues',
            description: 'Concrete starter tasks that touch one file and teach you the codebase shape.',
            blocks: [
                { t: 'h2', x: 'Easy wins' },
                { t: 'list', items: [
                    [{ b: 'New welcome template' }, ' — add a starter project to the welcome screen. Touches one file, instantly visible.'],
                    [{ b: 'Docs page' }, ' — write or fix a page in ', { c: 'docs/js/docs-data/' }, '. No app code involved.'],
                    [{ b: 'Terminal command' }, ' — add a command to the local engine in ', { c: 'js/terminal.js' }, ' — a single ', { c: 'case' }, ' block.'],
                    [{ b: 'Badge/copy fixes' }, ' — polish strings, labels and empty states.'],
                    [{ b: 'Accessibility pass' }, ' — aria labels, focus order and contrast on one component at a time.']
                ] },
                { t: 'h2', x: 'Medium projects' },
                { t: 'list', items: [
                    ['Wire a stub contract event to a real backend (the event table in CONTRACT.md is the to-do list).'],
                    ['Extend the docs block renderer with a new block type.'],
                    ['Improve console object inspection (currently stringifies everything).'],
                    ['Finish the sandbox terminal bridge — the biggest open feature.']
                ] },
                { t: 'callout', kind: 'note', title: 'Check the issue tracker', x: [{ a: 'github.com/BrixoByte/Owlet/issues', href: 'https://github.com/BrixoByte/Owlet/issues' }, ' labels suitable issues. If nothing fits, open an issue describing what you want to do — maintainers will point you at the right file.'] }
            ]
        },
        {
            id: 'contributing/coc-license',
            title: 'Community and license',
            description: 'MIT licensed — your contributions stay MIT. Be kind, be patient, remember that many contributors are learners.',
            blocks: [
                { t: 'h2', x: 'License' },
                { t: 'p', x: ['Owlet is ', { a: 'MIT licensed', href: 'https://github.com/BrixoByte/Owlet/blob/main/LICENSE' }, '. As CONTRIBUTING.md puts it: "when you submit code changes, your submissions are understood to be under the same MIT License that covers the project." You keep copyright; the project keeps openness.'] },
                { t: 'h2', x: 'Bug reports that get fixed' },
                { t: 'list', items: [
                    ['Summary and background in two sentences.'],
                    ['Exact reproduction steps — including the browser and whether you used file:// or a server.'],
                    ['What you expected vs what happened.'],
                    ['Sample code or a share link if possible.'],
                    ['Anything you already tried.']
                ] },
                { t: 'h2', x: 'Conduct' },
                { t: 'p', x: 'Owlet is built for beginners, and many contributors are beginners too. Be patient in reviews, explain rather than dismiss, and write the feedback you would have wanted to read at the start of your journey.' }
            ]
        }
    ]
});

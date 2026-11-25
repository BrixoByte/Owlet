/* ==========================================================================
   using-owlet.js — Group 2: the end-user guide. Statuses verified against
   the source: terminal local mode works (js/terminal.js), Python runs via
   Pyodide (js/python.js), cloud sandbox adapters exist but the terminal
   bridge is not finished (js/sandbox.js), editor splitting was removed
   (js/editorgroups.js line 5), AI/Git/Extensions are stub panels
   (index.html side-views + js/ui/mock.js).
   ========================================================================== */
'use strict';
window.OwletDocs = window.OwletDocs || { groups: [] };

// One shared list of keyboard shortcuts — the "shortcuts" and "cheat sheet"
// pages both render from this (add a row here and both pages update).
window.OwletDocs.SHORTCUTS = [
    { keys: 'Ctrl+S', action: 'Save the active file (disk) or the whole project (browser)', ctx: 'Everywhere' },
    { keys: 'Ctrl+P', action: 'Open the command palette — files, or type > for commands', ctx: 'Everywhere' },
    { keys: 'Ctrl+W', action: 'Close the current tab', ctx: 'Everywhere' },
    { keys: 'Ctrl+`', action: 'Toggle the terminal panel', ctx: 'Everywhere' },
    { keys: 'Ctrl+B', action: 'Show or hide the Explorer sidebar', ctx: 'Everywhere' },
    { keys: 'Ctrl+J', action: 'Show or hide the bottom panel', ctx: 'Everywhere' },
    { keys: 'Alt+R', action: 'Refresh the preview', ctx: 'Everywhere' },
    { keys: '?', action: 'Open the help dialog (press outside a text field)', ctx: 'Everywhere' },
    { keys: 'Esc', action: 'Close the open dialog; exit Zen layout', ctx: 'Everywhere' },
    { keys: 'Ctrl+Space', action: 'Trigger code completion', ctx: 'Editor' },
    { keys: 'Ctrl+Z / Ctrl+Y', action: 'Undo / redo', ctx: 'Editor' },
    { keys: 'Ctrl+A', action: 'Select all', ctx: 'Editor' },
    { keys: 'Ctrl+D', action: 'Delete line', ctx: 'Editor' },
    { keys: 'Ctrl+Enter', action: 'Insert line below', ctx: 'Editor' },
    { keys: 'Tab', action: 'Accept a suggestion or indent the selection', ctx: 'Editor' },
    { keys: 'Up / Down', action: 'Step through command history', ctx: 'Terminal' },
    { keys: 'Enter', action: 'Open error details for the focused row', ctx: 'Console' }
];

window.OwletDocs.groups.push({
    id: 'using-owlet',
    title: 'Using Owlet',
    file: 'using-owlet.js',
    pages: [
        {
            id: 'using-owlet/workspace',
            title: 'Workspace and files',
            description: 'The Explorer sidebar holds a whole project: files, folders, tabs and saved projects — or a real folder from your disk.',
            blocks: [
                { t: 'h2', x: 'The Explorer' },
                { t: 'p', x: 'The left sidebar lists every file in the current project. The filter box above the tree narrows it by name. Folders are created with the New folder button and can be nested.' },
                { t: 'list', items: [
                    [{ b: 'New file' }, ' — type a name with an extension (', { c: '.html' }, ', ', { c: '.css' }, ', ', { c: '.js' }, ', ', { c: '.py' }, ', or anything else). It opens as a tab immediately.'],
                    [{ b: 'Rename / delete' }, ' — right-click a file or use its inline controls. Deleting a folder removes everything inside it.'],
                    [{ b: 'Filter' }, ' — the search box above the tree matches file names, useful in big projects.']
                ] },
                { t: 'h2', x: 'Tabs' },
                { t: 'list', items: [
                    ['Click a file to open it in a tab; the active tab shows a highlight.'],
                    ['A filled dot means unsaved changes (browser projects autosave after about a second anyway).'],
                    [{ kbd: 'Ctrl+W' }, ' closes the active tab. The close icon pins a tab — a pinned tab keeps it open when clicked.'],
                    ['Tabs can be dragged to reorder them.']
                ] },
                { t: 'h2', x: 'Welcome templates' },
                { t: 'p', x: 'With no files open, the welcome screen offers starter templates — pick one to generate a ready-to-run project (index.html, style.css, script.js).' },
                { t: 'h2', x: 'Open a real folder (Chromium)' },
                { t: 'steps', items: [
                    { title: 'Click Open folder', text: 'The folder-open button sits in the Explorer toolbar (Chrome and Edge only).' },
                    { title: 'Pick a directory', text: 'Your browser asks permission for read and write access to that folder, once per session.' },
                    { title: 'Edit normally', text: [{ kbd: 'Ctrl+S' }, ' now writes back to the real file on disk instead of browser storage.'] }
                ] },
                { t: 'callout', kind: 'note', title: 'Firefox and Safari', x: 'The File System Access API does not exist there yet, so the folder button shows a message and the project simply stays in browser storage. Everything else works.' },
                { t: 'h2', x: 'Saved projects' },
                { t: 'p', x: ['Browser-mode projects save to ', { c: 'localStorage' }, ' under ', { c: 'owlet:project:<name>' }, '. The ', { b: 'Saved Projects' }, ' dialog (File menu) lists them all so you can reopen or delete any of them.'] },
                { t: 'h2', x: 'Clone a repository' },
                { t: 'p', x: ['The Clone dialog (File menu → Clone repository) downloads a public GitHub repo through the GitHub tarball API and opens it as a project — a snapshot of the default branch, read-only until you save your own copy with ', { kbd: 'Ctrl+S' }, '. Works with ', { c: 'owner/repo' }, ' or a full GitHub URL.'] }
            ]
        },
        {
            id: 'using-owlet/editor',
            title: 'The editor',
            description: 'Owlet uses CodeMirror 5 — a real editor with syntax highlighting, automatic suggestions, linting and formatting.',
            blocks: [
                { t: 'h2', x: 'What you get' },
                { t: 'list', items: [
                    [{ b: 'Syntax highlighting' }, ' for HTML (htmlmixed), CSS, JavaScript and Python — picked from the file extension.'],
                    [{ b: 'Auto-close' }, ' — tags close themselves in HTML; brackets, quotes and parentheses pair up everywhere.'],
                    [{ b: 'Bracket matching' }, ' — the bracket under your cursor and its partner are highlighted.'],
                    [{ b: 'Line numbers' }, ', current-line highlight and a fold margin, all toggleable in Settings.']
                ] },
                { t: 'h2', x: 'Auto-suggest' },
                { t: 'p', x: ['Owlet shows completions as you type — no shortcut needed. Word characters in JS, ', { c: '<' }, ' in HTML and ', { c: ':' }, ' in CSS trigger the popup. Press ', { kbd: 'Ctrl+Space' }, ' to force it open, and ', { kbd: 'Tab' }, ' or ', { kbd: 'Enter' }, ' to accept.'] },
                { t: 'h2', x: 'Linting' },
                { t: 'p', x: 'Real linters run in the browser and underline problems as you type:' },
                { t: 'table', head: ['Language', 'Linter', 'What it catches'], rows: [
                    ['JavaScript', 'ESLint (browser build)', 'Syntax errors and common rule violations.'],
                    ['HTML', 'HTMLHint', 'Unclosed tags, invalid attributes, missing alt text.'],
                    ['CSS', 'css-tree', 'Syntax errors and unknown property names.'],
                    ['Python', 'Pyodide ast.parse', 'Syntax errors (checked on run).']
                ] },
                { t: 'p', x: 'Lint results also feed the Problems tab in the bottom panel, with file and line numbers.' },
                { t: 'h2', x: 'Formatting and helpers' },
                { t: 'list', items: [
                    ['The format button in the activity rail tidies the active document.'],
                    ['The word-wrap toggle switches soft wrapping on or off.'],
                    ['Settings → Editor controls font size (10–24), tab size (2–8), line numbers and word wrap.']
                ] },
                { t: 'callout', kind: 'tip', title: 'Big files', x: 'Owlet is designed for learning-scale projects. It stays comfortable well past a few hundred lines per file; extremely large files (tens of thousands of lines) are better in a desktop editor.' }
            ]
        },
        {
            id: 'using-owlet/live-preview',
            title: 'Live preview',
            description: 'A sandboxed iframe renders your multi-file project as you type — with device sizes, zoom and a full error banner.',
            blocks: [
                { t: 'h2', x: 'How it works' },
                { t: 'p', x: ['Every file in your project becomes a Blob URL, and relative paths like ', { c: './style.css' }, ' or ', { c: 'js/app.js' }, ' are rewritten to point at those blobs. The page renders inside a sandboxed iframe (', { c: 'allow-scripts allow-same-origin' }, ') — so real multi-file projects work exactly like they would on a static host.'] },
                { t: 'h2', x: 'Preview controls' },
                { t: 'table', head: ['Control', 'What it does'], rows: [
                    ['Device dropdown', 'Applies a named viewport size (phone, tablet, desktop presets).'],
                    ['Rotate', 'Swaps the device width and height.'],
                    ['Zoom', 'Scales the preview stage from fit-down to 200%.'],
                    ['Auto toggle', 'Updates the preview as you type. Off = refresh manually with the button or Alt+R.'],
                    ['Frame toggle', 'Draws a device frame around the viewport.'],
                    ['Light / dark surround', 'Changes the preview stage background, not your page’s own colours.'],
                    ['Drag handles', 'Pull the corner and edge handles to try any custom size.'],
                    ['Open in new window', 'Opens the rendered page in a separate browser window.'],
                    ['Refresh / close', [{ kbd: 'Alt+R' }, ' refreshes; the X hides the pane.']]
                ] },
                { t: 'h2', x: 'Errors in the preview' },
                { t: 'p', x: 'A red banner appears on top of the preview when your page throws — with the message and, when known, the file and line. Clicking the banner link jumps to that line in the editor.' },
                { t: 'h2', x: 'The console bridge' },
                { t: 'p', x: ['A small script is injected into every preview. It proxies ', { c: 'console.log' }, '/', { c: 'warn' }, '/', { c: 'error' }, ' and reports runtime errors, syntax errors, unhandled rejections and failed resources back to Owlet through ', { c: 'postMessage' }, ' — that is what fills the Console panel.'] },
                { t: 'callout', kind: 'planned', title: 'Inspector', x: 'The crosshair button in the URL bar is a stub for a future element inspector. It currently shows a placeholder note.' }
            ]
        },
        {
            id: 'using-owlet/console',
            title: 'Console and error details',
            description: 'Everything your page prints or throws lands in the bottom Console panel — filterable, searchable, and expandable into full error details.',
            blocks: [
                { t: 'h2', x: 'What the console captures' },
                { t: 'list', items: [
                    [{ c: 'console.log' }, ', ', { c: 'console.info' }, ', ', { c: 'console.warn' }, ' and ', { c: 'console.error' }, ' from your preview page.'],
                    ['Runtime exceptions with file and line where available.'],
                    ['Syntax errors and unhandled promise rejections.'],
                    ['Failed resource loads (missing files, blocked requests).'],
                    ['Python output — ', { c: 'print()' }, ' goes to the console, and tracebacks too.'],
                    ['Owlet internal messages when Debug mode is on.']
                ] },
                { t: 'h2', x: 'Toolbar' },
                { t: 'table', head: ['Control', 'What it does'], rows: [
                    ['Level chips', 'Filter by Errors, Warnings or Logs — toggled independently.'],
                    ['Filter box', 'Free-text search inside the message text.'],
                    ['Source dropdown', 'Show project messages, Owlet-internal messages, or both.'],
                    ['Timestamps', 'Prepends a clock time to each line.'],
                    ['Debug', 'Shows Owlet’s own internal log lines (off by default).'],
                    ['Clear', 'Empties the console.']
                ] },
                { t: 'h2', x: 'Error details' },
                { t: 'p', x: ['Double-click any error row (or select it and press ', { kbd: 'Enter' }, ') to open the full details dialog:'] },
                { t: 'list', items: [
                    ['Level, timestamp and exact file/line/column.'],
                    ['The complete message and stack trace.'],
                    ['A code frame showing the offending lines.'],
                    ['Every argument passed to console methods, shown as a tree.'],
                    ['A suggested fix for common beginner errors.'],
                    ['Buttons to copy the error or the stack, and to jump to the location.']
                ] },
                { t: 'callout', kind: 'tip', title: 'Jump to the bug', x: 'The location button in the details dialog opens the file and puts the cursor on the failing line — the fastest loop there is.' },
                { t: 'h2', x: 'Known limits' },
                { t: 'list', items: [
                    ['Objects printed to the console show as strings, not expandable trees.'],
                    ['Very chatty pages can produce thousands of lines — use the filters.']
                ] }
            ]
        },
        {
            id: 'using-owlet/split-view',
            title: 'Split view',
            badge: 'planned',
            badgeNote: 'Editor splitting was removed in favour of a simpler single editor group.',
            description: 'Splitting the editor into multiple groups is planned but not currently available. Side-by-side editing and preview does work today.',
            blocks: [
                { t: 'callout', kind: 'planned', title: 'Planned', x: ['The codebase originally had multi-group split editors; the feature was intentionally removed (see the note at the top of ', { c: 'js/editorgroups.js' }, ': "Splitting was removed — exactly one editor group exists at a time"). It may return in a future version — follow the roadmap.'] },
                { t: 'h2', x: 'What you can do today' },
                { t: 'list', items: [
                    [{ b: 'Editor + preview side by side' }, ' — the default Classic layout already puts the live preview to the right of the editor.'],
                    [{ b: 'Preview below' }, ' — the bottom dock can host the preview, giving a vertical split.'],
                    [{ b: 'Resize freely' }, ' — drag the dividers between sidebar, editor, preview and console to any size.'],
                    [{ b: 'Multiple tabs' }, ' — open as many files as you want and switch instantly.'],
                    [{ b: 'Open preview in a new window' }, ' — a real second window showing the rendered page.']
                ] },
                { t: 'h2', x: 'If it returns' },
                { t: 'p', x: 'The underlying group model still exists in state.js, so a future release can re-enable split right / split down and tab dragging between groups without redesigning the state layer.' }
            ]
        },
        {
            id: 'using-owlet/terminal',
            title: 'Terminal',
            description: 'A real xterm.js terminal in the bottom panel. Local mode works fully today; the cloud mode engine is in progress.',
            blocks: [
                { t: 'h2', x: 'Local mode — works today' },
                { t: 'p', x: [{ kbd: 'Ctrl+`' }, ' or the Terminal dock tab opens an xterm.js terminal. In Local mode it understands virtual commands over your project plus two REPLs:'] },
                { t: 'table', head: ['Command', 'What it does'], rows: [
                    [{ c: 'help' }, 'Lists every available command.'],
                    [{ c: 'ls' }, 'Lists all files in the project.'],
                    [{ c: 'cd <dir>' }, 'Changes the virtual working directory (affects cat/run paths).'],
                    [{ c: 'pwd' }, 'Shows the current virtual directory.'],
                    [{ c: 'cat <file>' }, 'Prints a file’s contents.'],
                    [{ c: 'run <file>' }, 'Runs a .js file in-page or a .py file through Pyodide.'],
                    [{ c: 'js <code>' }, 'Evaluates JavaScript — a quick REPL.'],
                    [{ c: 'py <code>' }, 'Runs a Python one-liner via Pyodide (lazy-loads on first use).'],
                    [{ c: 'python' }, 'Runs the currently open .py file.'],
                    [{ c: 'clear' }, 'Clears the terminal.'],
                    [{ c: 'exit' }, 'An inside joke — try it.']
                ] },
                { t: 'p', x: [{ kbd: 'Up' }, ' and ', { kbd: 'Down' }, ' walk through command history. The toolbar also offers copy-output and kill-session buttons.'] },
                { t: 'h2', x: 'Cloud mode' },
                { t: 'callout', kind: 'warning', title: 'In progress', x: ['Provider adapters exist (Daytona, E2B, Modal, Upstash Box) and ', { b: 'Test connection' }, ' in Settings works. But attaching the terminal to a live cloud shell and syncing files is not finished — today the terminal always runs in Local mode. Track progress in the roadmap, Phase 5.'] },
                { t: 'h2', x: 'Terminal profiles' },
                { t: 'p', x: 'The profile dropdown in the terminal toolbar is wired for multiple named terminals; cloud profiles will appear there when the engine bridge lands.' }
            ]
        },
        {
            id: 'using-owlet/themes-layout',
            title: 'Themes and layout presets',
            description: 'Dark, light or system theme, and four one-click workbench layouts — all persisted.',
            blocks: [
                { t: 'h2', x: 'Themes' },
                { t: 'list', items: [
                    [{ b: 'Dark / Light / System' }, ' — set in Settings → Appearance, or flip instantly with the sun button in the top bar.'],
                    [{ b: 'Accent' }, ' — always Ember orange; it is part of the brand, not a preference.'],
                    ['The choice is saved in ', { c: 'owlet:ui:prefs' }, ' and is shared with the docs and the landing page.']
                ] },
                { t: 'h2', x: 'Layout presets' },
                { t: 'table', head: ['Preset', 'Layout'], rows: [
                    ['Classic', 'Explorer left, editor centre, preview right, console bottom.'],
                    ['Preview Right', 'Wider preview on the right; explorer hidden.'],
                    ['Focus', 'Editor only — every side and bottom panel hidden.'],
                    ['Zen', 'Editor only, full-bleed; Esc returns to Classic.']
                ] },
                { t: 'p', x: 'Open the preset menu from the status bar (bottom left) or View menu.' },
                { t: 'h2', x: 'Resizing' },
                { t: 'list', items: [
                    ['Drag the dividers between the sidebar, editor, preview and bottom dock.'],
                    ['Panel sizes are remembered in ', { c: 'owlet.layout.v2' }, '.'],
                    ['Settings → Panels has a Reset panel layout button if things get tangled.']
                ] },
                { t: 'h2', x: 'Mobile view' },
                { t: 'p', x: 'Under 720 px the workbench collapses into a single view with bottom tabs: Editor, Preview, Console. It is designed for quick checks and small fixes, not full sessions.' }
            ]
        },
        {
            id: 'using-owlet/shortcuts',
            title: 'Keyboard shortcuts',
            description: 'Every keyboard shortcut in Owlet. Type in the filter to find one quickly.',
            blocks: [
                { t: 'callout', kind: 'tip', title: 'In-app list', x: ['The same list lives inside Owlet: press ', { kbd: '?' }, ' or open Settings → Shortcuts.'] },
                { t: 'shortcut-table', filter: true },
                { t: 'h2', x: 'Terminal command history' },
                { t: 'p', x: [{ kbd: 'Up' }, '/', { kbd: 'Down' }, ' in the terminal walk through previous commands — like a normal shell.'] },
                { t: 'callout', kind: 'note', title: 'macOS', x: [{ kbd: 'Cmd' }, ' works everywhere ', { kbd: 'Ctrl' }, ' is listed.'] }
            ]
        },
        {
            id: 'using-owlet/cheat-sheet',
            title: 'Cheat sheet',
            description: 'A print-friendly reference of Owlet shortcuts and terminal commands. Print it with Ctrl+P.',
            blocks: [
                { t: 'callout', kind: 'note', title: 'Print me', x: ['This page is styled for paper — use your browser’s print (', { kbd: 'Ctrl+P' }, ') and the sidebars and colours disappear.'] },
                { t: 'h2', x: 'Shortcuts' },
                { t: 'shortcut-table' },
                { t: 'h2', x: 'Terminal commands' },
                { t: 'table', head: ['Command', 'Does'], rows: [
                    [{ c: 'help' }, 'List commands'], [{ c: 'ls' }, 'List files'],
                    [{ c: 'cd <dir>' }, 'Change virtual directory'], [{ c: 'pwd' }, 'Print virtual directory'],
                    [{ c: 'cat <file>' }, 'Print file contents'], [{ c: 'run <file>' }, 'Run a .js or .py file'],
                    [{ c: 'js <code>' }, 'Evaluate JavaScript'], [{ c: 'py <code>' }, 'Run Python one-liner'],
                    [{ c: 'python' }, 'Run the open .py file'], [{ c: 'clear' }, 'Clear the terminal']
                ] }
            ]
        },
        {
            id: 'using-owlet/settings',
            title: 'Settings, saving and exporting',
            description: 'The Settings dialog, how projects are saved, and every way to get code in or out of Owlet.',
            blocks: [
                { t: 'h2', x: 'The Settings dialog' },
                { t: 'table', head: ['Section', 'What it holds'], rows: [
                    ['Appearance', 'Theme (system/dark/light).'],
                    ['Editor', 'Font size, tab size, line numbers, word wrap, max editor groups.'],
                    ['Panels', 'Auto-refresh toggle and Reset panel layout.'],
                    ['Shortcuts', 'The in-app shortcut table.'],
                    ['Sandbox', 'Cloud sandbox provider, API key, proxy URL, Test connection.'],
                    ['Compiler', 'Compiler API endpoint and key for compiled languages.'],
                    ['About', 'Version info and a link to keyboard shortcuts.']
                ] },
                { t: 'h2', x: 'Saving' },
                { t: 'list', items: [
                    [{ b: 'Autosave' }, ' — browser projects save about a second after you stop typing.'],
                    [{ b: 'Ctrl+S' }, ' — browser mode saves the whole project; folder mode writes the active file to disk.'],
                    ['Saved projects appear in the Saved Projects dialog and the welcome screen’s recent list.']
                ] },
                { t: 'h2', x: 'Exporting' },
                { t: 'list', items: [
                    [{ b: 'Download ZIP' }, ' — packs every file into a .zip via JSZip (File menu).'],
                    [{ b: 'Share link' }, ' — compresses the project into the URL. No server involved; see below.'],
                    [{ b: 'Private share link' }, ' — same, AES-GCM encrypted; you send the key separately.']
                ] },
                { t: 'callout', kind: 'warning', title: 'Links contain your code', x: 'A public share link carries the project inside itself — anyone who has it can read everything in it. Use the private option (or just a ZIP) for anything sensitive.' },
                { t: 'h2', x: 'Getting code in' },
                { t: 'list', items: [
                    ['Open a local folder (Chromium) — see Workspace and files.'],
                    ['Clone a public GitHub repo — File menu → Clone repository.'],
                    ['Paste or type — every file is plain text in the editor.']
                ] }
            ]
        },
        {
            id: 'using-owlet/python',
            title: 'Python',
            description: 'Real CPython in your browser via Pyodide — write .py files, run them, and print to the console.',
            blocks: [
                { t: 'badge-list', items: [{ kind: 'ok', text: 'Available' }] },
                { t: 'h2', x: 'How to run Python' },
                { t: 'steps', items: [
                    { title: 'Create a .py file', text: 'Any file ending in .py opens a Python-flavoured editor.' },
                    { title: 'Press Run', text: 'The Run button (or the terminal’s run command) executes it through Pyodide.' },
                    { title: 'Read the console', text: 'print() output and tracebacks appear in the Console panel.' }
                ] },
                { t: 'h2', x: 'The first run is slow — once' },
                { t: 'p', x: 'Pyodide (~10 MB) downloads from a CDN the first time you run Python, then it is cached. Later runs start instantly and even work offline.' },
                { t: 'h2', x: 'What works' },
                { t: 'list', items: [
                    ['Standard-library Python — real CPython compiled to WebAssembly.'],
                    ['Project files are copied into Pyodide’s virtual filesystem, so ', { c: 'import helper' }, ' works across .py files.'],
                    [{ c: 'py <code>' }, ' in the terminal runs a one-liner; ', { c: 'python' }, ' runs the open file.'],
                    ['Syntax checking via ', { c: 'ast.parse' }, ' before a run.']
                ] },
                { t: 'callout', kind: 'warning', title: 'Limits', x: 'Packages that need system libraries or sockets will not work. NumPy/Pandas exist in Pyodide but download a lot of data on first use.' }
            ]
        },
        {
            id: 'using-owlet/cloud-sandboxes',
            title: 'Cloud sandboxes (BYOK)',
            badge: 'experimental',
            badgeNote: 'Provider connection works; the terminal bridge is unfinished.',
            description: 'Optional: connect a free Daytona, E2B, Modal or Upstash Box account for a real Node.js environment. Keys stay in your browser.',
            blocks: [
                { t: 'callout', kind: 'warning', title: 'In progress', x: 'This feature is partially built. You can configure a provider and test the connection today — but the cloud shell does not attach to the terminal yet and files do not sync. Local mode terminal, Python and web preview all work fully without it.' },
                { t: 'h2', x: 'The idea' },
                { t: 'p', x: 'Owlet itself stays free. Power users can connect their own free-tier sandbox account (BYOK — bring your own key) to unlock a real Linux shell with Node.js, npm and bash. The project pays nothing; you use your own free credits.' },
                { t: 'h2', x: 'Setting it up' },
                { t: 'steps', items: [
                    { title: 'Create a free account', text: 'Daytona, E2B, Modal or Upstash Box — all have free tiers or signup credits.' },
                    { title: 'Open Settings → Sandbox', text: 'Pick the provider and paste your API key. It is stored only in your browser’s localStorage.' },
                    { title: 'Test connection', text: 'The button does an authenticated API call and reports success or the exact HTTP error.' }
                ] },
                { t: 'h2', x: 'CORS proxy (if the test fails)' },
                { t: 'p', x: ['Some providers block direct browser requests. A ~20-line Cloudflare Worker forwards your own key — deploy it on the free tier and paste its URL into Settings → Proxy URL. The worker source is in ', { a: 'the README', href: 'https://github.com/BrixoByte/Owlet/blob/main/README.md' }, '.'] },
                { t: 'h2', x: 'Status' },
                { t: 'badge-list', items: [
                    { kind: 'ok', text: 'Provider settings + test' },
                    { kind: 'progress', text: 'Sandbox create/destroy' },
                    { kind: 'planned', text: 'Terminal bridge' },
                    { kind: 'planned', text: 'File sync' }
                ] }
            ]
        },
        {
            id: 'using-owlet/compiler',
            title: 'Compiler APIs (BYOK)',
            badge: 'experimental',
            badgeNote: 'Works when you configure an endpoint — no default service is bundled.',
            description: 'Optional: run C++, Java, Rust, Go and more by pointing Owlet at a Judge0-style compiler API you control.',
            blocks: [
                { t: 'h2', x: 'How it works' },
                { t: 'p', x: ['Owlet can POST the active file to any Judge0-style compile endpoint. It sends ', { c: '{ language, source, stdin }' }, ' and prints ', { c: 'stdout' }, '/', { c: 'stderr' }, ' to the Console. The language is picked from the file extension.'] },
                { t: 'h2', x: 'Supported extensions' },
                { t: 'table', head: ['Extension', 'Language sent'], rows: [
                    ['.c, .h', 'c'], ['.cpp, .cc, .cxx, .hpp', 'cpp'],
                    ['.java', 'java'], ['.py', 'python'],
                    ['.js, .mjs', 'javascript'], ['.ts', 'typescript'],
                    ['.go', 'go'], ['.rs', 'rust'],
                    ['.rb', 'ruby'], ['.php', 'php'],
                    ['.cs', 'csharp'], ['.swift', 'swift'],
                    ['.kt', 'kotlin'], ['.sql', 'sql'],
                    ['.sh, .bash', 'bash']
                ] },
                { t: 'h2', x: 'Setup' },
                { t: 'steps', items: [
                    { title: 'Get a compiler endpoint', text: 'Any Judge0-compatible service, or your own — Owlet does not bundle one.' },
                    { title: 'Settings → Compiler', text: 'Paste the endpoint URL and, if needed, an API key (stored in localStorage only).' },
                    { title: 'Press Run', text: 'With a compiled-language file active, Run posts it to the endpoint and prints the result.' }
                ] },
                { t: 'callout', kind: 'note', title: 'Piston is gone', x: 'The old free Piston public endpoint became whitelist-only, so it is deliberately not hardcoded. Bring your own endpoint — the payload shape is standard.' }
            ]
        },
        {
            id: 'using-owlet/ai-chat',
            title: 'AI chat',
            badge: 'planned',
            badgeNote: 'The panel exists; no AI backend is connected.',
            description: 'A side panel for AI assistance is designed but not connected to anything yet.',
            blocks: [
                { t: 'callout', kind: 'planned', title: 'Planned', x: ['The AI chat icon in the activity rail opens a placeholder panel ("The chat panel is designed but not connected yet"). The ', { c: 'ui:ai-send' }, ' and ', { c: 'ui:ai-stop' }, ' events in the UI contract are stubs awaiting a backend.'] },
                { t: 'h2', x: 'Where it stands' },
                { t: 'p', x: 'The design intent is an optional, BYOK-style assistant — help writing or explaining code without any account or cost to the project. There is no implementation date; see the roadmap and the repository issues for discussion.' },
                { t: 'h2', x: 'Mock data notice' },
                { t: 'p', x: ['If you see AI-related UI elements, they come from the mock data layer (', { c: 'js/ui/mock.js' }, '), which is on by default for development. Disable it with ', { c: "localStorage.setItem('owlet:ui:mock','0')" }, ' in the browser console.'] }
            ]
        },
        {
            id: 'using-owlet/git',
            title: 'Git integration',
            badge: 'planned',
            badgeNote: 'The Source Control panel shows mock data only.',
            description: 'A Source Control view exists in the sidebar, but real Git operations are not connected. Cloning a repo snapshot does work.',
            blocks: [
                { t: 'callout', kind: 'planned', title: 'Planned', x: ['The Source Control view (git icon in the activity rail) shows coloured change badges from mock data — ', { c: 'ui:git-stage' }, ' and friends are contract stubs, not working Git.'] },
                { t: 'h2', x: 'What works today' },
                { t: 'list', items: [
                    [{ b: 'Clone a repository' }, ' — File → Clone repository imports a public GitHub repo as a snapshot (default branch, tarball API). It is a one-time import, not a working copy.'],
                    [{ b: 'Version control outside' }, ' — open a real folder on disk (Chromium) and run real git in your own terminal alongside Owlet.'],
                    [{ b: 'Export snapshots' }, ' — ZIP download or share links keep point-in-time copies.']
                ] },
                { t: 'h2', x: 'When it lands' },
                { t: 'p', x: 'The contract already defines stage/unstage/discard/commit/checkout/sync events, so a future isomorphic-git backend can plug in without changing the UI.' }
            ]
        }
    ]
});

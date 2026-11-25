/* ==========================================================================
   developer.js — Group 4: for developers extending Owlet. Event tables and
   function lists mirror project/CONTRACT.md exactly; module behaviour verified in
   js/*.js (state, storage, preview, terminal, lint, editor).
   ========================================================================== */
'use strict';
window.OwletDocs = window.OwletDocs || { groups: [] };

window.OwletDocs.groups.push({
    id: 'developer',
    title: 'Developer guide',
    file: 'developer.js',
    pages: [
        {
            id: 'developer/architecture',
            title: 'Architecture',
            description: 'Two layers, one contract: logic modules own the IDE; the UI layer owns the design system. They only meet through contract.js.',
            blocks: [
                { t: 'h2', x: 'The two layers' },
                { t: 'table', head: ['Layer', 'Files', 'Owns'], rows: [
                    ['Logic', [{ c: 'js/*.js' }], 'State, storage, file tree, tabs, editor, preview, console, lint, python, terminal, sandbox, compiler, share, clone.'],
                    ['UI', [{ c: 'js/ui/*.js' }, ', ', { c: 'css/*' }], 'Layout shell, menubar, dock, explorer chrome, theme, dialogs, toast, tooltips, icons, mock data.']
                ] },
                { t: 'p', x: ['The UI layer must never call logic functions directly and the logic layer must never reach into UI internals. The one bridge is ', { c: 'js/ui/contract.js' }, ' — the documented seam for replacing the UI or plugging in real backends.'] },
                { t: 'h2', x: 'Direction of traffic' },
                { t: 'list', items: [
                    [{ b: 'UI → logic' }, ': ', { c: "OwletUI.emit('ui:<name>', detail)" }, ' dispatches a ', { c: 'CustomEvent' }, ' on ', { c: 'window' }, '. ', { c: 'contract.js' }, ' listens and calls the matching ', { c: 'Owlet.*' }, ' function — or logs a stub.'],
                    [{ b: 'Logic → UI' }, ': logic calls functions on ', { c: 'window.OwletUI' }, ' (e.g. ', { c: 'setProblems(list)' }, '). Those store data in ', { c: 'OwletUI.snapshot' }, ' and dispatch ', { c: 'owletui:changed' }, ' with ', { c: '{ topic }' }, '. Panels re-render on that event.']
                ] },
                { t: 'h2', x: 'Module pattern' },
                { t: 'code', lang: 'js', code: 'window.Owlet = window.Owlet || {};\n\nOwlet.example = (function () {\n    // private state lives here\n    var cache = {};\n\n    function doThing(path) {\n        // small functions, comments explain why\n    }\n\n    return { doThing: doThing };\n})();' },
                { t: 'callout', kind: 'tip', title: 'Script order matters', x: 'index.html loads state.js first and app.js last, then the whole js/ui/ directory. New logic modules belong before app.js; new UI modules before boot.js.' }
            ]
        },
        {
            id: 'developer/ui-contract',
            title: 'UI contract',
            description: 'The full event table — which ui:* events are wired to real logic, and which are stubs waiting for a backend.',
            blocks: [
                { t: 'h2', x: 'UI → logic events' },
                { t: 'table', head: ['Event', 'Detail', 'Status'], rows: [
                    [{ c: 'ui:file-open' }, { c: '{ path, line?, col? }' }, 'Connected — opens tab, moves cursor.'],
                    [{ c: 'ui:preview-refresh' }, { c: '{}' }, ['Connected — ', { c: 'Owlet.preview.update()' }, '.']],
                    [{ c: 'ui:run' }, { c: '{}' }, ['Connected — clicks ', { c: '#btn-run' }, '.']],
                    [{ c: 'ui:setting-change' }, { c: '{ key, value }' }, ['Connected — saved in ', { c: 'owlet:settings' }, '.']],
                    [{ c: 'ui:theme-change' }, { c: '{ theme }' }, 'Informational.'],
                    [{ c: 'ui:file-create / rename / delete / folder-create' }, 'path fields', 'Stub — file actions still use filetree.js.'],
                    [{ c: 'ui:terminal-input / profile / kill' }, '—', 'Stub — terminal logic is separate.'],
                    [{ c: 'ui:git-* (stage, unstage, discard, commit, checkout, sync)' }, '—', 'Stub — TODO: connect backend.'],
                    [{ c: 'ui:ai-send / ai-stop' }, '—', 'Stub — TODO: connect backend.'],
                    [{ c: 'ui:collab-share / sandbox-connect' }, '—', 'Stub — TODO: connect backend.']
                ] },
                { t: 'h2', x: 'Logic → UI functions' },
                { t: 'table', head: ['Function', 'Purpose'], rows: [
                    [{ c: 'setTree(entries)' }, 'Colours/letters Explorer rows with git status.'],
                    [{ c: 'setGitChanges(list)' }, 'Source Control list + rail badge.'],
                    [{ c: 'setProblems(list)' }, 'Problems panel + status counts.'],
                    [{ c: 'addConsoleLine(type, text)' }, ['type: ', { c: 'log|info|warn|error' }, '.']],
                    [{ c: 'setStatus(partial)' }, 'Only passed keys change.'],
                    [{ c: 'setTerminalState(state, label)' }, ['state: ', { c: 'local|connecting|connected|disconnected' }, '.']],
                    [{ c: 'setPreviewError(err|null)' }, 'Shows or clears the preview banner.'],
                    [{ c: 'setCollaborators(list)' }, 'Top-bar avatars.'],
                    [{ c: 'streamAiToken(text, done?)' }, 'Accumulates streamed AI text.'],
                    [{ c: 'toast(message, type, options)' }, 'Returns { dismiss() }.'],
                    [{ c: 'getSnapshot()' }, 'Read-only copy of UI state.']
                ] },
                { t: 'p', x: ['Helpers: ', { c: 'OwletUI.icon(name)' }, ' returns SVG markup; ', { c: 'OwletUI.menu.open(anchor, items)' }, ' opens a keyboard-accessible menu; ', { c: 'OwletUI.prefs.get/set' }, ' reads and writes UI preferences.'] },
                { t: 'h2', x: 'Mock data' },
                { t: 'p', x: [{ c: 'js/ui/mock.js' }, ' feeds fake git/AI/collaborator data through the functions above and is on by default. Turn it off with ', { c: "localStorage.setItem('owlet:ui:mock','0')" }, '. Every mock call is marked ', { c: '// TODO: connect backend' }, '.'] }
            ]
        },
        {
            id: 'developer/state-and-storage',
            title: 'State and storage',
            description: 'state.js is the single source of truth; storage.js hides localStorage and the File System Access API behind one interface.',
            blocks: [
                { t: 'h2', x: 'The state module' },
                { t: 'p', x: [{ c: 'js/state.js' }, ' owns the project model: a flat map of ', { c: 'path → file content' }, ', the editor group (one group with tabs), the active file, dirty tracking and a small event bus (', { c: 'Owlet.state.on(event, fn)' }, ').'] },
                { t: 'list', items: [
                    [{ c: 'loadFiles(files, name)' }, ' — replaces the project and fires ', { c: 'project:loaded' }, '.'],
                    [{ c: 'listFiles() / getFile(path) / setFile(path, content)' }, ' — plain file operations.'],
                    [{ c: 'openFile(path) / closeFile(path) / activeFile' }, ' — tab state.'],
                    [{ c: 'markAllSaved() / isDirty(path)' }, ' — the unsaved-dot machinery.']
                ] },
                { t: 'h2', x: 'Two storage backends, one interface' },
                { t: 'table', head: ['Backend', 'When', 'Save behaviour'], rows: [
                    [['browser', { br: true }, 'localStorage'], 'Default — every browser', [{ c: 'Ctrl+S' }, ' saves the whole project JSON under ', { c: 'owlet:project:<name>' }, ' (autosaved ~800 ms after typing).']],
                    [['fs', { br: true }, 'File System Access'], 'Chromium, after Open folder', [{ c: 'Ctrl+S' }, ' writes the active file back to disk through its handle.']]
                ] },
                { t: 'h2', x: 'localStorage keys' },
                { t: 'table', head: ['Key', 'Contents'], rows: [
                    [{ c: 'owlet:project:<name>' }, 'One key per saved project: { name, files, savedAt }.'],
                    [{ c: 'owlet:lastProject' }, 'Project name to reopen on boot.'],
                    [{ c: 'owlet:settings' }, 'Editor settings + sandbox/compiler keys.'],
                    [{ c: 'owlet:ui:prefs' }, 'Theme (shared with docs + landing).'],
                    [{ c: 'owlet.layout.v2' }, 'Panel preset, sizes and open/closed state.'],
                    [{ c: 'owlet:ui:mock' }, ['Set to ', { c: "'0'" }, ' to disable mock data.']]
                ] },
                { t: 'callout', kind: 'tip', title: 'Adding a new persisted value', x: 'Store it under an existing key when possible (settings, prefs, layout). A new top-level key is fine — keep the owlet: prefix and document it on this page.' }
            ]
        },
        {
            id: 'developer/preview-pipeline',
            title: 'Preview pipeline',
            description: 'How a multi-file project becomes a rendered iframe: Blob URLs, path rewriting and the console bridge.',
            blocks: [
                { t: 'h2', x: 'The pipeline' },
                { t: 'steps', items: [
                    { title: 'Schedule', text: ['Typing calls ', { c: 'Owlet.preview.scheduleUpdate' }, ' (debounced); ', { kbd: 'Alt+R' }, ' calls ', { c: 'update()' }, ' directly.'] },
                    { title: 'Blob-ify', text: 'Each project file gets a Blob URL (or a base64 data URL for SVG). Relative references in HTML/CSS/JS are rewritten to those URLs.' },
                    { title: 'Inject the bridge', text: 'A small script is inlined before user code. It must never throw — it only reports.' },
                    { title: 'Render', text: ['The iframe ', { c: 'src' }, ' is set to the entry HTML blob. Old blob URLs are revoked to avoid leaks.'] }
                ] },
                { t: 'h2', x: 'The bridge' },
                { t: 'p', x: ['The injected script overrides ', { c: 'console.*' }, ', hooks ', { c: 'window.onerror' }, ', ', { c: 'unhandledrejection' }, ' and resource errors, then ', { c: 'postMessage' }, 's a structured record to Owlet. ', { c: 'js/preview.js' }, ' receives it and forwards to ', { c: 'Owlet.console' }, ' with file/line metadata.'] },
                { t: 'code', lang: 'js', code: "// Shape of a console record posted from the iframe\n{\n    type: 'error',           // log | info | warn | error | unhandledrejection ...\n    text: '…',               // message\n    file: 'script.js', line: 12, col: 4,\n    raw: '', time: '2025-…', args: [ /* original console args */ ]\n}" },
                { t: 'callout', kind: 'warning', title: 'Never let the bridge throw', x: 'If the injected script crashes, the user page loses its console bridge silently. The whole bridge is wrapped so failures are swallowed — keep it that way.' }
            ]
        },
        {
            id: 'developer/adding-a-feature',
            title: 'Adding a feature',
            description: 'The repeatable recipe: logic module → contract event → UI wiring → docs page. With a worked example.',
            blocks: [
                { t: 'h2', x: 'The recipe' },
                { t: 'steps', items: [
                    { title: 'Write the logic module', text: ['New file ', { c: 'js/myfeature.js' }, ': IIFE, exposes ', { c: 'Owlet.myfeature' }, ', uses ', { c: 'Owlet.state' }, ' for data. Add the ', { c: '<script>' }, ' tag before app.js.'] },
                    { title: 'Expose it through the contract', text: ['Pick or create a ', { c: 'ui:*' }, ' event in ', { c: 'js/ui/contract.js' }, ' and map it to your function. Stub or connect it honestly.'] },
                    { title: 'Build the UI', text: ['Add markup in ', { c: 'index.html' }, ' and a UI module in ', { c: 'js/ui/' }, ' that emits the event and renders on ', { c: 'owletui:changed' }, '.'] },
                    { title: 'Keep the layers honest', text: 'UI modules must not reach into logic internals, and logic modules must not touch UI classes directly.' },
                    { title: 'Document it', text: 'Add a page object to the right docs-data file. If the feature is unfinished, set badge: "planned" or "experimental".' }
                ] },
                { t: 'h2', x: 'Worked example — a "word count" status' },
                { t: 'code', lang: 'js', code: "// js/wordcount.js — tiny feature, real structure\nwindow.Owlet = window.Owlet || {};\n\nOwlet.wordcount = (function () {\n    function update() {\n        var text = Owlet.state.getFile(Owlet.state.activeFile) || '';\n        var words = text.trim().split(/\\s+/).filter(Boolean).length;\n        OwletUI.setStatus({ words: words + ' words' });\n    }\n\n    // Count on open and after every save.\n    Owlet.state.on('file:saved', update);\n\n    return { update: update };\n})();" },
                { t: 'callout', kind: 'tip', title: 'When in doubt, copy a file', x: 'clone.js and share.js are good templates — self-contained, one feature, honest comments.' }
            ]
        },
        {
            id: 'developer/adding-a-language',
            title: 'Adding a language',
            description: 'Three places decide what Owlet understands: the CodeMirror mode map, the linter map, and the compiler/REPL maps.',
            blocks: [
                { t: 'h2', x: 'Editing support (CodeMirror)' },
                { t: 'steps', items: [
                    { title: 'Load the mode', text: ['Add the mode’s ', { c: '<script>' }, ' to index.html (CodeMirror 5 modes live on cdnjs).'] },
                    { title: 'Map the extension', text: ['Extend the extension→mode lookup in ', { c: 'js/editor.js' }, ' so ', { c: '.yourlang' }, ' opens the right pane.'] },
                    { title: 'Hints (optional)', text: 'Add a hint addon script if one exists for the language.' }
                ] },
                { t: 'h2', x: 'Linting' },
                { t: 'p', x: [{ c: 'js/lint.js' }, ' wires linters to CodeMirror’s lint addon. To add a language: provide a lint function that returns ', { c: '[{ from, to, severity, message }]' }, ' and register it alongside ESLint/HTMLHint/csstree.'] },
                { t: 'h2', x: 'Running' },
                { t: 'list', items: [
                    [{ b: 'In-browser execution' }, ' — like Python: write a loader + runner module (see ', { c: 'python.js' }, ').'],
                    [{ b: 'BYOK compile' }, ' — add the extension to ', { c: 'LANG_BY_EXT' }, ' in ', { c: 'js/compiler.js' }, '.'],
                    [{ b: 'Terminal' }, ' — add a ', { c: 'case' }, ' to the local engine switch in ', { c: 'js/terminal.js' }, '.']
                ] },
                { t: 'callout', kind: 'note', title: 'Keep the honesty rule', x: 'A language is "Available" when Run actually works. Editing-only support gets mentioned in the editor docs; Run support gets its own badge.' }
            ]
        },
        {
            id: 'developer/testing-troubleshooting',
            title: 'Testing and troubleshooting',
            description: 'No test suite — the project’s QA is deliberate manual checks plus a few reliable traps to catch regressions.',
            blocks: [
                { t: 'h2', x: 'The honest test suite' },
                { t: 'code', lang: 'bash', code: '# 1. Syntax\nnode --check js/changed-file.js\n\n# 2. Serve and open\npython -m http.server 8000\n# → http://localhost:8000\n\n# 3. Smoke path (do it every time)\n#    - create file → type → preview updates\n#    - break the code → error banner + console entry\n#    - Ctrl+S → dot clears → reload → file persists\n#    - Ctrl+P, Ctrl+B, Ctrl+`, Alt+R, ?, Esc\n\n# 4. file:// check\n#    open index.html directly — no console errors expected' },
                { t: 'h2', x: 'Common gotchas' },
                { t: 'table', head: ['Symptom', 'Usually'], rows: [
                    ['Preview blank', ['Blob URL revoked early, or a ', { c: 'src' }, ' path that was not rewritten. Check ', { c: 'preview.js' }, '.']],
                    ['Console silent', ['Bridge script failed to inject — look for a ', { c: '</scr' }, 'ipt-like sequence in user code.']],
                    ['Ctrl+S does nothing', ['Focus is inside an iframe or the terminal; the keydown listener is on ', { c: 'document' }, '.']],
                    ['Terminal dead', ['xterm CDN did not load (offline first run). ', { c: 'Owlet.ui.status' }, ' reports it.']],
                    ['Git panel shows fake data', ['Mock layer is on: ', { c: "localStorage.setItem('owlet:ui:mock','0')" }, '.']]
                ] },
                { t: 'h2', x: 'Debug mode' },
                { t: 'p', x: 'The Console panel’s Debug toggle surfaces Owlet-internal errors alongside project errors — the fastest way to tell "my code broke" from "the IDE broke".' },
                { t: 'callout', kind: 'tip', title: 'Report what you saw', x: 'A good bug report says browser + origin (file:// vs http) + exact steps + console output. The Docs feedback buttons file an issue template for you.' }
            ]
        }
    ]
});

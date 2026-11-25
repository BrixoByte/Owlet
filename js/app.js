// app.js — bootstrap: wires every module together, owns the toolbar buttons,
// the status line, keyboard shortcuts, settings dialog, and the resize divider.
// Think of this file as the "main()" of Owlet.

window.Owlet = window.Owlet || {};

// Debug-only logger: prints to the browser console only when Owlet.settings.debug is true.
Owlet.log = function () {
    if (Owlet.settings && Owlet.settings.get('debug') === true) console.log.apply(console, arguments);
};

// ---- tiny UI helpers used by every module --------------------------------
Owlet.ui = (function () {
    var statusEl = null;

    // Cache the status bar element once the DOM exists.
    function init() {
        statusEl = document.getElementById('status-text');
    }

    // Show a short message in the bottom status bar (replaces silent failures).
    function status(text) {
        if (!statusEl) statusEl = document.getElementById('status-text');
        if (statusEl) statusEl.textContent = text;
        Owlet.log('[Owlet]', text);
    }

    // Show/hide the right-side status hint (e.g. "saved", "loading python…").
    function hint(text) {
        var el = document.getElementById('status-hint');
        if (el) el.textContent = text || '';
    }

    return { init: init, status: status, hint: hint };
})();

// ---- application bootstrap ------------------------------------------------
Owlet.app = (function () {

    // Editor settings persisted between sessions.
    var SETTINGS_KEY = 'owlet:settings';

    // Load settings from localStorage (empty object by default).
    function loadSettings() {
        try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
        catch (e) { return {}; }
    }

    // Persist settings back to localStorage.
    function saveSettings(s) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    }

    // Boot everything in order: state -> storage -> ui modules -> first render.
    function init() {
        Owlet.ui.init();
        Owlet.storage.init();          // loads last project or the starter files
        Owlet.editor.init();
        Owlet.tabs.init();
        Owlet.groups.init();   // builds group DOM + editors (needs editor + state)
        Owlet.filetree.init();
        Owlet.preview.init();
        Owlet.console && Owlet.console.init && Owlet.console.init();
        Owlet.lint && Owlet.lint.init && Owlet.lint.init();
        Owlet.terminal && Owlet.terminal.init && Owlet.terminal.init();
        Owlet.sandbox && Owlet.sandbox.init && Owlet.sandbox.init();
        Owlet.compiler && Owlet.compiler.init && Owlet.compiler.init();

        wireToolbar();
        wireShortcuts();
        wireDivider();
        wireSettingsDialog();
        wirePalette();
        applyStoredSettings();
        addManifestLink();
        registerServiceWorker();

        // Open a default file only when no tab was restored from the last session.
        var files = Owlet.state.listFiles();
        if (!Owlet.state.anyTabsOpen() && files.length) {
            Owlet.state.openFile(files.indexOf('index.html') !== -1 ? 'index.html' : files[0]);
        }
        Owlet.preview.update();
        Owlet.ui.status('Ready — ' + Owlet.state.projectName);
    }

    // Safe getElementById + click binding helper.
    function bind(id, fn) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
    }

    // Connect every top-bar button to its module function.
    function wireToolbar() {
        bind('btn-save', function () { Owlet.storage.saveActive(); });
        bind('btn-zip', function () { Owlet.storage.exportZip(); });
        bind('btn-run', runActiveFile);
        bind('btn-settings', function () { toggleDialog('settings-dialog', true); });
        bind('btn-share', function () { Owlet.share && Owlet.share.openDialog(); });
        bind('btn-open-window', openPreviewWindow);
        bind('help-open-shortcuts', function () { openSettingsTab('shortcuts'); });
    }

    // Open the settings dialog straight onto one section tab.
    function openSettingsTab(tab) {
        toggleDialog('settings-dialog', true);
        var btn = document.querySelector('#settings-dialog .settings-nav-item[data-settings-tab="' + tab + '"]');
        if (btn) btn.click();
    }

    // Run the active file: html refreshes preview, .py goes to Pyodide,
    // .js executes inside the preview page. The button swaps its play icon for
    // a spinner that stays visible at least MIN_SPIN ms (and until any async
    // runner finishes), so every click gets visible feedback.
    var running = false;
    var MIN_SPIN = 1000;

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function runActiveFile() {
        if (running) return;
        var btn = document.getElementById('btn-run');
        running = true;
        if (btn) btn.classList.add('is-running');
        // The run (and with it the preview reveal) starts once the spinner has
        // had its moment — the pane appears AFTER the animation, not during it.
        // Async runners keep the spinner going until they finish.
        sleep(MIN_SPIN).then(doRun).then(function () {
            running = false;
            if (btn) btn.classList.remove('is-running');
        });
    }

    // Reveal the preview pane before rendering into it — Run used to refresh
    // an iframe the user couldn't see when the pane was closed.
    function ensurePreview() {
        var L = window.OwletUI && OwletUI.layout;
        if (!L || !L.getState) return;
        var mobile = window.matchMedia && window.matchMedia('(max-width: 720px)').matches;
        // Phones: switch the bottom-nav view — the pane shows as a full overlay.
        if (mobile && L.setMobileView) { L.setMobileView('preview'); return; }
        if (!L.getState().right.open) L.setOpen('right', true);
    }

    function doRun() {
        var path = Owlet.state.activeFile;
        if (!path) { Owlet.ui.status('Open a file first.'); return Promise.resolve(); }
        var ext = (path.split('.').pop() || '').toLowerCase();
        if (ext === 'html' || ext === 'htm') {
            ensurePreview();
            Owlet.preview.update();
            Owlet.ui.status('Preview refreshed');
        } else if (ext === 'py' && Owlet.python) {
            return Owlet.python.run(path);
        } else if (ext === 'js') {
            ensurePreview();
            Owlet.preview.update(); // JS runs inside the preview page
            Owlet.ui.status('JS runs inside the preview — check the Console panel');
        } else if (Owlet.compiler && Owlet.compiler.canRun(path)) {
            return Owlet.compiler.run(path);
        } else {
            Owlet.ui.status('No runner for .' + ext + ' files.');
        }
        return Promise.resolve();
    }

    // Open the current preview in a separate browser window. The document is
    // built with data: URIs (not Blob URLs) so it stays fully styled after
    // this tab re-renders and revokes the iframe's blobs.
    function openPreviewWindow() {
        var html = Owlet.preview && Owlet.preview.standaloneHtml
            ? Owlet.preview.standaloneHtml() : '';
        if (!html) {
            var frame = document.getElementById('preview-frame');
            html = (frame && frame.srcdoc) || '';
        }
        if (!html) return;
        var blob = new Blob([html], { type: 'text/html' });
        window.open(URL.createObjectURL(blob), '_blank');
    }

    // Simple modal show/hide helper used by settings and projects dialogs.
    function toggleDialog(id, show) {
        var d = document.getElementById(id);
        if (d) d.style.display = show ? 'flex' : 'none';
    }

    // List saved browser projects in the projects dialog.
    function showProjectsDialog() {
        var list = document.getElementById('projects-list');
        if (!list) { toggleDialog('projects-dialog', true); return; }
        list.innerHTML = '';
        var names = Owlet.storage.listProjects();
        if (names.length === 0) {
            list.innerHTML = '<div class="dialog-empty">No saved projects</div>';
        }
        names.forEach(function (name) {
            var row = document.createElement('div');
            row.className = 'project-row';
            row.innerHTML = '<span class="project-name"></span><button class="btn-load">Load</button><button class="btn-del">Delete</button>';
            row.querySelector('.project-name').textContent = name;
            row.querySelector('.btn-load').addEventListener('click', function () {
                if (Owlet.storage.loadBrowser(name)) {
                    Owlet.ui.status('Loaded "' + name + '"');
                    var files = Owlet.state.listFiles();
                    Owlet.state.openFile(files.indexOf('index.html') !== -1 ? 'index.html' : files[0]);
                }
                toggleDialog('projects-dialog', false);
            });
            row.querySelector('.btn-del').addEventListener('click', function () {
                OwletUI.dialogs.confirm({
                    title: 'Delete project',
                    message: 'Delete "' + name + '"? This cannot be undone.',
                    okLabel: 'Delete',
                    danger: true
                }).then(function (ok) {
                    if (ok) { Owlet.storage.deleteProject(name); showProjectsDialog(); }
                });
            });
            list.appendChild(row);
        });
        toggleDialog('projects-dialog', true);
    }

    // Global keyboard shortcuts (editor-independent).
    function wireShortcuts() {
        document.addEventListener('keydown', function (e) {
            var mod = e.ctrlKey || e.metaKey; // Ctrl on win/linux, Cmd on mac
            if (mod && e.key === 's') { e.preventDefault(); Owlet.storage.saveActive(); }
            else if (mod && e.key === 'w') { e.preventDefault(); closeActiveTab(); }
            else if (mod && e.key === 'p') { e.preventDefault(); Owlet.app.openPalette && Owlet.app.openPalette(); }
            else if (mod && e.key === '`') { e.preventDefault(); Owlet.terminal && Owlet.terminal.toggle && Owlet.terminal.toggle(); }
            else if (e.altKey && e.key.toLowerCase() === 'r') { e.preventDefault(); Owlet.preview.update(); }
            else if (e.key === '?' && !mod && !e.altKey) {
                // '?' is Shift+/ — don't fire it while typing in the editor.
                var t = e.target;
                if (t && t.closest && t.closest('.CodeMirror, input, textarea, select')) return;
                e.preventDefault();
                toggleDialog('help-dialog', true);
            }
            else if (e.key === 'Escape') { closeAllDialogs(); }
        });

        // Every .dialog-close button hides its own dialog.
        document.querySelectorAll('.dialog-close').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var dlg = btn.closest('.dialog');
                if (dlg) dlg.style.display = 'none';
            });
        });
    }

    // Hide every open dialog (Escape key).
    function closeAllDialogs() {
        document.querySelectorAll('.dialog').forEach(function (d) {
            d.style.display = 'none';
        });
    }

    // Close the currently active tab in the active group (dirty-file confirm).
    function closeActiveTab() {
        Owlet.tabs.closeActive();
    }

    // Drag handle between editor and preview — classic splitter behaviour.
    function wireDivider() {
        var divider = document.getElementById('divider');
        var editorPane = document.getElementById('editor-pane');
        var container = document.getElementById('workspace');
        if (!divider || !editorPane || !container) return;

        var dragging = false;
        divider.addEventListener('mousedown', function () {
            dragging = true;
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
        });
        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            var rect = container.getBoundingClientRect();
            var pct = ((e.clientX - rect.left) / rect.width) * 100;
            if (pct > 15 && pct < 85) editorPane.style.flex = '0 0 ' + pct + '%';
        });
        document.addEventListener('mouseup', function () {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            Owlet.editor.instance() && Owlet.editor.instance().refresh();
        });
    }

    // Sidebar nav: one section visible at a time (horizontal settings layout).
    function wireSettingsNav(dlg) {
        var navItems = dlg.querySelectorAll('.settings-nav-item');
        var panels = dlg.querySelectorAll('.settings-panel');
        navItems.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var key = btn.getAttribute('data-settings-tab');
                navItems.forEach(function (b) {
                    var on = b === btn;
                    b.classList.toggle('active', on);
                    b.setAttribute('aria-selected', on ? 'true' : 'false');
                });
                panels.forEach(function (p) {
                    p.classList.toggle('active', p.getAttribute('data-settings-panel') === key);
                });
            });
        });
    }

    // Build + wire the settings dialog controls (kept simple on purpose).
    function wireSettingsDialog() {
        var s = loadSettings();
        var dlg = document.getElementById('settings-dialog');
        if (!dlg) return;

        wireSettingsNav(dlg);

        var fontSize = dlg.querySelector('#set-fontsize');
        var tabSize = dlg.querySelector('#set-tabsize');
        var lineNums = dlg.querySelector('#set-linenumbers');
        var wordWrap = dlg.querySelector('#set-wordwrap');
        var closeBtn = dlg.querySelector('.dialog-close');

        if (fontSize) fontSize.value = s.fontSize || 14;
        if (tabSize) tabSize.value = s.tabSize || 4;
        if (lineNums) lineNums.checked = s.lineNumbers !== false;
        if (wordWrap) wordWrap.checked = s.wordWrap !== false;

        function apply() {
            var next = {
                fontSize: +(fontSize.value || 14),
                tabSize: +(tabSize.value || 4),
                lineNumbers: lineNums.checked,
                wordWrap: wordWrap.checked
            };
            saveSettings(next);
            Owlet.editor.applySettings(next);
        }
        [fontSize, tabSize].forEach(function (el) {
            el && el.addEventListener('change', apply);
        });
        [lineNums, wordWrap].forEach(function (el) {
            el && el.addEventListener('change', apply);
        });
        closeBtn && closeBtn.addEventListener('click', function () {
            toggleDialog('settings-dialog', false);
        });

        // Theme mode lives here (System/Dark/Light); the topbar icon toggles dark/light.
        var themeSel = dlg.querySelector('#set-theme');
        if (themeSel) {
            if (window.OwletUI && OwletUI.prefs) themeSel.value = OwletUI.prefs.get('theme', 'system');
            themeSel.addEventListener('change', function () {
                if (window.OwletUI && OwletUI.theme) OwletUI.theme.setTheme(themeSel.value);
            });
        }

        // Auto-refresh mirrors the preview toolbar switch — its own listener
        // persists the choice, so toggling here just forwards to it.
        var autoPreview = dlg.querySelector('#set-preview-auto');
        var toolbarAuto = document.getElementById('preview-auto');
        if (autoPreview) {
            autoPreview.checked = toolbarAuto ? toolbarAuto.checked : true;
            autoPreview.addEventListener('change', function () {
                if (!toolbarAuto) return;
                toolbarAuto.checked = autoPreview.checked;
                toolbarAuto.dispatchEvent(new Event('change'));
            });
        }

        // Panels section buttons: reset the saved layout, open shortcuts help.
        var resetLayout = dlg.querySelector('#set-reset-layout');
        resetLayout && resetLayout.addEventListener('click', function () {
            if (window.OwletUI && OwletUI.layout && OwletUI.layout.reset) OwletUI.layout.reset();
        });
        var shortcutsBtn = dlg.querySelector('#set-open-shortcuts');
        shortcutsBtn && shortcutsBtn.addEventListener('click', function () {
            var nav = dlg.querySelector('.settings-nav-item[data-settings-tab="shortcuts"]');
            if (nav) nav.click();
        });

        // BYOK fields exist in the dialog from Phase 5 — wire them if present.
        wireByokFields(dlg);
    }

    // Settings dialog's cloud-provider fields (Phase 5/6) — store key + proxy
    // only in localStorage, and let providers pick them up.
    function wireByokFields(dlg) {
        var provider = dlg.querySelector('#set-sandbox-provider');
        var key = dlg.querySelector('#set-sandbox-key');
        var proxy = dlg.querySelector('#set-proxy-url');
        var test = dlg.querySelector('#set-test-sandbox');
        var compilerUrl = dlg.querySelector('#set-compiler-url');
        var compilerKey = dlg.querySelector('#set-compiler-key');

        if (provider) provider.value = Owlet.settings.get('sandboxProvider') || '';
        if (key) key.value = Owlet.settings.get('sandboxKey') || '';
        if (proxy) proxy.value = Owlet.settings.get('proxyUrl') || '';
        if (compilerUrl) compilerUrl.value = Owlet.settings.get('compilerUrl') || '';
        if (compilerKey) compilerKey.value = Owlet.settings.get('compilerKey') || '';

        provider && provider.addEventListener('change', function () {
            Owlet.settings.set('sandboxProvider', provider.value);
        });
        key && key.addEventListener('change', function () {
            Owlet.settings.set('sandboxKey', key.value.trim());
        });
        proxy && proxy.addEventListener('change', function () {
            Owlet.settings.set('proxyUrl', proxy.value.trim());
        });
        compilerUrl && compilerUrl.addEventListener('change', function () {
            Owlet.settings.set('compilerUrl', compilerUrl.value.trim());
        });
        compilerKey && compilerKey.addEventListener('change', function () {
            Owlet.settings.set('compilerKey', compilerKey.value.trim());
        });
        test && test.addEventListener('click', function () {
            Owlet.sandbox && Owlet.sandbox.testConnection && Owlet.sandbox.testConnection();
        });
    }

    // Re-apply stored editor settings at boot.
    function applyStoredSettings() {
        Owlet.editor.applySettings(loadSettings());
    }

    // ---------- command palette (Ctrl+P) ---------------------------------

    // Commands the palette can run besides opening files.
    var PALETTE_COMMANDS = [
        { label: 'Open folder from computer', hint: '', run: function () { OwletUI.dropzone && OwletUI.dropzone.pickFolder(); } },
        { label: 'Import files', hint: '', run: function () { OwletUI.dropzone && OwletUI.dropzone.pickFiles(); } },
        { label: 'Import ZIP file', hint: '', run: function () { OwletUI.dropzone && OwletUI.dropzone.pickFiles(); } },
        { label: 'Save project', hint: 'Ctrl+S', run: function () { Owlet.storage.saveActive(); } },
        { label: 'Download as .zip', hint: '', run: function () { Owlet.storage.exportZip(); } },
        { label: 'Clone repository', hint: '', run: function () { Owlet.clone && Owlet.clone.openDialog(); } },
        { label: 'Refresh preview', hint: 'Alt+R', run: function () { Owlet.preview.update(); } },
        { label: 'Toggle terminal', hint: 'Ctrl+`', run: function () { Owlet.terminal.toggle(); } },
        { label: 'Open settings', hint: '', run: function () { toggleDialog('settings-dialog', true); } },
        { label: 'Show keyboard shortcuts', hint: '?', run: function () { toggleDialog('help-dialog', true); } }
    ];

    var paletteIndex = 0;
    var paletteItems = [];

    // Build the filtered list for the current input text.
    // Default mode: files of the CURRENT project only.
    // Command mode: type '>' first (VS Code style) to list quick actions.
    function paletteMatches(query) {
        query = query || '';
        var items = [];
        if (query.charAt(0) === '>') {
            var cq = query.slice(1).trim().toLowerCase();
            PALETTE_COMMANDS.forEach(function (c) {
                if (!cq || c.label.toLowerCase().indexOf(cq) !== -1) items.push(c);
            });
        } else {
            var fq = query.toLowerCase();
            Owlet.state.listFiles().forEach(function (p) {
                if (!fq || p.toLowerCase().indexOf(fq) !== -1) {
                    items.push({ label: p, hint: 'file', run: function () { Owlet.state.openFile(p); } });
                }
            });
        }
        return items.slice(0, 30);
    }

    // Render the filtered items into the results box.
    function renderPalette(query) {
        var box = document.getElementById('palette-results');
        if (!box) return;
        paletteItems = paletteMatches(query);
        paletteIndex = 0;
        box.innerHTML = '';
        paletteItems.forEach(function (item, i) {
            var row = document.createElement('div');
            row.className = 'palette-item' + (i === 0 ? ' selected' : '');
            row.innerHTML = '<span></span><span class="palette-hint"></span>';
            row.children[0].textContent = item.label;
            row.children[1].textContent = item.hint || '';
            row.addEventListener('click', function () { executePalette(i); });
            box.appendChild(row);
        });
        if (!paletteItems.length) {
            var empty = document.createElement('div');
            empty.className = 'palette-empty';
            empty.textContent = (String(query || '').charAt(0) === '>') ? 'No matching commands' : 'No matching files';
            box.appendChild(empty);
        }
    }

    // Run the chosen palette item and close the dialog.
    function executePalette(i) {
        var item = paletteItems[i];
        if (!item) return;
        toggleDialog('palette-dialog', false);
        item.run();
    }

    // Move the selection up/down with arrow keys.
    function paletteMove(delta) {
        if (!paletteItems.length) return;
        paletteIndex = (paletteIndex + delta + paletteItems.length) % paletteItems.length;
        document.querySelectorAll('.palette-item').forEach(function (el, i) {
            el.classList.toggle('selected', i === paletteIndex);
        });
    }

    // Wire the palette dialog once at boot.
    function wirePalette() {
        var input = document.getElementById('palette-input');
        if (!input) return;
        input.addEventListener('input', function () { renderPalette(input.value); });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); paletteMove(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); paletteMove(-1); }
            else if (e.key === 'Enter') { e.preventDefault(); executePalette(paletteIndex); }
            else if (e.key === 'Escape') { toggleDialog('palette-dialog', false); }
        });
        // Click outside the box closes it.
        document.getElementById('palette-dialog').addEventListener('click', function (e) {
            if (e.target.id === 'palette-dialog') toggleDialog('palette-dialog', false);
        });
    }

    // Open the palette — called by Ctrl+P and the palette command itself.
    function openPalette() {
        var dlg = document.getElementById('palette-dialog');
        if (!dlg) return;
        toggleDialog('palette-dialog', true);
        var input = document.getElementById('palette-input');
        input.value = '';
        renderPalette('');
        input.focus();
    }

    // Register the PWA service worker — only works over http(s)/localhost,
    // so file:// users simply skip it (the app still works fully).
    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        if (!/^https?:$/.test(location.protocol)) return;
        navigator.serviceWorker.register('sw.js').catch(function (e) {
            Owlet.ui.status('Offline mode unavailable: ' + e.message);
        });
    }

    // Add the PWA manifest link only on http(s). On file:// Chrome blocks it with a CORS error.
    function addManifestLink() {
        if (!/^https?:$/.test(location.protocol)) return;
        var link = document.createElement('link');
        link.rel = 'manifest';
        link.href = 'manifest.json';
        document.head.appendChild(link);
    }

    // Small key/value settings store used by BYOK modules (separate from editor settings).
    Owlet.settings = {
        get: function (k) {
            var s = loadSettings();
            return s[k];
        },
        set: function (k, v) {
            var s = loadSettings();
            s[k] = v;
            saveSettings(s);
        }
    };

    return { init: init, toggleDialog: toggleDialog, openPalette: openPalette, showProjects: showProjectsDialog };
})();

// Boot when the DOM is ready.
document.addEventListener('DOMContentLoaded', Owlet.app.init);

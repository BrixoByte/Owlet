// editor-chrome.js — the chrome around the CodeMirror editor: tab decorations
// and the welcome screen shown with no tabs.
// The editor itself (editor.js) is untouched; we only read state and call
// its public functions.

window.OwletUI = window.OwletUI || {};

OwletUI.editorChrome = (function () {
    var TEMPLATES = {
        'web': {
            label: 'New project',
            sub: 'Linked index.html, style.css and script.js',
            files: {
                'index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>My project</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n    <h1>Hello, Owlet!</h1>\n    <p>Edit this page and the preview updates as you type.</p>\n    <script src="script.js"></script>\n</body>\n</html>\n',
                'style.css': 'body {\n    font-family: system-ui, sans-serif;\n    margin: 2rem;\n}\n',
                'script.js': "console.log('Hello from script.js');\n"
            },
            open: 'index.html'
        },
        'blank': {
            label: 'Blank HTML file',
            sub: 'Single empty page to start from',
            files: {
                'index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>New page</title>\n</head>\n<body>\n\n</body>\n</html>\n'
            },
            open: 'index.html'
        }
    };

    // ---- tabs ------------------------------------------------------------

    // Add ARIA, the close icon, and the dirty class to each tab (logic rebuilds tabs often).
    function decorateTabs() {
        var bar = document.getElementById('editor-groups');
        if (!bar) return;
        bar.querySelectorAll('.tab').forEach(function (tab) {
            if (!tab.dataset.dk) {
                tab.dataset.dk = '1';
                tab.setAttribute('role', 'tab');
                var close = tab.querySelector('.tab-close');
                if (close) close.innerHTML = OwletUI.icon('x', 'icon-sm');
                tab.classList.toggle('dirty', !!tab.querySelector('.dirty-dot'));
            }
            tab.setAttribute('aria-selected', tab.classList.contains('active') ? 'true' : 'false');
            if (tab.classList.contains('active') && tab.scrollIntoView) {
                tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
        });
    }

    // Watch the groups container so decorations follow every re-render.
    // CodeMirror mutates its own DOM on every keystroke, so we only react to
    // mutations that touch a tab strip.
    function watchTabs() {
        var bar = document.getElementById('editor-groups');
        if (!bar || !window.MutationObserver) return;
        new MutationObserver(function (mutations) {
            var inTabs = mutations.some(function (m) {
                return m.target && m.target.closest && m.target.closest('.group-tabs');
            });
            if (inTabs) decorateTabs();
        }).observe(bar, { childList: true, subtree: true });
    }

    // Human-readable language name from the file extension (status bar).
    function languageName(path) {
        var ext = (path.split('.').pop() || '').toLowerCase();
        var names = { html: 'HTML', htm: 'HTML', css: 'CSS', scss: 'SCSS', js: 'JavaScript', mjs: 'JavaScript',
                      json: 'JSON', py: 'Python', md: 'Markdown', txt: 'Plain text', xml: 'XML' };
        return names[ext] || 'Plain text';
    }

    // ---- editor toolbar --------------------------------------------------

    // Toggle word wrap through the UI contract (the bridge saves and applies it).
    function toggleWrap(btn) {
        var current = Owlet.settings.get('wordWrap') !== false;
        OwletUI.emit('ui:setting-change', { key: 'wordWrap', value: !current });
        btn.setAttribute('aria-pressed', String(!current));
    }

    // Stub toolbar actions: visible and wired, backend or feature pending.
    function stubAction(name) {
        return function () {
            // TODO: connect backend / feature for this toolbar action
            OwletUI.toast(name + ' is not connected yet', 'info', { duration: 2200 });
        };
    }

    // Wire the toolbar buttons (ids are created in index.html).
    function wireToolbar() {
        bindClick('btn-editor-run', function () { OwletUI.emit('ui:run', {}); });
        bindClick('btn-wrap', function (e) { toggleWrap(e.currentTarget); });
        bindClick('btn-format', stubAction('Format document'));
        bindClick('btn-minimap', stubAction('Minimap'));
        var wrap = document.getElementById('btn-wrap');
        if (wrap) wrap.setAttribute('aria-pressed', String(Owlet.settings.get('wordWrap') !== false));
    }

    // Small helper: attach a click handler when the element exists.
    function bindClick(id, fn) {
        var node = document.getElementById(id);
        if (node) node.addEventListener('click', fn);
    }

    // ---- welcome screen --------------------------------------------------

    // Show the welcome screen when no tab is open; hide it otherwise.
    function renderWelcome() {
        var box = document.getElementById('welcome');
        if (!box) return;
        var empty = !Owlet.state.anyTabsOpen();
        box.classList.toggle('is-visible', empty);
        // Welcome replaces the editor content in-flow; has-welcome hides the host.
        var pane = document.getElementById('editor-pane');
        if (pane) pane.classList.toggle('has-welcome', empty);
        if (empty && !box.dataset.built) buildWelcome(box);
        else if (empty) renderRecent();
        // Editors re-shown after the welcome hides need a fresh measure.
        if (!empty && Owlet.groups && Owlet.groups.forEachEditor) {
            Owlet.groups.forEachEditor(function (cm) { if (cm && cm.refresh) cm.refresh(); });
        }
        // Bare first-run mode: zero files => only the editor/welcome area
        // shows (layout.css collapses the other panels via data-empty).
        var shell = document.getElementById('shell');
        if (shell) shell.toggleAttribute('data-empty', Owlet.state.listFiles().length === 0);
    }

    // Build the welcome markup once (recent projects are refreshed on open).
    function buildWelcome(box) {
        box.dataset.built = '1';
        box.innerHTML = '<div class="welcome-inner">'
            + '<div class="welcome-hero"><h2>Owlet</h2><p>Write, run and preview web projects in the browser.</p></div>'
            + '<div class="welcome-grid">'
            + card('folder-open', 'Open folder', 'Edit a real folder (Chrome / Edge)', 'btn-open-folder')
            + card('file-plus', 'New project', 'Linked index.html, style.css and script.js', 'new:web')
            + card('file-plus', 'New file', 'Start with one blank file', 'new-file')
            + card('github', 'Clone repository', 'Import a public GitHub repo', 'clone')
            + '</div>'
            + '<div class="welcome-section" id="welcome-recent"></div>'
            + '</div>';
        box.querySelectorAll('[data-welcome]').forEach(function (btn) {
            btn.addEventListener('click', function () { welcomeAction(btn.getAttribute('data-welcome')); });
        });
        renderRecent();
    }

    // One clickable card for the welcome grid.
    function card(icon, title, sub, action) {
        return '<button class="welcome-card" data-testid="welcome-card" data-welcome="' + action + '">'
            + OwletUI.icon(icon) + '<span class="card-title">' + title + '</span>'
            + '<span class="card-sub">' + sub + '</span></button>';
    }


    // Recent browser projects (real data from storage.js).
    function renderRecent() {
        var box = document.getElementById('welcome-recent');
        if (!box) return;
        var names = Owlet.storage.listProjects();
        box.innerHTML = '<h4>Recent projects</h4>';
        if (!names.length) {
            box.insertAdjacentHTML('beforeend', '<div class="dialog-empty">No saved projects yet. Press Save to keep one.</div>');
            return;
        }
        names.slice(0, 3).forEach(function (name) {
            var btn = document.createElement('button');
            btn.className = 'shortcut-row recent-row';
            btn.innerHTML = '<span></span>' + OwletUI.icon('chevron-right', 'icon-sm');
            btn.children[0].textContent = name;
            btn.addEventListener('click', function () { openProject(name); });
            box.appendChild(btn);
        });
    }

    // Load a saved browser project and open its first file.
    function openProject(name) {
        if (!Owlet.storage.loadBrowser(name)) return;
        openFirstFile();
    }

    // Open index.html when present, otherwise the first file.
    function openFirstFile() {
        var files = Owlet.state.listFiles();
        Owlet.state.openFile(files.indexOf('index.html') !== -1 ? 'index.html' : files[0]);
    }

    // Start a new project from a template (uses the state API, no backend).
    function newFromTemplate(key) {
        var tpl = TEMPLATES[key];
        if (!tpl) return;
        // Loads the template files and opens its entry file; tabs:changed then
        // hides the welcome screen and the editor takes over.
        Owlet.state.loadFiles(JSON.parse(JSON.stringify(tpl.files)), 'untitled');
        if (tpl.open) Owlet.state.openFile(tpl.open);
    }

    // Dispatch one welcome-screen action.
    function welcomeAction(action) {
        if (action === 'clone') return Owlet.clone && Owlet.clone.openDialog();
        if (action === 'new-file') return Owlet.filetree.createFile();
        if (action === 'btn-open-folder') return Owlet.storage.openLocalFolder();
        if (action.indexOf('new:') === 0) return newFromTemplate(action.slice(4));
    }

    // Keep the welcome screen in sync with open tabs.
    function wireWelcome() {
        Owlet.state.on('tabs:changed', renderWelcome);
        Owlet.state.on('project:loaded', renderWelcome);
        Owlet.state.on('files:changed', renderWelcome);
    }

    // Start everything in this module.
    function init() {
        decorateTabs();
        watchTabs();
        wireToolbar();
        wireWelcome();
        renderWelcome();
    }

    return { init: init, decorateTabs: decorateTabs, languageName: languageName };
})();

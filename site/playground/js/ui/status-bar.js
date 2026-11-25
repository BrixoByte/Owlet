// status-bar.js — the bottom status bar, the collaborator avatars, the rail
// badges and the user menu. Cursor and indentation come from CodeMirror;
// branch, sync, sandbox and AI come from the UI contract snapshot.

window.OwletUI = window.OwletUI || {};

OwletUI.statusBar = (function () {
    var INDENTS = [2, 4, 8];

    // Element helper.
    function el(id) { return document.getElementById(id); }

    // Set the text of one element when it exists.
    function setText(id, text) {
        var node = el(id);
        if (node) node.textContent = text;
    }

    // Live cursor line and column (1-based) plus the selection size.
    function renderCursor() {
        var cm = Owlet.editor.instance();
        if (!cm) return;
        var pos = cm.getCursor();
        setText('sb-cursor', 'Ln ' + (pos.line + 1) + ', Col ' + (pos.ch + 1));
        var sel = cm.somethingSelected() ? cm.getSelection().length : 0;
        setText('sb-selection', sel ? sel + ' selected' : '');
    }

    // Indentation label from the editor's indent unit.
    function renderIndent() {
        var cm = Owlet.editor.instance();
        if (!cm) return;
        setText('sb-indent', 'Spaces: ' + cm.getOption('indentUnit'));
    }

    // Language names for CodeMirror modes; the mode follows the active editor's file.
    var MODE_NAMES = {
        htmlmixed: 'HTML', css: 'CSS', javascript: 'JavaScript', xml: 'XML',
        python: 'Python', 'text/plain': 'Plain text'
    };

    // Language of the ACTIVE editor group (its CodeMirror mode).
    function renderLanguage() {
        var cm = Owlet.editor.instance();
        if (!cm) return;
        var mode = cm.getOption('mode');
        setText('sb-lang', MODE_NAMES[mode] || mode || 'Plain text');
    }

    // Language picker for the active editor. Only modes that are loaded are offered.
    function openLanguageMenu(anchor) {
        var cm = Owlet.editor.instance();
        if (!cm) return;
        var current = cm.getOption('mode');
        var items = Object.keys(MODE_NAMES).filter(function (m) {
            return m === 'text/plain' || CodeMirror.modes[m];
        }).map(function (m) {
            return { label: MODE_NAMES[m], checked: m === current,
                     onSelect: function () { cm.setOption('mode', m); renderLanguage(); } };
        });
        OwletUI.menu.open(anchor, items);
    }

    // Error and warning totals: problems (contract) plus console rows (logic).
    function renderCounts() {
        var problems = OwletUI.snapshot.problems;
        var errors = problems.filter(function (p) { return p.severity === 'error'; }).length;
        var warns = problems.filter(function (p) { return p.severity === 'warn'; }).length;
        var out = el('console-output');
        if (out) {
            out.querySelectorAll('.console-line.error:not([data-grouped])').forEach(function (r) {
                errors += Number(r.dataset.count) || 1;
            });
            out.querySelectorAll('.console-line.warn:not([data-grouped])').forEach(function (r) {
                warns += Number(r.dataset.count) || 1;
            });
        }
        setText('sb-errors-count', String(errors));
        setText('sb-warnings-count', String(warns));
    }

    // Branch, sync counters, sandbox and AI labels from the contract snapshot.
    function renderContractStatus() {
        var s = OwletUI.snapshot.status;
        setText('sb-branch-name', s.branch || 'no repository');
        setText('sb-sync', (s.ahead || 0) + '↑ ' + (s.behind || 0) + '↓');
        setText('sb-sandbox', 'Sandbox: ' + (s.sandbox || 'off'));
        setText('sb-ai', 'AI: ' + (s.ai || 'no key'));
        var remote = el('sb-remote');
        if (remote) {
            remote.dataset.state = s.branch ? 'connected' : 'local';
            remote.textContent = s.branch ? 'Connected' : 'Local';
        }
    }

    // Avatars for collaborators: at most 3 icons, then a "+N" chip that
    // also serves as the invite/share trigger (the old Share button lived here).
    var AVATAR_MAX = 3;
    function renderCollaborators() {
        var box = el('collab-avatars');
        if (!box) return;
        box.innerHTML = '';
        // The signed-in user always shows first — a real profile circle,
        // initials taken from the account button when available.
        var me = document.createElement('span');
        me.className = 'collab-avatar collab-avatar--me';
        me.setAttribute('data-tip', 'You');
        var account = el('btn-user');
        me.textContent = (account && account.textContent.trim()) || 'DP';
        box.appendChild(me);
        var list = OwletUI.snapshot.collaborators;
        list.slice(0, AVATAR_MAX).forEach(function (c) {
            var a = document.createElement('span');
            a.className = 'collab-avatar';
            a.setAttribute('data-tip', c.name);
            a.style.setProperty('--avatar', c.color || 'var(--accent)');
            a.textContent = c.initials || '?';
            box.appendChild(a);
        });
        var extra = list.length - AVATAR_MAX;
        var more = document.createElement('button');
        more.type = 'button';
        more.className = 'collab-avatar collab-avatar--more';
        more.setAttribute('data-tip', extra > 0 ? extra + ' more — invite team (preview)' : 'Invite team (preview)');
        more.setAttribute('data-testid', 'share-chip');
        more.textContent = extra > 0 ? '+' + extra : '+';
        var tag = document.createElement('span');
        tag.className = 'sb-tag';
        tag.textContent = 'Preview';
        more.appendChild(tag);
        more.addEventListener('click', function () {
            OwletUI.emit('ui:collab-share', {});
            comingSoon('Invite and share links');
        });
        box.appendChild(more);
    }

    // Indent picker: 2 / 4 / 8 spaces, saved through the contract.
    function openIndentMenu(anchor) {
        var cm = Owlet.editor.instance();
        var current = cm ? cm.getOption('indentUnit') : 4;
        var items = INDENTS.map(function (n) {
            return { label: 'Indent using ' + n + ' spaces', checked: n === current,
                     onSelect: function () { OwletUI.emit('ui:setting-change', { key: 'tabSize', value: n }); } };
        });
        OwletUI.menu.open(anchor, items);
    }

    // One consistent message for controls whose backend is not connected yet.
    // It only shows a notice: nothing is saved or changed.
    function comingSoon(feature) {
        OwletUI.toast(feature + ': not connected yet.', 'info', { duration: 2200 });
    }

    // User avatar menu: profile + sign-out are previews (accounts not connected yet).
    function openUserMenu(anchor) {
        OwletUI.menu.open(anchor, [
            { label: 'Profile', icon: 'user', hint: 'Preview', onSelect: function () { comingSoon('Profiles'); } },
            { separator: true },
            { label: 'Sign out', icon: 'external', hint: 'Preview', onSelect: function () { comingSoon('Accounts'); } }
        ]);
    }

    // Wire the clickable status items, the user button, and share.
    function wireControls() {
        bind('sb-indent', openIndentMenu);
        bind('sb-lang', openLanguageMenu);
        bind('btn-user', openUserMenu);
        bind('sb-bell', function () { comingSoon('Notifications center'); });
        // Share/invite lives on the "+N" chip inside #collab-avatars.
        bind('sb-branch', function () {
            OwletUI.emit('ui:git-checkout', {});
            comingSoon('Branch switcher');
        });
    }

    // Attach a click handler that passes the anchor element to fn.
    function bind(id, fn) {
        var node = el(id);
        if (node) node.addEventListener('click', function () { fn(node); });
    }

    // Recompute everything that depends on editor or contract state.
    function refreshAll() {
        renderCursor();
        renderIndent();
        renderLanguage();
        renderCounts();
        renderContractStatus();
        renderCollaborators();
    }

    // Subscribe to editor and state changes once.
    // Split editors: every group's CodeMirror gets its own cursorActivity hook,
    // and the readouts follow whichever group is active.
    function wireUpdates() {
        if (Owlet.groups && Owlet.groups.on) {
            function attach(cm) {
                if (cm._cursorBound) return;
                cm._cursorBound = true;
                cm.on('cursorActivity', renderCursor);
            }
            Owlet.groups.on('editorCreated', function (info) { attach(info.cm); });
            Owlet.groups.forEachEditor(attach);
            Owlet.groups.on('activeEditor', function () {
                renderCursor();
                renderIndent();
                renderLanguage();
            });
        }
        window.addEventListener('ui:setting-change', renderIndent);
        Owlet.state.on('active:changed', function () { renderLanguage(); renderCursor(); });
        Owlet.state.on('project:loaded', refreshAll);
        window.addEventListener('owletui:changed', function (e) {
            var topic = e.detail && e.detail.topic;
            if (topic === 'problems' || topic === 'console') renderCounts();
            if (topic === 'status') renderContractStatus();
            if (topic === 'collab') renderCollaborators();
        });
        var out = el('console-output');
        if (out && window.MutationObserver) {
            new MutationObserver(renderCounts).observe(out, { childList: true });
        }
    }

    // Start the status bar.
    function init() {
        wireControls();
        wireUpdates();
        refreshAll();
    }

    return { init: init, refreshAll: refreshAll };
})();

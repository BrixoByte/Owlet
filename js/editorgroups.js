// editorgroups.js — owns the split-editor DOM: one .editor-group per group,
// each with its own tab bar and CodeMirror (made by editor.js's factory).
// Synchronises the DOM with Owlet.state's group model, persists the layout
// (owlet.splitlayout.v1), and provides tab/drag-drop behaviour.
// Splitting was removed — exactly one editor group exists at a time.
//
// Facade for older modules: Owlet.groups.activeEditor() returns the CM of the
// active group; forEachEditor(fn) iterates every live editor.

window.Owlet = window.Owlet || {};

Owlet.groups = (function () {
    var LAYOUT_KEY = 'owlet.splitlayout.v1';
    var MIN_GROUP_PX = 200;      // smallest group dimension while resizing
    var saveTimer = null;
    var container = null;        // #editor-groups element
    // group id -> { root, tabs, host, cm, empty }
    var views = {};
    var pinnedTabs = {};       // path -> true for pinned tabs (no close button)
    var listeners = {};

    // ---------- tiny helpers ------------------------------------------------

    // Local pub/sub for 'editorCreated' and 'activeEditor' notifications.
    function on(event, fn) {
        (listeners[event] = listeners[event] || []).push(fn);
    }

    // Fire a module event (used for editorCreated / activeEditor).
    function fire(event, a) {
        (listeners[event] || []).forEach(function (fn) {
            try { fn(a); } catch (e) { console.error('Owlet.groups listener:', e); }
        });
    }

    // Element helper.
    function el(tag, cls, parent) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (parent) parent.appendChild(n);
        return n;
    }

    // The CodeMirror that belongs to the active group.
    function activeEditor() {
        var v = views[Owlet.state.activeGroup().id];
        return v ? v.cm : null;
    }

    // Run fn(cm, hostEl, groupId) for every live editor.
    function forEachEditor(fn) {
        Object.keys(views).forEach(function (id) {
            if (views[id] && views[id].cm) fn(views[id].cm, views[id].host, id);
        });
    }

    // ---------- group DOM ----------------------------------------------------

    // Build one .editor-group section: tab bar + corner buttons + editor host.
    function buildView(group) {
        var index = Owlet.state.getGroups().indexOf(group) + 1;
        var root = el('section', 'editor-group');
        root.dataset.group = group.id;
        root.setAttribute('role', 'region');
        root.setAttribute('aria-label', 'Editor group ' + index);
        root.style.flex = String(group.size) + ' 1 0';

        var bar = el('div', 'group-bar', root);
        bar.dataset.testid = 'tab-bar';
        bar.setAttribute('role', 'tablist');
        var tabs = el('div', 'group-tabs', bar);
        var actions = el('div', 'group-actions', bar);

        var host = el('div', 'group-host', root);
        host.dataset.testid = 'editor';
        var empty = el('div', 'group-empty', root);
        empty.textContent = 'Drop a file or tab here';
        buildDropZones(root, group.id);

        // Clicking anywhere inside a group makes it the active one.
        root.addEventListener('mousedown', function () {
            Owlet.state.setActiveGroup(group.id);
        });

        var cm = Owlet.editor.createEditor(host);
        views[group.id] = { root: root, tabs: tabs, host: host, cm: cm, empty: empty, actions: actions };
        fire('editorCreated', { cm: cm, host: host, groupId: group.id });
        return views[group.id];
    }

    // Destroy a group's view: unlink its doc, remove its CodeMirror and DOM.
    function destroyView(id) {
        var v = views[id];
        if (!v) return;
        Owlet.editor.destroyEditor(v.cm);
        v.root.parentNode && v.root.parentNode.removeChild(v.root);
        delete views[id];
    }

    // ---------- render: keep DOM in sync with state --------------------------

    // Full sync: create missing views, remove dead ones, order, sizes, direction.
    function render() {
        if (!container) return;
        var groups = Owlet.state.getGroups();
        var activeId = Owlet.state.activeGroup().id;

        // Drop views whose group no longer exists.
        Object.keys(views).forEach(function (id) {
            if (Owlet.state.groupById(id)) return;
            try { destroyView(id); }
            catch (e) {
                console.error('[Owlet] group destroy failed:', e);
                delete views[id];
            }
        });

        // Create views in state order with resize handles between them.
        // A failure building ONE group must not leave the DOM desynced —
        // state says N groups, the DOM shows N groups, or we log why not.
        container.innerHTML = '';
        groups.forEach(function (g, i) {
            try {
                var v = views[g.id] || buildView(g);
                v.root.style.flex = String(g.size) + ' 1 0';
                v.root.classList.toggle('active', g.id === activeId);
                v.root.setAttribute('aria-label', 'Editor group ' + (i + 1));
                container.appendChild(v.root);
                if (i < groups.length - 1) container.appendChild(buildDivider(i));
            } catch (e) {
                console.error('[Owlet] editor group failed to build:', e);
                delete views[g.id];
            }
        });

        container.dataset.dir = Owlet.state.layoutDirection;
        container.classList.toggle('multi', groups.length > 1);
        // The mobile fallback shows only the active group.
        container.classList.toggle('small-screen', window.innerWidth < 700);
        try { renderTabs(); } catch (e) { console.error('[Owlet] tab render:', e); }
        try { syncEditors(); } catch (e) { console.error('[Owlet] editor sync:', e); }
        try { refreshEditors(); } catch (e) { /* cosmetic */ }
        fire('activeEditor', activeEditor());
    }

    // Rebuild every group's tab strip from state.
    function renderTabs() {
        var s = Owlet.state;
        var activeId = s.activeGroup().id;
        s.getGroups().forEach(function (g) {
            var v = views[g.id];
            if (!v) return;
            v.tabs.innerHTML = '';
            g.tabs.forEach(function (path) {
                v.tabs.appendChild(makeTab(path, g, g.id === activeId));
            });
            // Close-group button is meaningless with a single group.
            var close = v.actions.querySelector('[data-tip^="Close group"]');
            if (close) close.style.display = s.getGroups().length > 1 ? '' : 'none';
        });
    }

    // Build one tab button for a file inside a group.
    function makeTab(path, group, isActiveGroup) {
        var tab = el('button', 'tab');
        tab.type = 'button';
        tab.title = path;
        tab.dataset.path = path;
        tab.dataset.testid = 'tab';
        tab.setAttribute('role', 'tab');
        var isActive = group.activeTab === path;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tab.draggable = true;

        var name = el('span', null, tab);
        name.textContent = path.split('/').pop();
        if (Owlet.state.isDirty(path)) {
            var dot = el('span', 'dirty-dot', tab);
            dot.textContent = '•';
            dot.title = 'Unsaved changes';
            tab.classList.add('dirty');
        }
        var pinned = !!pinnedTabs[path];
        tab.classList.toggle('pinned', pinned);
        var close = el('span', 'tab-close', tab);
        close.innerHTML = OwletUI.icon(pinned ? 'pin' : 'x', 'icon-sm');
        close.title = pinned ? 'Pinned — click to unpin' : 'Close (Ctrl+W)';

        tab.addEventListener('click', function (e) {
            Owlet.state.setActiveGroup(group.id);
            if (e.target === close || close.contains(e.target)) {
                if (pinnedTabs[path]) togglePin(path);
                else Owlet.tabs.closeTab(path, group.id);
            } else {
                Owlet.state.focusFile(path, group.id);
            }
        });
        tab.addEventListener('auxclick', function (e) {
            if (e.button === 1 && !pinnedTabs[path]) Owlet.tabs.closeTab(path, group.id);
        });
        tab.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            tabMenu(e.clientX, e.clientY, path, group.id);
        });

        wireTabDrag(tab, path, group.id);
        return tab;
    }

    // Make each group's editor show its group's active tab (shared/linked doc).
    function syncEditors() {
        Owlet.state.getGroups().forEach(function (g) {
            var v = views[g.id];
            if (!v || !v.cm) return;
            v.empty.style.display = g.activeTab ? 'none' : 'flex';
            // Binary tab -> show the viewer instead of the text editor.
            if (g.activeTab && Owlet.importer && Owlet.importer.isBinary(g.activeTab)) {
                showBinaryView(v, g.activeTab);
                return;
            }
            if (v.viewingPath && v.viewingPath !== g.activeTab) hideBinaryView(v);
            if (g.activeTab === v.cm.owletPath) return;
            if (g.activeTab) {
                // firstViewer = no OTHER group shows this file right now.
                var others = Owlet.state.getGroups().filter(function (o) {
                    return o !== g && o.tabs.indexOf(g.activeTab) !== -1;
                });
                Owlet.editor.showFile(v.cm, g.activeTab, others.length === 0);
            } else {
                Owlet.editor.showEmpty(v.cm);
            }
            v.cm.refresh();
        });
    }

    // Show the binary viewer overlay for an image or other binary file.
    // Images render from their stored data: URI; anything else gets a
    // "no preview" card with the byte size.
    function showBinaryView(v, path) {
        if (v.viewingPath === path) return;
        hideBinaryView(v);
        if (v.cm.owletPath) Owlet.editor.showEmpty(v.cm); // release the text doc
        var info = Owlet.importer.binaryInfo(path);
        var view = document.createElement('div');
        view.className = 'binary-view';
        if (info && /^image\//.test(info.mime)) {
            var img = document.createElement('img');
            img.src = info.dataUri;
            img.alt = path;
            view.appendChild(img);
        } else {
            var card = document.createElement('div');
            card.className = 'binary-card';
            var head = document.createElement('strong');
            head.textContent = 'Binary file — preview not available';
            var meta = document.createElement('div');
            meta.className = 'binary-meta';
            meta.textContent = (info ? (info.mime || 'binary') + ', ' + prettySize(info.size) : 'binary file');
            card.appendChild(head);
            card.appendChild(meta);
            view.appendChild(card);
        }
        var caption = document.createElement('div');
        caption.className = 'binary-caption';
        caption.textContent = path + (info ? '  ·  ' + prettySize(info.size) : '');
        view.appendChild(caption);
        v.host.appendChild(view);
        var cmWrap = v.cm.getWrapperElement();
        if (cmWrap) cmWrap.style.display = 'none';
        v.binEl = view;
        v.viewingPath = path;
    }

    // Remove the viewer overlay and show CodeMirror again.
    function hideBinaryView(v) {
        if (v.binEl) { v.binEl.remove(); v.binEl = null; }
        v.viewingPath = null;
        var cmWrap = v.cm && v.cm.getWrapperElement();
        if (cmWrap) cmWrap.style.display = '';
    }

    // 1024 -> '1.0 KB' style size text for the binary viewer.
    function prettySize(bytes) {
        var n = +bytes || 0;
        if (n < 1024) return n + ' B';
        if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
        return (n / 1048576).toFixed(1) + ' MB';
    }

    // ---------- resize handles ------------------------------------------------

    // The 4px drag handle between two groups; double-click equalizes sizes.
    function buildDivider(index) {
        var d = el('div', 'group-divider');
        d.setAttribute('role', 'separator');
        var groups = Owlet.state.getGroups();
        var left = groups[index];
        var right = groups[index + 1];

        var startX = 0, startY = 0, a = 0, b = 0, raf = 0;
        d.addEventListener('mousedown', function (e) {
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            a = left.size;
            b = right.size;
            document.body.classList.add('is-group-resizing');
            var onMove = function (ev) {
                if (raf) return;
                raf = requestAnimationFrame(function () {
                    raf = 0;
                    var horiz = Owlet.state.layoutDirection === 'horizontal';
                    var px = containerSizePx();
                    var total = a + b;
                    var delta = horiz ? (ev.clientX - startX) : (ev.clientY - startY);
                    var ratio = delta / px;
                    var min = (MIN_GROUP_PX / px) * total;
                    var na = Math.min(Math.max(a + ratio * total, min), total - min);
                    left.size = na;
                    right.size = total - na;
                    applySizes();
                });
            };
            var onUp = function () {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.body.classList.remove('is-group-resizing');
                refreshEditors();
                scheduleSave();
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        d.addEventListener('dblclick', function () {
            var same = (left.size + right.size) / 2;
            left.size = same;
            right.size = same;
            applySizes();
            refreshEditors();
            scheduleSave();
        });
        return d;
    }

    // Container's inner size along the split axis in pixels.
    function containerSizePx() {
        var horiz = Owlet.state.layoutDirection === 'horizontal';
        return horiz ? container.clientWidth : container.clientHeight;
    }

    // Push group.size values onto the DOM (cheap — used inside rAF).
    function applySizes() {
        Owlet.state.getGroups().forEach(function (g) {
            if (views[g.id]) views[g.id].root.style.flex = String(g.size) + ' 1 0';
        });
    }

    // Refresh every editor (sizes changed — CodeMirror must re-measure).
    function refreshEditors() {
        forEachEditor(function (cm) { cm.refresh(); });
    }

    // ---------- persistence ----------------------------------------------------

    // Debounced write of the current layout to localStorage.
    function scheduleSave() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(writeLayout, 300);
    }

    // Write the layout now (also used when the page is hidden or closed).
    function writeLayout() {
        clearTimeout(saveTimer);
        try {
            localStorage.setItem(LAYOUT_KEY, JSON.stringify(Owlet.state.layoutSnapshot()));
        } catch (e) { /* storage full or blocked — layout simply isn't persisted */ }
    }

    // Cursor per file path: { "<path>": { line, ch } }, kept in one small key.
    var CURSOR_KEY = 'owlet.cursors.v1';
    var cursorMap = readCursors();
    var cursorTimer = null;

    // Is this a valid zero-based line or column index?
    function isIndex(n) {
        return typeof n === 'number' && n >= 0 && n % 1 === 0 && n < 1e7;
    }

    // Load saved cursors; malformed entries and corrupt storage are ignored.
    function readCursors() {
        var out = {};
        try {
            var data = JSON.parse(localStorage.getItem(CURSOR_KEY) || '{}');
            if (!data || typeof data !== 'object') return out;
            Object.keys(data).forEach(function (p) {
                var c = data[p];
                if (c && isIndex(c.line) && isIndex(c.ch)) out[p] = { line: c.line, ch: c.ch };
            });
        } catch (e) { /* corrupt or blocked storage -> no saved cursors */ }
        return out;
    }

    // Remember the cursor of the document this editor shows (debounced write).
    // The path lives on the Doc itself, so it always matches the text being edited.
    function rememberCursor(cm) {
        var path = cm.getDoc()._owletPath;
        if (!path) return;
        var pos = cm.getCursor();
        cursorMap[path] = { line: pos.line, ch: pos.ch };
        clearTimeout(cursorTimer);
        cursorTimer = setTimeout(writeCursors, 300);
    }

    // Write the cursor map now.
    function writeCursors() {
        clearTimeout(cursorTimer);
        try {
            localStorage.setItem(CURSOR_KEY, JSON.stringify(cursorMap));
        } catch (e) { /* storage full or blocked — cursors simply aren't kept */ }
    }

    // Put the cursor back where the user left it, once per file per editor.
    function restoreCursor(cm) {
        var path = cm && cm.owletPath;
        if (!path) return;
        cm.getDoc()._owletPath = path;
        if (cm._cursorFor === path) return;
        cm._cursorFor = path;
        var saved = cursorMap[path];
        if (!saved) return;
        var line = Math.min(saved.line, cm.lineCount() - 1);
        var pos = { line: line, ch: Math.min(saved.ch, cm.getLine(line).length) };
        cm.setCursor(pos);
        cm.scrollIntoView(pos, 80);
    }

    // Save the cursor of the file the active editor shows. Called BEFORE a tab
    // switch swaps the document, so the position is stored under the right file.
    function rememberActiveCursor() {
        var cm = activeEditor();
        if (cm) rememberCursor(cm);
    }

    // Write every pending layout and cursor change right away.
    function flushSaves() {
        rememberActiveCursor();
        writeLayout();
        writeCursors();
    }

    // Load + validate the saved layout (silent fallback to one group).
    function restoreSaved() {
        try {
            var raw = localStorage.getItem(LAYOUT_KEY);
            if (!raw) return;
            Owlet.state.restoreLayout(JSON.parse(raw));
        } catch (e) { /* corrupt JSON -> keep the default single group */ }
    }

    // ---------- drag & drop ---------------------------------------------------

    var DND_TAB = 'application/x-owlet-tab';
    var DND_FILE = 'application/x-owlet-file';

    // Make a tab draggable — payload is its path + owning group.
    function wireTabDrag(tab, path, groupId) {
        tab.addEventListener('dragstart', function (e) {
            e.dataTransfer.setData(DND_TAB, JSON.stringify({ path: path, groupId: groupId }));
            e.dataTransfer.setData('text/plain', path);
            e.dataTransfer.effectAllowed = 'move';
        });
    }

    // One center drop zone per group (highlight while dragging).
    // Edge zones used to create splits — that feature is removed.
    function buildDropZones(root, groupId) {
        var zones = el('div', 'drop-zones', root);
        el('div', 'drop-zone dz-center', zones).dataset.side = 'center';
        root.addEventListener('dragover', function (e) {
            if (!hasPayload(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            showZone(root, 'center');
        });
        root.addEventListener('dragleave', function (e) {
            if (!root.contains(e.relatedTarget)) showZone(root, null);
        });
        root.addEventListener('drop', function (e) {
            if (!hasPayload(e)) return;
            e.preventDefault();
            showZone(root, null);
            dropPayload(e, groupId);
        });
    }

    // Does the drag carry a Owlet tab or file?
    function hasPayload(e) {
        var t = e.dataTransfer && e.dataTransfer.types;
        return t && (Array.prototype.indexOf.call(t, DND_TAB) !== -1
                     || Array.prototype.indexOf.call(t, DND_FILE) !== -1);
    }

    // Highlight (or clear) the hovered drop zone.
    function showZone(root, side) {
        root.querySelectorAll('.drop-zone').forEach(function (z) {
            z.classList.toggle('hot', z.dataset.side === side);
        });
    }

    // Apply a drop: reorder inside this group, or move the tab/file into it.
    function dropPayload(e, groupId) {
        var raw = e.dataTransfer.getData(DND_TAB) || e.dataTransfer.getData(DND_FILE);
        if (!raw) return;
        var data;
        try { data = JSON.parse(raw); } catch (err) { return; }
        if (!data.path) return;
        if (data.groupId === groupId) {
            // Same-group drop: reorder the tab before the hovered tab.
            var tab = e.target && e.target.closest ? e.target.closest('.tab') : null;
            var idx = tab ? tabIndexIn(tab) : undefined;
            Owlet.state.reorderTab(data.path, groupId, idx);
        } else if (data.groupId) {
            Owlet.state.moveTabToGroup(data.path, data.groupId, groupId);
        } else {
            Owlet.state.openFile(data.path, groupId);
        }
        Owlet.state.setActiveGroup(groupId);
    }

    // Index of a tab element inside its strip (used for in-group reorder).
    function tabIndexIn(tab) {
        return Array.prototype.indexOf.call(tab.parentNode.children, tab);
    }

    // ---------- tab context menu (keyboard-accessible alternative to DnD) -----

    // Pinned tabs can't be closed; their × becomes a pin icon that unpins.
    function togglePin(path) {
        if (pinnedTabs[path]) delete pinnedTabs[path]; else pinnedTabs[path] = true;
        renderTabs();
    }
    function isPinned(path) { return !!pinnedTabs[path]; }

    // Put the file's full path on the clipboard.
    function copyPath(path) {
        var done = function () { OwletUI.toast('Copied: ' + path, 'info', { duration: 1800 }); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(path).then(done, function () {
                OwletUI.toast('Copy failed', 'error', { duration: 1800 });
            });
            return;
        }
        var ta = document.createElement('textarea');
        ta.value = path;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* no clipboard */ }
        ta.remove();
    }

    // Open the explorer and flash the file's tree row.
    function revealInExplorer(path) {
        var st = OwletUI.layout && OwletUI.layout.getState ? OwletUI.layout.getState() : null;
        if (OwletUI.layout && !(st && st.side.view === 'explorer' && st.side.open)) {
            OwletUI.layout.setView('explorer');
        }
        Owlet.filetree.reveal(path);
    }

    // Right-click menu on a tab.
    function tabMenu(x, y, path, groupId) {
        var pinned = !!pinnedTabs[path];
        OwletUI.menu.open(null, [
            { label: 'Close', icon: 'x', onSelect: function () { Owlet.tabs.closeTab(path, groupId); } },
            { label: pinned ? 'Unpin' : 'Pin', icon: 'pin', checked: pinned,
              onSelect: function () { togglePin(path); } },
            { separator: true },
            { label: 'Copy path', icon: 'copy', onSelect: function () { copyPath(path); } },
            { label: 'Reveal in explorer', icon: 'crosshair', onSelect: function () { revealInExplorer(path); } }
        ], { x: x, y: y });
    }

    // ---------- module API ------------------------------------------------------

    // Public actions used by other modules (split/group commands removed).
    var api = {
        init: init,
        render: render,
        activeEditor: activeEditor,
        forEachEditor: forEachEditor,
        isPinned: isPinned,
        on: on
    };

    // Keep the small-screen flag current (mobile shows only the active group).
    function wireResize() {
        window.addEventListener('resize', function () {
            if (!container) return;
            container.classList.toggle('small-screen', window.innerWidth < 700);
        });
    }

    // Boot: restore layout, build the views, subscribe, wire keys.
    // Restore/render failures must not kill the subscriptions — without them
    // the DOM can desync from state (groups pile up unseen until the cap).
    function init() {
        container = document.getElementById('editor-groups');
        if (!container) return;
        // Registered before the first render so the initial editor is covered.
        on('activeEditor', restoreCursor);
        window.addEventListener('pagehide', flushSaves);
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') flushSaves();
        });
        try {
            restoreSaved();
            render();
        } catch (e) {
            console.error('[Owlet] editor groups init failed:', e);
        }
        Owlet.state.on('groups:changed', function () { rememberActiveCursor(); render(); scheduleSave(); });
        Owlet.state.on('tabs:changed', function () { rememberActiveCursor(); renderTabs(); syncEditors(); scheduleSave(); });
        Owlet.state.on('dirty:changed', renderTabs);
        Owlet.state.on('active:changed', function () {
            rememberActiveCursor();
            syncEditors();
            // Active-group accent follows focus even without a DOM rebuild.
            var activeId = Owlet.state.activeGroup().id;
            Object.keys(views).forEach(function (id) {
                views[id].root.classList.toggle('active', id === activeId);
            });
            fire('activeEditor', activeEditor());
        });
        Owlet.state.on('project:loaded', render);
        wireResize();
    }

    return api;
})();

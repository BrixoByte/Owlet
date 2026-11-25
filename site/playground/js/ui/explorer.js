// explorer.js — UI decoration for the Explorer (sidebar) and its side views.
// filetree.js still builds the tree; this module watches #file-tree and adds:
// file-type chips, git status letters/colours, icon actions, the filter box,
// and the Source Control list (fed by OwletUI.setGitChanges).

window.OwletUI = window.OwletUI || {};

OwletUI.explorer = (function () {
    var GIT_CLASS = { M: 'is-git-modified', A: 'is-git-added', U: 'is-git-untracked', D: 'is-git-deleted' };
    var KIND_BY_EXT = { js: 'js', mjs: 'js', html: 'html', htm: 'html', css: 'css', scss: 'css',
                        py: 'py', json: 'json', md: 'md', png: 'img', jpg: 'img', jpeg: 'img', gif: 'img', svg: 'img' };
    var LABEL_BY_KIND = { js: 'JS', html: '<>', css: '#', py: 'PY', json: '{}', md: 'MD', img: 'IMG' };
    var ACTION_ICON = { Rename: 'pencil', Delete: 'trash', 'Delete folder': 'trash' };
    var filterText = '';
    var observer = null;

    // Pick the coloured type chip for a file name (empty kind = plain text chip).
    function typeChip(name) {
        var ext = (name.split('.').pop() || '').toLowerCase();
        var kind = KIND_BY_EXT[ext] || 'text';
        var label = LABEL_BY_KIND[KIND_BY_EXT[ext]] || 'TXT';
        return '<span class="ftype" data-kind="' + kind + '">' + label + '</span>';
    }

    // Replace the plain bullet with a type chip and add the git letter.
    function decorateFile(row) {
        var path = row.title;
        var name = row.querySelector('.tree-name');
        var iconSlot = row.querySelector('.tree-icon');
        if (iconSlot && name) iconSlot.innerHTML = typeChip(name.textContent);
        var status = OwletUI.snapshot.tree[path] || '';
        if (status && GIT_CLASS[status]) {
            row.classList.add(GIT_CLASS[status]);
            var letter = document.createElement('span');
            letter.className = 'tree-git';
            letter.setAttribute('data-status', status);
            letter.setAttribute('title', 'Git: ' + status);
            letter.textContent = status;
            var actions = row.querySelector('.tree-actions');
            row.insertBefore(letter, actions);
        }
    }

    // Folders keep the ▸ collapse chevron in .tree-icon; add a folder glyph
    // after it (open folder when expanded). The tree re-renders on collapse
    // toggles, so the icon always matches the current state.
    function decorateFolder(row) {
        var iconSlot = row.querySelector('.tree-icon');
        if (!iconSlot) return;
        var old = row.querySelector('.tree-folder-icon');
        if (old) old.remove();
        var open = !row.classList.contains('collapsed');
        var fi = document.createElement('span');
        fi.className = 'tree-folder-icon';
        fi.innerHTML = OwletUI.icon(open ? 'folder-open' : 'folder');
        iconSlot.insertAdjacentElement('afterend', fi);
    }

    // Swap the text glyphs (✎ ✕) for the shared icon set.
    function decorateActions(row) {
        row.querySelectorAll('.tree-action').forEach(function (btn) {
            var icon = ACTION_ICON[btn.title];
            if (icon) btn.innerHTML = OwletUI.icon(icon);
        });
    }

    // Hide file rows that do not match the filter box text.
    function applyFilter(row) {
        var hide = filterText && row.classList.contains('file') &&
            row.title.toLowerCase().indexOf(filterText) === -1;
        row.classList.toggle('is-filtered-out', !!hide);
    }

    // Decorate every row that has not been decorated yet.
    function decorate() {
        var tree = document.getElementById('file-tree');
        if (!tree) return;
        tree.querySelectorAll('.tree-row').forEach(function (row) {
            if (!row.dataset.dk) {
                row.dataset.dk = '1';
                if (row.classList.contains('file')) decorateFile(row);
                if (row.classList.contains('folder')) decorateFolder(row);
                decorateActions(row);
            }
            applyFilter(row);
        });
    }

    // Force every row to be decorated again (after git data changes).
    function refresh() {
        document.querySelectorAll('#file-tree .tree-row').forEach(function (row) {
            delete row.dataset.dk;
            row.querySelectorAll('.tree-git').forEach(function (n) { n.remove(); });
            row.classList.remove('is-git-modified', 'is-git-added', 'is-git-untracked', 'is-git-deleted');
        });
        decorate();
    }

    // Filter box: typing hides files whose path does not contain the text.
    function wireFilter() {
        var input = document.getElementById('tree-filter');
        if (!input) return;
        input.addEventListener('input', function () {
            filterText = input.value.trim().toLowerCase();
            decorate();
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { input.value = ''; filterText = ''; decorate(); }
        });
    }

    // Watch the tree; logic re-renders it on every change.
    function watchTree() {
        var tree = document.getElementById('file-tree');
        if (!tree || !window.MutationObserver) return;
        observer = new MutationObserver(decorate);
        observer.observe(tree, { childList: true, subtree: true });
    }

    // Render the Source Control side view from the git snapshot.
    function renderGit() {
        var list = document.getElementById('git-changes');
        if (!list) return;
        var rows = OwletUI.snapshot.git;
        var badge = document.getElementById('rail-git-badge');
        if (badge) badge.textContent = rows.length ? String(rows.length) : '';
        list.innerHTML = '';
        if (!rows.length) {
            list.innerHTML = '<div class="empty-state"><h4>No changes</h4><p>Your working tree is clean.</p></div>';
            return;
        }
        rows.forEach(function (c) { list.appendChild(gitRow(c)); });
    }

    // One row in the Source Control list (click opens the file).
    function gitRow(change) {
        var row = document.createElement('button');
        row.className = 'git-row';
        row.innerHTML = '<span class="tree-git" data-status="' + change.status + '"></span><span class="git-name"></span><span class="git-stage"></span>';
        row.querySelector('.tree-git').textContent = change.status;
        row.querySelector('.git-name').textContent = change.path;
        row.querySelector('.git-stage').textContent = change.staged ? 'Staged' : '';
        row.addEventListener('click', function () {
            OwletUI.emit('ui:file-open', { path: change.path });
        });
        return row;
    }

    // React to contract updates for the trees and the git list.
    function wireUpdates() {
        window.addEventListener('owletui:changed', function (e) {
            var topic = e.detail && e.detail.topic;
            if (topic === 'tree') refresh();
            if (topic === 'git') renderGit();
        });
    }

    // Start decorating once the file tree exists.
    function init() {
        wireFilter();
        watchTree();
        wireUpdates();
        decorate();
        renderGit();
    }

    return { init: init, decorate: decorate, refresh: refresh, renderGit: renderGit };
})();

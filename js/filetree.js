// filetree.js — the sidebar file explorer. Renders the project's files as a
// nested tree (folders come from "/" inside paths) with create / rename / delete.
// Rendering is kept deliberately simple: rebuild the tree on each change.

window.Owlet = window.Owlet || {};

Owlet.filetree = (function () {
    var treeEl = null;
    var collapsed = {};        // folder paths the user has folded away
    var selectedFolder = '';   // highlighted folder — new files/folders go here
    var clearActive = '';      // file whose .active highlight is hidden (tree deselect)

    // Grab the tree container and subscribe to state changes.
    function init() {
        treeEl = document.getElementById('file-tree');
        // Click on empty tree space: drop ALL selection (folder + active-file
        // highlight) without closing the open file in the editor.
        treeEl.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('.tree-row')) return;
            if (!selectedFolder && !clearActive && !Owlet.state.activeFile) return;
            selectedFolder = '';
            clearActive = Owlet.state.activeFile || '';
            render();
        });
        Owlet.state.on('files:changed', render);
        Owlet.state.on('project:loaded', render);
        Owlet.state.on('active:changed', render);
        Owlet.state.on('groups:changed', render);
        Owlet.state.on('tabs:changed', render);
        wireToolbar();
        render();
    }

    // Turn the flat path list into a nested { folders, files } structure.
    function buildTree(paths) {
        var root = { folders: {}, files: [] };
        paths.forEach(function (p) {
            var parts = p.split('/');
            var node = root;
            for (var i = 0; i < parts.length - 1; i++) {
                node.folders[parts[i]] = node.folders[parts[i]] || { folders: {}, files: [] };
                node = node.folders[parts[i]];
            }
            node.files.push(parts[parts.length - 1]);
        });
        return root;
    }

    // Full path of a child inside a parent path ("" at the root).
    function joinPath(parent, name) {
        return parent ? parent + '/' + name : name;
    }

    // Render one tree level into a container element.
    function renderLevel(container, node, basePath) {
        var s = Owlet.state;
        var folderNames = Object.keys(node.folders).sort();
        var fileNames = node.files.slice().sort();

        // Folders first, then files — the classic explorer order.
        folderNames.forEach(function (name) {
            var path = joinPath(basePath, name);
            var row = document.createElement('div');
            row.className = 'tree-row folder' + (collapsed[path] ? ' collapsed' : '')
                + (path === selectedFolder ? ' is-selected' : '');
            row.innerHTML = '<span class="tree-icon">▸</span><span class="tree-name"></span>';
            row.querySelector('.tree-name').textContent = name;
            row.title = path;
            row.dataset.testid = 'tree-item';

            // Folder rows get a delete action (removes the whole folder).
            var actions = document.createElement('span');
            actions.className = 'tree-actions';
            var del = mkAction('✕', 'Delete folder', function (e) {
                e.stopPropagation(); deleteFolder(path);
            });
            actions.appendChild(del);
            row.appendChild(actions);

            var children = document.createElement('div');
            children.className = 'tree-children';
            if (!collapsed[path]) renderLevel(children, node.folders[name], path);

            row.addEventListener('click', function (e) {
                e.stopPropagation();
                selectedFolder = path;                    // highlight it
                clearActive = Owlet.state.activeFile || ''; // folder = the only selection
                collapsed[path] = !collapsed[path];
                render();
            });

            // Drop target: dragging a file onto a folder moves it inside.
            row.addEventListener('dragover', function (e) {
                if (!isFileDrag(e)) return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                row.classList.add('drop-target');
            });
            row.addEventListener('dragleave', function () {
                row.classList.remove('drop-target');
            });
            row.addEventListener('drop', function (e) {
                row.classList.remove('drop-target');
                var src = dragPath(e);
                if (!src) return;
                e.preventDefault();
                e.stopPropagation();
                moveIntoFolder(src, path);
            });
            container.appendChild(row);
            container.appendChild(children);
        });

        fileNames.forEach(function (name) {
            if (name === '.keep') return;   // internal empty-folder marker — hidden
            var path = joinPath(basePath, name);
            var row = document.createElement('div');
            var open = s.groupWithFile(path);
            row.className = 'tree-row file' + (path === s.activeFile && path !== clearActive ? ' active' : '')
                + (open ? ' is-open' : '');
            row.draggable = true;
            row.innerHTML = '<span class="tree-icon">•</span><span class="tree-name"></span><span class="tree-actions"></span>';
            // Drag a file onto an editor group (or an edge) to open/split it.
            row.addEventListener('dragstart', function (e) {
                e.dataTransfer.setData('application/x-owlet-file', JSON.stringify({ path: path }));
                e.dataTransfer.setData('text/plain', path);
                e.dataTransfer.effectAllowed = 'copyMove';
            });
            row.querySelector('.tree-name').textContent = name;
            row.title = path;
            row.dataset.testid = 'tree-item';

            // Small inline actions appear on hover — rename and delete.
            var actions = row.querySelector('.tree-actions');
            var ren = mkAction('✎', 'Rename', function (e) {
                e.stopPropagation(); renameFile(path);
            });
            var del = mkAction('✕', 'Delete', function (e) {
                e.stopPropagation(); deleteFile(path);
            });
            actions.appendChild(ren);
            actions.appendChild(del);

            row.addEventListener('click', function () {
                // Clicking a file = selecting it: drop folder selection + the
                // empty-area suppression, then open it in the editor.
                var hadSel = !!selectedFolder || !!clearActive;
                selectedFolder = '';
                clearActive = '';
                // Open in the group that already shows it, else the active group.
                var have = s.groupWithFile(path);
                if (have) s.focusFile(path, have); else s.openFile(path);
                if (hadSel) render();
            });
            container.appendChild(row);
        });
    }

    // Tiny helper that builds an action button for a tree row.
    function mkAction(text, title, onClick) {
        var b = document.createElement('button');
        b.className = 'tree-action';
        b.textContent = text;
        b.title = title;
        b.addEventListener('click', onClick);
        return b;
    }

    // Rebuild the whole tree from current state.
    function render() {
        if (!treeEl) return;
        treeEl.innerHTML = '';
        var paths = Owlet.state.listFiles();
        if (paths.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'tree-empty';
            empty.textContent = 'No files — create one above.';
            treeEl.appendChild(empty);
            return;
        }
        renderLevel(treeEl, buildTree(paths), '');
    }

    // The highlighted folder as a path prefix ('' when nothing is selected or
    // the folder no longer exists — e.g. its last file was moved or deleted).
    function baseDir() {
        if (!selectedFolder) return '';
        var prefix = selectedFolder + '/';
        var exists = Owlet.state.listFiles().some(function (p) {
            return p.indexOf(prefix) === 0;
        });
        if (!exists) { selectedFolder = ''; return ''; }
        return prefix;
    }

    // Ask the user for a path and create the file (also on disk in fs mode).
    function createFile() {
        var dir = baseDir();   // selected folder prefix — applied silently
        OwletUI.dialogs.prompt({
            title: 'New file',
            label: dir ? 'Inside "' + dir.slice(0, -1) + '" — use / for subfolders.'
                       : 'File path — use / for folders.',
            placeholder: 'index.html or js/app.js',
            okLabel: 'Create',
            validate: function (v) {
                return normalizePath(v) ? '' : 'Enter a valid file name.';
            }
        }).then(function (path) {
            if (!path) return;
            finishCreateFile(dir + normalizePath(path));
        });
    }

    function finishCreateFile(path) {
        path = normalizePath(path);
        if (!path) { Owlet.ui.status('Invalid file name.'); return; }
        if (!Owlet.state.createFile(path, '')) {
            Owlet.ui.status('"' + path + '" already exists.');
            return;
        }
        Owlet.storage.createOnDisk(path);
        Owlet.storage.autosave();
        Owlet.state.openFile(path);
    }

    // Ask for a folder path and create a placeholder file inside it.
    // (Empty folders can't exist in the flat path map, so we add a .keep file —
    // a common convention beginners will recognise.)
    function createFolder() {
        var dir = baseDir();   // selected folder prefix — applied silently
        OwletUI.dialogs.prompt({
            title: 'New folder',
            label: dir ? 'Inside "' + dir.slice(0, -1) + '" — use / for nesting.'
                       : 'Folder path — use / for nesting.',
            placeholder: 'css or assets/images',
            okLabel: 'Create',
            validate: function (v) {
                return normalizePath(v) ? '' : 'Enter a valid folder name.';
            }
        }).then(function (path) {
            if (!path) return;
            finishCreateFolder(dir + normalizePath(path));
        });
    }

    function finishCreateFolder(path) {
        var keepPath = path + '/.keep';
        if (!Owlet.state.createFile(keepPath, '# Keeps this folder in the project\n')) {
            Owlet.ui.status('Folder "' + path + '" already exists.');
            return;
        }
        Owlet.storage.createOnDisk(keepPath);
        Owlet.storage.autosave();
        Owlet.ui.status('Created folder "' + path + '"');
    }

    // True while a Owlet file is being dragged (our own MIME type).
    function isFileDrag(e) {
        var types = e.dataTransfer && e.dataTransfer.types;
        if (!types) return false;
        for (var i = 0; i < types.length; i++) {
            if (types[i] === 'application/x-owlet-file') return true;
        }
        return false;
    }

    // Read the dragged file path back on drop.
    function dragPath(e) {
        var raw = e.dataTransfer && e.dataTransfer.getData('application/x-owlet-file');
        if (!raw) return '';
        try { return JSON.parse(raw).path || ''; } catch (err) { return ''; }
    }

    // Move a file inside a folder (rename is the underlying operation).
    function moveIntoFolder(srcPath, folderPath) {
        var name = srcPath.split('/').pop();
        var newPath = folderPath + '/' + name;
        if (newPath === srcPath) return;                       // already inside
        if (!Owlet.state.renameFile(srcPath, newPath)) {
            Owlet.ui.status('Move failed — "' + name + '" already exists in "' + folderPath + '".');
            return;
        }
        Owlet.storage.autosave();
        Owlet.ui.status('Moved to ' + newPath);
    }

    // Rename/move a file to a new path.
    function renameFile(oldPath) {
        OwletUI.dialogs.prompt({
            title: 'Rename file',
            label: 'Rename "' + oldPath + '" to:',
            value: oldPath,
            okLabel: 'Rename',
            validate: function (v) {
                return normalizePath(v) ? '' : 'Enter a valid file name.';
            }
        }).then(function (newPath) {
            if (!newPath || newPath === oldPath) return;
            finishRename(oldPath, normalizePath(newPath));
        });
    }

    function finishRename(oldPath, newPath) {
        if (!Owlet.state.renameFile(oldPath, newPath)) {
            Owlet.ui.status('Rename failed — name taken or file missing.');
            return;
        }
        Owlet.storage.autosave();
    }

    // Delete a folder and every file inside it (folders live only via paths).
    function deleteFolder(path) {
        var prefix = path + '/';
        var victims = Owlet.state.listFiles().filter(function (p) {
            return p.indexOf(prefix) === 0;
        });
        if (!victims.length) return;
        OwletUI.dialogs.confirm({
            title: 'Delete folder',
            message: 'Delete "' + path + '" and its ' + victims.length + ' file(s)? This cannot be undone.',
            okLabel: 'Delete',
            danger: true
        }).then(function (ok) {
            if (!ok) return;
            victims.forEach(function (p) { Owlet.state.deleteFile(p); });
            Owlet.storage.autosave();
            if (selectedFolder === path || selectedFolder.indexOf(prefix) === 0) selectedFolder = '';
            delete collapsed[path];
            Owlet.ui.status('Deleted folder "' + path + '"');
        });
    }

    // Delete a file after confirming.
    function deleteFile(path) {
        OwletUI.dialogs.confirm({
            title: 'Delete file',
            message: 'Delete "' + path + '"? This cannot be undone.',
            okLabel: 'Delete',
            danger: true
        }).then(function (ok) {
            if (!ok) return;
            Owlet.state.deleteFile(path);
            Owlet.storage.autosave();
        });
    }

    // Scroll a file's tree row into view and flash it ("Reveal in explorer").
    function reveal(path) {
        // Open every ancestor folder so the row exists in the DOM.
        var parts = path.split('/');
        for (var i = 1; i < parts.length; i++) {
            delete collapsed[parts.slice(0, i).join('/')];
        }
        render();
        if (!treeEl) return;
        var row = null;
        treeEl.querySelectorAll('.tree-row.file').forEach(function (r) {
            if (r.title === path) row = r;
        });
        if (!row) return;
        row.scrollIntoView({ block: 'nearest' });
        row.classList.add('is-revealed');
        setTimeout(function () { row.classList.remove('is-revealed'); }, 1600);
    }

    // Clean a user-typed path: forward slashes, no leading "./" or "/".
    function normalizePath(p) {
        p = (p || '').trim().replace(/\\/g, '/');
        p = p.replace(/^\.?\//, '').replace(/\/+/g, '/').replace(/\/+$/, '');
        return p;
    }

    // Wire the sidebar toolbar buttons (called once in init).
    function wireToolbar() {
        bind('btn-new-file', createFile);
        bind('btn-new-folder', createFolder);
        bind('btn-open-folder', function () { Owlet.storage.openLocalFolder(); });
    }

    // Safe getElementById + click binding helper.
    function bind(id, fn) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
    }

    return { init: init, render: render, reveal: reveal, createFile: createFile, createFolder: createFolder };
})();

// storage.js — one async storage interface, two backends.
// 'browser' backend keeps projects in localStorage (simple, always available).
// 'fs' backend reads/writes a real folder on disk through the File System Access API
// (Chromium only — we detect support and fall back cleanly elsewhere).

window.Owlet = window.Owlet || {};

Owlet.storage = (function () {
    var PREFIX = 'owlet:project:';       // localStorage key prefix for saved projects
    var LAST_KEY = 'owlet:lastProject';  // name of the project to reopen on boot

    // localStorage is enough here — projects are small text files and beginners
    // can read this code easily. (IndexedDB would be for binary/large data.)

    // ---------- helpers --------------------------------------------------

    // Read + parse a localStorage key, or return fallback.
    function readJSON(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }

    // FileSystemFileHandle → text content.
    function readHandleText(handle) {
        return handle.getFile().then(function (f) { return f.text(); });
    }

    // Collect files from a FileSystemDirectoryHandle using for-await iteration.
    async function collectFiles(dirHandle, prefix) {
        var out = {};
        for await (var entry of dirHandle.values()) {
            var path = prefix ? prefix + '/' + entry.name : entry.name;
            if (entry.kind === 'file') {
                // skip binary-looking files — Owlet is a text editor
                if (isTextPath(entry.name)) {
                    out[path] = await readHandleText(entry);
                }
            } else if (entry.kind === 'directory') {
                var sub = await collectFiles(entry, path);
                Object.assign(out, sub);
            }
        }
        return out;
    }

    // Rough text-file check by extension (disk folders may contain images etc.).
    function isTextPath(name) {
        return /\.(html?|css|js|mjs|json|txt|md|py|xml|svg|csv|ya?ml|toml|ini|env|sh|gitignore)$/i.test(name)
            || !/\./.test(name); // extensionless files are treated as text
    }

    // Get (and optionally create) a file handle inside a directory handle,
    // creating nested folders as needed for a path like "css/style.css".
    async function getFileHandle(root, path, create) {
        var parts = path.split('/');
        var dir = root;
        for (var i = 0; i < parts.length - 1; i++) {
            dir = await dir.getDirectoryHandle(parts[i], { create: create });
        }
        return dir.getFileHandle(parts[parts.length - 1], { create: create });
    }

    // Write text into a FileSystemFileHandle.
    async function writeHandle(handle, text) {
        var w = await handle.createWritable();
        await w.write(text);
        await w.close();
    }

    // ---------- public API ------------------------------------------------

    // Is the File System Access API usable here? (Chromium + secure context)
    function fsSupported() {
        return typeof window.showDirectoryPicker === 'function';
    }

    // Boot: reopen the last browser project when it still exists; otherwise start
    // with an empty project (Welcome screen). Invalid storage falls back to empty.
    function init() {
        var last = readLastProjectName();
        if (last && loadBrowser(last)) return;
        Owlet.state.loadFiles({}, 'untitled');
        Owlet.state.storageMode = 'browser';
    }

    // The name stored by the last open/save, or null when missing or unusable.
    function readLastProjectName() {
        try {
            var name = localStorage.getItem(LAST_KEY);
            return typeof name === 'string' && name && name.length <= 120 ? name : null;
        } catch (e) { return null; }
    }

    // Remember which project to reopen on the next visit (storage may be blocked).
    function rememberLast(name) {
        try { localStorage.setItem(LAST_KEY, name); } catch (e) { /* optional pointer */ }
    }

    // A free name for a brand-new project: "Untitled project", "Untitled project 2", ...
    // Each project gets its own storage key, so one save never overwrites another.
    function uniqueName(base) {
        var taken = listProjects();
        var name = base;
        for (var n = 2; taken.indexOf(name) !== -1; n++) name = base + ' ' + n;
        return name;
    }

    // Persist the in-memory project (browser mode) — also marks files saved.
    // Imported binary files travel in a separate `bin` map of data: URIs;
    // when localStorage is too full we retry without them (text never lost).
    function saveBrowser(name) {
        name = name || Owlet.state.projectName;
        if (name === 'untitled') name = uniqueName('Untitled project');
        var payload = { name: name, files: Owlet.state.files, savedAt: new Date().toISOString() };
        if (Owlet.importer && Owlet.importer.dumpBinaries) {
            var bin = Owlet.importer.dumpBinaries();
            if (Object.keys(bin).length) payload.bin = bin;
        }
        var json = JSON.stringify(payload);
        try {
            localStorage.setItem(PREFIX + name, json);
        } catch (e) {
            if (!payload.bin) {
                Owlet.ui && Owlet.ui.status('Save failed: ' + e.message);
                return false;
            }
            // Quota hit with binaries inside — save the text-only version.
            delete payload.bin;
            try {
                localStorage.setItem(PREFIX + name, JSON.stringify(payload));
                Owlet.ui && Owlet.ui.status('Saved without binary assets (storage full).');
            } catch (e2) {
                Owlet.ui && Owlet.ui.status('Save failed: ' + e2.message);
                return false;
            }
        }
        rememberLast(name);
        Owlet.state.projectName = name;
        Owlet.state.markAllSaved();
        return true;
    }

    // Autosave is just saveBrowser() on a timer/debounce in browser mode.
    var autosaveTimer = null;
    function autosave() {
        if (Owlet.state.storageMode !== 'browser') return;
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(function () { saveBrowser(); }, 800);
    }

    // Save the currently active file — disk write in fs mode, project save otherwise.
    async function saveActive() {
        var s = Owlet.state;
        if (s.storageMode === 'fs' && s.fsRoot && s.activeFile) {
            try {
                var handle = await getFileHandle(s.fsRoot, s.activeFile, true);
                await writeHandle(handle, s.getFile(s.activeFile));
                Owlet.ui && Owlet.ui.status('Saved ' + s.activeFile + ' to disk');
            } catch (e) {
                Owlet.ui && Owlet.ui.status('Disk save failed: ' + e.message);
            }
        } else {
            saveBrowser();
            Owlet.ui && Owlet.ui.status('Project saved');
        }
        s.markAllSaved();
    }

    // List saved browser project names for the load dialog.
    function listProjects() {
        var names = [];
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(PREFIX) === 0) names.push(k.slice(PREFIX.length));
            }
        } catch (e) { /* storage blocked: no recent list */ }
        return names.sort();
    }

    // Load a browser project by name. Binaries are restored BEFORE loadFiles
    // so the preview's url map can see them on the first render.
    function loadBrowser(name) {
        var saved = readJSON(PREFIX + name);
        if (!saved || !saved.files || typeof saved.files !== 'object') return false;
        // Keep only string file contents; anything else is dropped silently.
        var files = {};
        Object.keys(saved.files).forEach(function (p) {
            if (typeof saved.files[p] === 'string') files[p] = saved.files[p];
        });
        if (Owlet.importer && Owlet.importer.restoreBinaries) {
            Owlet.importer.restoreBinaries(saved.bin && typeof saved.bin === 'object' ? saved.bin : {});
        }
        Owlet.state.loadFiles(files, name);
        Owlet.state.storageMode = 'browser';
        rememberLast(name);
        return true;
    }

    // Close the current project: keep a copy in Recent projects, then clear the
    // workspace. Forgetting the last name stops it from reopening on reload.
    function closeProject() {
        if (Owlet.state.storageMode === 'browser' && Object.keys(Owlet.state.files).length) saveBrowser();
        try { localStorage.removeItem(LAST_KEY); } catch (e) { /* storage blocked */ }
        if (Owlet.importer && Owlet.importer.reset) Owlet.importer.reset();
        Owlet.state.loadFiles({}, 'untitled');
        Owlet.state.storageMode = 'browser';
        Owlet.ui && Owlet.ui.status('Project closed. Find it under Recent projects.');
    }

    // Delete a saved browser project.
    function deleteProject(name) {
        localStorage.removeItem(PREFIX + name);
    }

    // Open a real folder from disk (Chromium). Returns true when a folder was loaded.
    async function openLocalFolder() {
        if (!fsSupported()) {
            Owlet.ui && Owlet.ui.status('Local folders need Chrome/Edge — project kept in browser instead.');
            return false;
        }
        try {
            var root = await window.showDirectoryPicker({ mode: 'readwrite' });
            var files = await collectFiles(root, '');
            if (Object.keys(files).length === 0) {
                Owlet.ui && Owlet.ui.status('Folder opened but no text files found.');
                return false;
            }
            Owlet.state.loadFiles(files, root.name);
            Owlet.state.storageMode = 'fs';
            Owlet.state.fsRoot = root;
            Owlet.ui && Owlet.ui.status('Opened folder: ' + root.name);
            return true;
        } catch (e) {
            if (e && e.name !== 'AbortError') {
                Owlet.ui && Owlet.ui.status('Open folder failed: ' + e.message);
            }
            return false;
        }
    }

    // Write a single file back to disk (used on Ctrl+S in fs mode).
    async function saveFileToDisk(path) {
        var s = Owlet.state;
        if (s.storageMode !== 'fs' || !s.fsRoot) return false;
        try {
            var handle = await getFileHandle(s.fsRoot, path, true);
            await writeHandle(handle, s.getFile(path));
            return true;
        } catch (e) {
            Owlet.ui && Owlet.ui.status('Save to disk failed: ' + e.message);
            return false;
        }
    }

    // Create a new file on disk too when in fs mode.
    async function createOnDisk(path) {
        var s = Owlet.state;
        if (s.storageMode !== 'fs' || !s.fsRoot) return;
        try {
            var handle = await getFileHandle(s.fsRoot, path, true);
            await writeHandle(handle, '');
        } catch (e) { /* folder-only or denied — file still exists in memory */ }
    }

    // Export the whole project as a .zip via JSZip (already on CDN).
    // Imported binaries travel as base64; imported text files get back the
    // line ending they arrived with (\r\n for CRLF sources).
    async function exportZip() {
        if (typeof JSZip === 'undefined') {
            Owlet.ui && Owlet.ui.status('JSZip not loaded — download unavailable.');
            return;
        }
        var zip = new JSZip();
        var files = Owlet.state.files;
        var importer = Owlet.importer;
        Object.keys(files).forEach(function (p) {
            var info = importer && importer.binaryInfo && importer.binaryInfo(p);
            if (info && info.dataUri) {
                zip.file(p, info.dataUri.split(',')[1] || '', { base64: true });
                return;
            }
            var text = files[p];
            if (importer && importer.eolFor && importer.eolFor(p) === '\r\n') {
                text = text.replace(/\r?\n/g, '\r\n');
            }
            zip.file(p, text);
        });
        try {
            var blob = await zip.generateAsync({ type: 'blob' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = (Owlet.state.projectName || 'owlet-project') + '.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
            Owlet.ui && Owlet.ui.status('Downloaded ' + a.download);
        } catch (e) {
            Owlet.ui && Owlet.ui.status('Zip failed: ' + e.message);
        }
    }

    return {
        init: init,
        fsSupported: fsSupported,
        saveBrowser: saveBrowser,
        saveActive: saveActive,
        autosave: autosave,
        listProjects: listProjects,
        loadBrowser: loadBrowser,
        deleteProject: deleteProject,
        closeProject: closeProject,
        openLocalFolder: openLocalFolder,
        saveFileToDisk: saveFileToDisk,
        createOnDisk: createOnDisk,
        exportZip: exportZip
    };
})();

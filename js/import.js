// import.js — read dropped folders/files in the browser and turn them into a
// Owlet project. Nothing is uploaded anywhere: every File object is read with
// the platform File API and kept in memory / localStorage like any other
// Owlet project.
//
// Pipeline: importFromDataTransfer(dt)
//   1) snapshot DataTransferItems synchronously (they die after the first await)
//   2) walk every directory entry/handle -> flat [{path, file, size, type}]
//   3) sanitize paths + apply the ignore list + hard limits
//   4) read text files as strings, binary files as data: URIs (preview-ready)
//   5) return a result object — commit() decides what to do with it
//
// Binary files live OUTSIDE Owlet.state.files (which stays text-only): their
// path is added with '' so tree/tabs work, and the real bytes sit in the
// module map `binaries` as data: URIs. preview.js reads them via eachBinary().

window.Owlet = window.Owlet || {};

Owlet.importer = (function () {
    'use strict';

    // ---------- tunables (edit these to change behaviour) --------------------

    // Folder names skipped anywhere in a path (dependency/build/meta dirs).
    var IGNORE_DIRS = [
        '.git', '.hg', '.svn', '.github', '.idea', '.vscode', '.cache',
        'node_modules', 'bower_components', 'vendor', '__pycache__',
        'dist', 'build', 'out', 'coverage', '.next', '.nuxt', '.output',
        'target', 'bin', 'obj'
    ];

    // Exact file names that are OS noise.
    var IGNORE_FILES = ['.DS_Store', 'Thumbs.db', 'desktop.ini', '.localized'];

    // Extensions that can never be edited as text — binaries/executables.
    var IGNORE_EXT = [
        'exe', 'dll', 'so', 'dylib', 'msi', 'apk', 'dmg', 'iso',
        'class', 'pyc', 'pyo', 'o', 'a', 'lib', 'jar', 'war',
        'db', 'sqlite', 'sqlite3', 'ldb', 'tmp', 'bak', 'swp'
    ];

    // Hard limits — a dialog reports what was skipped beyond these.
    var MAX_FILES = 2000;
    var MAX_TEXT_BYTES = 5 * 1024 * 1024;    // 5 MB per text file
    var MAX_TOTAL_BYTES = 50 * 1024 * 1024;  // 50 MB per whole drop
    var MAX_BINARY_BYTES = 15 * 1024 * 1024; // 15 MB per binary file

    // Read this many files in parallel, then yield so the UI stays smooth.
    var BATCH = 8;
    var SNIFF_BYTES = 8192; // bytes sampled for the NUL-byte text check

    // Extensions that are always text — everything else is NUL-sniffed.
    var TEXT_EXT = {};
    ('html htm css scss less sass js mjs cjs jsx ts tsx cts mts json jsonc '
        + 'md markdown mdx txt text py rb php go rs c h hpp cpp cxx cs java '
        + 'kt kts swift sql vue svelte astro ejs hbs mustache twig pug '
        + 'svg xml yml yaml toml csv tsv ini env cfg conf properties '
        + 'sh bash zsh fish ps1 bat cmd makefile mk cmake gradle '
        + 'gitignore gitattributes npmrc editorconfig dockerignore '
        + 'eslintrc prettierrc babelrc browserslistrc nvmrc '
        + 'lock log diff patch map webmanifest htaccess'
    ).split(' ').forEach(function (e) { TEXT_EXT[e] = true; });

    // Fallback MIME types for binary files whose File.type is empty.
    var BINARY_MIME = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
        bmp: 'image/bmp', ico: 'image/x-icon',
        woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
        mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
        mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
        pdf: 'application/pdf', zip: 'application/zip'
    };

    // ---------- module state ---------------------------------------------------

    var binaries = {};   // path -> { dataUri, mime, size } (memory-only store)
    var eolOf = {};      // path -> '\r\n' | '\n' (remembered from import)
    var diskRoot = null; // FileSystemDirectoryHandle for "save back" offers
    var noticeShown = {}; // project name -> true (once-per-project notice)

    // ---------- tiny helpers ---------------------------------------------------

    // Lowercase extension of a file name ('.gitignore' -> 'gitignore').
    function extOf(name) {
        var i = name.lastIndexOf('.');
        return i === -1 ? '' : name.slice(i + 1).toLowerCase();
    }

    // Does an extension mark a file as editable text?
    function looksTextual(name) {
        return TEXT_EXT[extOf(name)] === true || name.indexOf('.') === -1;
    }

    // Pause one frame so large reads never freeze the UI.
    function yieldFrame() {
        return new Promise(function (res) { setTimeout(res, 0); });
    }

    // ---------- path safety --------------------------------------------------

    // Clean a dropped path: forward slashes, no '..', no absolute roots, no
    // control characters. Returns null for anything unsafe.
    function cleanPath(rel) {
        var parts = String(rel || '').replace(/\\/g, '/').split('/');
        var out = [];
        for (var i = 0; i < parts.length; i++) {
            var s = parts[i];
            if (!s || s === '.') continue;               // empty / self segments
            if (s === '..' || /[\u0000-\u001f]/.test(s)) return null;
            out.push(s);
        }
        return out.length ? out.join('/') : null;
    }

    // True when any path segment is an ignored directory.
    function inIgnoredDir(path) {
        var parts = path.split('/');
        for (var i = 0; i < parts.length - 1; i++) {
            if (IGNORE_DIRS.indexOf(parts[i]) !== -1) return true;
        }
        return false;
    }

    // ---------- item collection (must stay synchronous-friendly) -------------

    // Snapshot every dropped item NOW: DataTransferItem objects become invalid
    // after the first await inside the drop handler.
    function snapshotItems(dt) {
        var items = [];
        var list = dt && dt.items && dt.items.length
            ? Array.prototype.slice.call(dt.items) : [];
        list.forEach(function (it) {
            if (it.kind !== 'file') return;
            items.push({
                entry: it.webkitGetAsEntry ? it.webkitGetAsEntry() : null,
                handlePromise: it.getAsFileSystemHandle
                    ? Promise.resolve().then(function () { return it.getAsFileSystemHandle(); })
                        .catch(function () { return null; })
                    : Promise.resolve(null),
                file: it.getAsFile ? it.getAsFile() : null
            });
        });
        // Plain File list fallback (browsers without DataTransferItem entries).
        if (!items.length && dt && dt.files && dt.files.length) {
            Array.prototype.slice.call(dt.files).forEach(function (f) {
                items.push({ entry: null, handlePromise: Promise.resolve(null), file: f });
            });
        }
        return items;
    }

    // Recursively walk a FileSystemEntry (webkitGetAsEntry) into `out`.
    // readEntries() returns ~100 entries per call — loop until it is empty.
    async function walkEntry(entry, prefix, out, dirs, stop) {
        if (stop.cancelled) return;
        if (entry.isFile) {
            var file = await new Promise(function (res, rej) { entry.file(res, rej); });
            out.push({ path: prefix + entry.name, file: file, size: file.size, type: file.type });
            return;
        }
        if (!entry.isDirectory) return; // symlinks / special files are skipped
        dirs.push(prefix + entry.name);
        var reader = entry.createReader();
        for (;;) {
            if (stop.cancelled) return;
            var batch = await new Promise(function (res, rej) { reader.readEntries(res, rej); });
            if (!batch.length) return;
            for (var i = 0; i < batch.length; i++) {
                await walkEntry(batch[i], prefix + entry.name + '/', out, dirs, stop);
            }
        }
    }

    // Recursively walk a FileSystemDirectoryHandle (File System Access API).
    async function walkHandle(handle, prefix, out, dirs, stop) {
        if (stop.cancelled) return;
        if (handle.kind === 'file') {
            var file = await handle.getFile();
            out.push({ path: prefix + handle.name, file: file, size: file.size, type: file.type });
            return;
        }
        if (handle.kind !== 'directory' || !handle.values) return;
        dirs.push(prefix + handle.name);
        for await (var child of handle.values()) {
            await walkHandle(child, prefix + handle.name + '/', out, dirs, stop);
        }
    }

    // ---------- classification -------------------------------------------------

    // Text or binary? Known text extensions win instantly; everything else is
    // sniffed for NUL bytes inside the first 8 KB.
    async function isTextFile(file, name) {
        if (looksTextual(name)) return true;
        var buf = await file.slice(0, SNIFF_BYTES).arrayBuffer();
        var u8 = new Uint8Array(buf);
        for (var i = 0; i < u8.length; i++) {
            if (u8[i] === 0) return false;
        }
        return true;
    }

    // Decode a text File: UTF-8, BOM stripped, line endings normalized to \n
    // while the original EOL is remembered for export.
    async function readText(file) {
        var text = await file.text();
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // strip BOM
        var eol = text.indexOf('\r\n') !== -1 ? '\r\n' : '\n';
        return { text: text.replace(/\r\n?/g, '\n'), eol: eol };
    }

    // MIME for a binary file — File.type when the OS knows it, else by ext.
    function binaryMime(path, file) {
        return file.type || BINARY_MIME[extOf(path)] || 'application/octet-stream';
    }

    // ArrayBuffer -> data: URI (chunked so big images do not hit arg limits).
    function bufToDataUrl(buf, mime) {
        var u8 = new Uint8Array(buf);
        var bin = '';
        var CHUNK = 0x8000;
        for (var i = 0; i < u8.length; i += CHUNK) {
            bin += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
        }
        return 'data:' + mime + ';base64,' + btoa(bin);
    }

    // ---------- the public read pipeline -------------------------------------

    // Read everything a user dropped.
    // report(stage, done, total) is called for progress UI; stop.cancelled
    // aborts cleanly. Resolves to a result object (never throws for a bad drop).
    async function importFromDataTransfer(dt, report, stop) {
        report = report || function () {};
        stop = stop || { cancelled: false };

        var result = freshResult();

        // 1) Snapshot + walk: collect every file descriptor synchronously-ish.
        var items = snapshotItems(dt);
        var raw = [];
        var dirs = [];
        var topDirs = [];
        for (var i = 0; i < items.length; i++) {
            if (stop.cancelled) break;
            var it = items[i];
            try {
                if (it.entry && it.entry.isDirectory) {
                    topDirs.push(it.entry.name);
                    // Prefer the handle path — it also gives us a save-back root.
                    var h = it.handlePromise ? await it.handlePromise : null;
                    if (h && h.kind === 'directory') {
                        if (!result.dirHandle) result.dirHandle = h;
                        await walkHandle(h, '', raw, dirs, stop);
                    } else {
                        await walkEntry(it.entry, '', raw, dirs, stop);
                    }
                } else if (it.entry && it.entry.isFile) {
                    await walkEntry(it.entry, '', raw, dirs, stop);
                } else if (it.file) {
                    raw.push({ path: it.file.name, file: it.file, size: it.file.size, type: it.file.type });
                }
            } catch (e) {
                result.skipped.push({ path: '(dropped item)', reason: 'unreadable entry' });
            }
            report('scan', i + 1, items.length);
        }
        if (stop.cancelled) { result.cancelled = true; return result; }

        // 2) Project name: one folder -> its name; otherwise a generic name.
        if (topDirs.length === 1 && items.length === 1) {
            result.name = topDirs[0];
        }

        // 3-5) Strip the single root folder, sanitize, read + classify.
        var strip = topDirs.length === 1 && items.length === 1 ? topDirs[0] + '/' : '';
        result.root = strip ? topDirs[0] : ''; // remembered for merge namespacing
        await materialize(raw, dirs, strip, result, report, stop);
        return result;
    }

    // Import a FileList from <input type="file" webkitdirectory|multiple>.
    // webkitRelativePath already carries the picked folder's name.
    async function importFromFileList(list, report, stop) {
        report = report || function () {};
        stop = stop || { cancelled: false };
        var result = freshResult();
        var files = Array.prototype.slice.call(list || []);
        var raw = files.map(function (f) {
            var rel = f.webkitRelativePath || f.name;
            return { path: rel, file: f, size: f.size, type: f.type };
        });

        // A picked folder shows up as a shared first path segment — strip it.
        var root = '';
        var hasSlash = false, uniform = true;
        raw.forEach(function (d) {
            var seg = d.path.split('/');
            if (seg.length > 1) hasSlash = true;
            if (!root) root = seg[0];
            else if (seg[0] !== root) uniform = false;
        });
        var strip = (hasSlash && uniform && root) ? root + '/' : '';
        if (strip) result.name = root;
        result.root = strip ? root : '';

        await materialize(raw, [], strip, result, report, stop);
        return result;
    }

    // The empty result shape every entry point fills.
    function freshResult() {
        return {
            name: 'Imported project',
            root: '',           // stripped top folder name — merge keeps it as a namespace
            files: {},          // path -> text content
            binaries: {},       // path -> { dataUri, mime, size }
            eols: {},           // path -> '\r\n' | '\n'
            skipped: [],        // { path, reason }
            counts: { files: 0, skipped: 0 },
            dirHandle: null,    // FileSystemDirectoryHandle when available
            cancelled: false
        };
    }

    // Steps 3-5 shared by drops and file picks: sanitize + ignore + limits,
    // then batched reads, then empty-folder .keep markers.
    // `strip` is the root prefix removed from every raw path.
    async function materialize(raw, dirs, strip, result, report, stop) {
        var clean = [];
        var totalBytes = 0;
        for (var j = 0; j < raw.length; j++) {
            var d = raw[j];
            var rel = d.path;
            if (strip && rel.indexOf(strip) === 0) rel = rel.slice(strip.length);
            var safe = cleanPath(rel);
            if (!safe) {
                result.skipped.push({ path: d.path, reason: 'unsafe path' });
                continue;
            }
            var base = safe.split('/').pop();
            if (inIgnoredDir(safe)) {
                result.skipped.push({ path: safe, reason: 'ignored folder' });
                continue;
            }
            if (IGNORE_FILES.indexOf(base) !== -1 || IGNORE_EXT.indexOf(extOf(base)) !== -1) {
                result.skipped.push({ path: safe, reason: 'ignored file type' });
                continue;
            }
            if (clean.length >= MAX_FILES) {
                result.skipped.push({ path: safe, reason: 'file limit (' + MAX_FILES + ')' });
                continue;
            }
            totalBytes += d.size;
            if (totalBytes > MAX_TOTAL_BYTES) {
                result.skipped.push({ path: safe, reason: 'project size limit' });
                continue;
            }
            clean.push({ path: safe, file: d.file, size: d.size, type: d.type });
        }

        // 4) Read file contents in small parallel batches.
        for (var k = 0; k < clean.length; k += BATCH) {
            if (stop.cancelled) break;
            await Promise.all(clean.slice(k, k + BATCH).map(async function (d) {
                try {
                    var text = await isTextFile(d.file, d.path.split('/').pop());
                    if (text) {
                        if (d.size > MAX_TEXT_BYTES) {
                            result.skipped.push({ path: d.path, reason: 'file over ' + (MAX_TEXT_BYTES / 1048576) + ' MB' });
                            return;
                        }
                        var r = await readText(d.file);
                        result.files[d.path] = r.text;
                        result.eols[d.path] = r.eol;
                    } else {
                        if (d.size > MAX_BINARY_BYTES) {
                            result.skipped.push({ path: d.path, reason: 'binary over ' + (MAX_BINARY_BYTES / 1048576) + ' MB' });
                            return;
                        }
                        var buf = await d.file.arrayBuffer();
                        var mime = binaryMime(d.path, d.file);
                        result.binaries[d.path] = { dataUri: bufToDataUrl(buf, mime), mime: mime, size: d.size };
                    }
                } catch (e) {
                    result.skipped.push({ path: d.path, reason: 'unreadable file' });
                }
            }));
            report('read', Math.min(k + BATCH, clean.length), clean.length);
            await yieldFrame();
        }
        if (stop.cancelled) { result.cancelled = true; return; }

        // 5) Keep empty folders alive with a hidden .keep marker file.
        var filePaths = Object.keys(result.files).concat(Object.keys(result.binaries));
        dirs.forEach(function (dirPath) {
            var rel = dirPath;
            if (strip && rel.indexOf(strip) === 0) rel = rel.slice(strip.length);
            var safe = cleanPath(rel);
            if (!safe || inIgnoredDir(safe)) return;
            var hasChild = filePaths.some(function (p) { return p.indexOf(safe + '/') === 0; });
            if (!hasChild && result.files[safe + '/.keep'] === undefined) {
                result.files[safe + '/.keep'] = '# Keeps this folder in the project\n';
            }
        });

        result.counts.files = filePaths.length;
        result.counts.skipped = result.skipped.length;
    }

    // ---------- ZIP import ------------------------------------------------------

    // Import a .zip File: JSZip is already bundled on the CDN, so this works
    // offline too. Rejects zip-bombs and unsafe paths before extracting.
    async function importZip(file, report, stop) {
        report = report || function () {};
        stop = stop || { cancelled: false };
        var result = freshResult();
        result.name = file.name.replace(/\.zip$/i, '') || 'Imported project';

        if (typeof JSZip === 'undefined') {
            Owlet.ui && Owlet.ui.status('ZIP import needs JSZip — check your connection and reload.');
            result.cancelled = true;
            return result;
        }

        var zip;
        try {
            zip = await JSZip.loadAsync(file);
        } catch (e) {
            Owlet.ui && Owlet.ui.status('That file is not a readable ZIP.');
            result.cancelled = true;
            return result;
        }

        // Collect entries + uncompressed sizes first (zip-bomb protection).
        var entries = [];
        var totalSize = 0;
        zip.forEach(function (rel, entry) {
            if (entry.dir) return;
            var info = entry._data && entry._data.uncompressedSize;
            totalSize += info || 0;
            entries.push({ rel: rel, entry: entry });
        });
        if (entries.length > MAX_FILES || totalSize > MAX_TOTAL_BYTES) {
            Owlet.ui && Owlet.ui.status('ZIP too large — ' + entries.length + ' files, '
                + Math.round(totalSize / 1048576) + ' MB uncompressed.');
            result.cancelled = true;
            return result;
        }

        // A zip whose contents share one top folder keeps it as the merge
        // namespace — same rule as a dropped folder.
        var top = '', hasSlash = false, uniform = true;
        entries.forEach(function (e) {
            var seg = e.rel.split('/');
            if (seg.length > 1) hasSlash = true;
            if (!top) top = seg[0];
            else if (seg[0] !== top) uniform = false;
        });
        var strip = (hasSlash && uniform && top) ? top + '/' : '';
        if (strip) result.root = top;

        // Extract every entry through the same sanitize/ignore/classify pass.
        var raw = [];
        var dirs = [];
        for (var i = 0; i < entries.length; i++) {
            if (stop.cancelled) { result.cancelled = true; return result; }
            var e = entries[i];
            try {
                var buf = await e.entry.async('arraybuffer');
                var f = new File([buf], e.rel.split('/').pop() || 'file', { type: '' });
                raw.push({ path: e.rel, file: f, size: buf.byteLength, type: '' });
            } catch (err) {
                result.skipped.push({ path: e.rel, reason: 'unreadable zip entry' });
            }
            if (i % 16 === 15) {
                report('read', i + 1, entries.length);
                await yieldFrame();
            }
        }
        await materialize(raw, dirs, strip, result, report, stop);
        return result;
    }

    // ---------- commit: turn a read result into a project ----------------------

    // Small modal with arbitrary buttons — OwletUI.dialogs only knows
    // prompt/confirm. Returns the clicked button's value, null on cancel.
    // opts: { title, message, details[], check, buttons: [{label, value, cls, focus}] }
    function modal(opts) {
        return new Promise(function (resolve) {
            var overlay = document.createElement('div');
            overlay.className = 'dialog prompt-dialog';
            var box = document.createElement('div');
            box.className = 'dialog-box dialog--sm prompt-box';
            box.setAttribute('role', 'dialog');
            box.setAttribute('aria-modal', 'true');
            overlay.appendChild(box);
            document.body.appendChild(overlay);

            function close(v) {
                document.removeEventListener('keydown', onKey, true);
                overlay.remove();
                resolve(v);
            }
            function onKey(e) {
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); }
            }
            document.addEventListener('keydown', onKey, true);
            overlay.addEventListener('mousedown', function (e) {
                if (e.target === overlay) close(null);
            });

            if (opts.title) {
                var head = document.createElement('header');
                head.className = 'dlg-head';
                head.innerHTML = '<div class="dlg-titles"><div class="dlg-title"></div></div>';
                head.querySelector('.dlg-title').textContent = opts.title;
                box.appendChild(head);
            }
            var body = document.createElement('div');
            body.className = 'dlg-body';
            if (opts.message) {
                var p = document.createElement('p');
                p.className = 'prompt-desc';
                p.textContent = opts.message;
                body.appendChild(p);
            }
            if (opts.details && opts.details.length) {
                var list = document.createElement('div');
                list.className = 'import-details';
                opts.details.forEach(function (line) {
                    var row = document.createElement('div');
                    row.textContent = line;
                    list.appendChild(row);
                });
                body.appendChild(list);
            }
            var getCheck = function () { return false; };
            if (opts.check) {
                var lab = document.createElement('label');
                lab.className = 'import-check';
                var cb = document.createElement('input');
                cb.type = 'checkbox';
                lab.appendChild(cb);
                lab.appendChild(document.createTextNode(' ' + opts.check));
                body.appendChild(lab);
                getCheck = function () { return cb.checked; };
            }
            box.appendChild(body);

            var actions = document.createElement('footer');
            actions.className = 'dlg-foot';
            (opts.buttons || []).forEach(function (b) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn ' + (b.cls || 'btn-ghost');
                btn.textContent = b.label;
                btn.addEventListener('click', function () {
                    close(opts.check ? { value: b.value, all: getCheck() } : b.value);
                });
                actions.appendChild(btn);
                if (b.focus) setTimeout(function () { btn.focus(); }, 0);
            });
            box.appendChild(actions);
        });
    }

    // 'css/x.css' -> 'css/x-copy.css' (or -2, -3…) — a path not already taken.
    function keepBothPath(path, taken) {
        var i = path.lastIndexOf('.');
        var stem = i === -1 ? path : path.slice(0, i);
        var ext = i === -1 ? '' : path.slice(i);
        var n = 0, cand;
        do {
            cand = stem + '-copy' + (n ? '-' + n : '') + ext;
            n++;
        } while (taken[cand]);
        return cand;
    }

    // Copy one imported entry into Owlet.state (text or binary placeholder).
    function writePath(target, srcPath, result) {
        var s = Owlet.state;
        if (result.binaries && result.binaries[srcPath]) {
            if (srcPath !== target && !binaries[target]) {
                binaries[target] = result.binaries[srcPath]; // 'keep both' copy
            }
            if (s.files[target] === undefined) s.createFile(target, '');
            else s.setFile(target, '');
            s.markSaved(target);
            return;
        }
        var text = result.files[srcPath];
        if (text === undefined) return;
        if (s.files[target] === undefined) s.createFile(target, text);
        else s.setFile(target, text);
        s.markSaved(target);
    }

    // Merge a read result into the OPEN project, asking once per conflict
    // (or once for all when the "apply to all" box is ticked).
    // A dropped folder lands under its own name ("landing/index.html") so its
    // internal links and stylesheets can never collide with — or overwrite —
    // the open project's files. Loose multi-root drops stay at the root.
    async function mergeIntoCurrent(result) {
        var ns = result.root ? result.root + '/' : '';
        adopt(result, true, ns);
        var paths = Object.keys(result.files).concat(Object.keys(result.binaries)).sort();
        var applyAll = null;
        for (var i = 0; i < paths.length; i++) {
            var p = paths[i];
            var target = ns + p;
            if (Owlet.state.files[target] !== undefined) {
                var choice = applyAll;
                if (!choice) {
                    var ask = await modal({
                        title: 'File already exists',
                        message: '"' + target + '" is already in this project.',
                        check: 'Apply to all conflicts',
                        buttons: [
                            { label: 'Replace', value: 'replace', cls: 'btn-danger', focus: true },
                            { label: 'Keep both', value: 'keep', cls: 'btn-ghost' },
                            { label: 'Skip', value: 'skip', cls: 'btn-ghost' }
                        ]
                    });
                    if (!ask) return; // cancel = stop merging, keep what landed
                    choice = ask.value;
                    if (ask.all) applyAll = choice;
                }
                if (choice === 'skip') continue;
                if (choice === 'keep') target = keepBothPath(target, Owlet.state.files);
            }
            writePath(target, p, result);
        }
        Owlet.storage.saveBrowser();
    }

    // Replace the current project with the import (fresh state, one group).
    function loadAsNew(result) {
        adopt(result, false);
        var files = {};
        Object.keys(result.files).forEach(function (p) { files[p] = result.files[p]; });
        Object.keys(result.binaries).forEach(function (p) { files[p] = ''; });
        Owlet.state.loadFiles(files, result.name);
        Owlet.state.storageMode = 'browser';
        Owlet.storage.saveBrowser(); // autosave + Recent projects entry
    }

    // Which imported file should open automatically (priority order).
    // Matches on the file NAME so a namespaced merge (landing/index.html)
    // still picks the real entry file.
    function pickEntry(paths) {
        var byName = { 'index.html': 0, 'main.html': 1, 'app.html': 2 };
        var best = null, bestRank = 99;
        paths.forEach(function (p) {
            var base = p.split('/').pop().toLowerCase();
            var rank = byName[base] !== undefined ? byName[base]
                : base === 'readme.md' ? 3
                : /\.html?$/i.test(base) ? 4
                : 5;
            if (rank < bestRank || (rank === bestRank && (!best || p < best))) { best = p; bestRank = rank; }
        });
        return best;
    }

    // Explorer open + reveal + open entry file + first preview render.
    // In merge mode the imported files live under result.root — open the
    // namespaced entry so the editor shows what just arrived.
    function openAfterCommit(result, merged) {
        var ns = merged && result.root ? result.root + '/' : '';
        var textPaths = Object.keys(result.files);
        var entry = pickEntry(textPaths);
        if (window.OwletUI && OwletUI.layout && OwletUI.layout.setView) {
            OwletUI.layout.setView('explorer');
        }
        if (entry && Owlet.state.files[ns + entry] !== undefined) {
            Owlet.filetree.reveal(ns + entry);
            Owlet.state.openFile(ns + entry);
        }
        var hasHtml = textPaths.some(function (p) { return /\.html?$/i.test(p); });
        if (merged && hasHtml && Owlet.preview) Owlet.preview.update();
    }

    // One-time "this is a browser copy" notice for an imported project.
    function showCopyNotice(name) {
        if (noticeWasShown(name)) return;
        markNoticeShown(name);
        if (window.OwletUI && OwletUI.toast) {
            OwletUI.toast('This is a copy stored in your browser. Use Export to save your changes.', 'info', { duration: 8000 });
        }
    }

    // Chromium only: a dropped folder may carry a real directory handle.
    // Offer to wire Ctrl+S to the original folder — explicit user action,
    // then requestPermission(). Declining keeps everything in-browser.
    async function offerSaveBack(result) {
        var h = result && result.dirHandle;
        if (!h || !h.requestPermission || Owlet.state.storageMode === 'fs') return;
        var yes = await modal({
            title: 'Save back to the original folder?',
            message: 'Ctrl+S can write changes straight into "' + (h.name || result.name) + '". Files still live in your browser until you save.',
            buttons: [
                { label: 'Enable save to folder', value: true, cls: 'btn-primary', focus: true },
                { label: 'Keep in browser', value: false, cls: 'btn-ghost' }
            ]
        });
        if (yes !== true) return;
        try {
            var state = await h.requestPermission({ mode: 'readwrite' });
            if (state !== 'granted') {
                Owlet.ui && Owlet.ui.status('Permission not granted — project stays in the browser.');
                return;
            }
            Owlet.state.fsRoot = h;
            Owlet.state.storageMode = 'fs';
            Owlet.ui && Owlet.ui.status('Ctrl+S now saves into "' + (h.name || 'the folder') + '".');
        } catch (e) {
            Owlet.ui && Owlet.ui.status('Could not link the folder: ' + e.message);
        }
    }

    // The "View details" dialog behind the import summary toast.
    function showSkipped(result) {
        var lines = (result.skipped || []).map(function (s) {
            return s.path + ' — ' + s.reason;
        });
        return modal({
            title: 'Skipped during import',
            message: lines.length ? lines.length + ' item(s) were not imported:' : 'Nothing was skipped.',
            details: lines.slice(0, 200),
            buttons: [{ label: 'OK', value: true, cls: 'btn-primary', focus: true }]
        });
    }

    // Public: apply a finished read result. Handles the new-vs-merge choice,
    // the conflict loop, auto-open, and the summary toast.
    async function commit(result) {
        if (!result || result.cancelled) return false;
        if (!result.counts.files) {
            Owlet.ui && Owlet.ui.status('Nothing to import' + (result.skipped.length ? ' — ' + result.skipped.length + ' skipped.' : '.'));
            if (result.skipped.length) await showSkipped(result);
            return false;
        }

        var hasExisting = Owlet.state.listFiles().length > 0;
        var mode = 'new';
        if (hasExisting) {
            var choice = await modal({
                title: 'Open dropped files',
                message: 'Import ' + result.counts.files + ' file(s) from "' + result.name + '".',
                buttons: [
                    { label: 'Open as new project', value: 'new', cls: 'btn-primary', focus: true },
                    { label: result.root
                        ? 'Merge as folder "' + result.root + '/"'
                        : 'Merge into current project', value: 'merge', cls: 'btn-ghost' },
                    { label: 'Cancel', value: null, cls: 'btn-ghost' }
                ]
            });
            if (!choice) return false;
            mode = choice;
        }

        if (mode === 'merge') await mergeIntoCurrent(result);
        else loadAsNew(result);

        openAfterCommit(result, mode === 'merge');
        showCopyNotice(Owlet.state.projectName);
        if (mode === 'new') {
            offerSaveBack(result).catch(function () { /* save-back is best-effort */ });
        }

        var msg = 'Imported ' + result.counts.files + ' file(s)'
            + (result.counts.skipped ? ' — ' + result.counts.skipped + ' skipped' : '');
        if (window.OwletUI && OwletUI.toast) {
            OwletUI.toast(msg, result.counts.skipped ? 'warn' : 'success', {
                duration: 6000,
                action: result.counts.skipped
                    ? { label: 'View details', onClick: function () { showSkipped(result); } }
                    : null
            });
        } else {
            Owlet.ui && Owlet.ui.status(msg);
        }
        return true;
    }

    // ---------- binary + metadata helpers used by the rest of the app ----------

    // Is this path a binary file from the last import? The files map is the
    // authority — a stale entry left by delete/rename does not count.
    function isBinary(path) {
        return !!binaries[path] && Owlet.state.files[path] !== undefined;
    }

    // Iterate binaries: fn(path, dataUri) — preview.js builds its url map.
    function eachBinary(fn) {
        Object.keys(binaries).forEach(function (p) { fn(p, binaries[p].dataUri); });
    }

    // The data: URI for a binary path (viewer + preview).
    function dataUriOf(path) { return binaries[path] ? binaries[path].dataUri : null; }

    // Metadata about a binary file (viewer header).
    function binaryInfo(path) { return binaries[path] || null; }

    // The line ending remembered for a text path (used on ZIP export).
    function eolFor(path) { return eolOf[path] || '\n'; }

    // Replace the module's binary/EOL maps (new project) or extend (merge).
    // `prefix` namespaces merged keys so they match their state paths.
    function adopt(result, merge, prefix) {
        var ns = prefix || '';
        if (!merge) { binaries = {}; eolOf = {}; }
        Object.keys(result.binaries || {}).forEach(function (p) { binaries[ns + p] = result.binaries[p]; });
        Object.keys(result.eols || {}).forEach(function (p) { eolOf[ns + p] = result.eols[p]; });
        if (result.dirHandle) diskRoot = result.dirHandle;
    }

    // Drop all stored binaries/metadata (project switched away).
    function reset() { binaries = {}; eolOf = {}; diskRoot = null; }

    // The dropped directory handle, when Chromium provided one (save-back).
    function droppedRoot() { return diskRoot; }

    // Was the "temporary copy" notice already shown for this project?
    function noticeWasShown(name) { return !!noticeShown[name]; }
    function markNoticeShown(name) { noticeShown[name] = true; }

    // Persist the binary map (data: URIs are already strings).
    function dumpBinaries() { return binaries; }

    // Restore a binary map saved earlier by dumpBinaries.
    function restoreBinaries(map) {
        binaries = {};
        Object.keys(map || {}).forEach(function (p) { binaries[p] = map[p]; });
    }

    // Keep binary + EOL maps aligned when a file is renamed/moved in the tree.
    if (Owlet.state && Owlet.state.on) {
        Owlet.state.on('file:renamed', function (d) {
            if (!d || !d.from || !d.to) return;
            if (binaries[d.from]) { binaries[d.to] = binaries[d.from]; delete binaries[d.from]; }
            if (eolOf[d.from]) { eolOf[d.to] = eolOf[d.from]; delete eolOf[d.from]; }
        });
    }

    return {
        IGNORE_DIRS: IGNORE_DIRS,
        IGNORE_FILES: IGNORE_FILES,
        IGNORE_EXT: IGNORE_EXT,
        MAX_FILES: MAX_FILES,
        MAX_TEXT_BYTES: MAX_TEXT_BYTES,
        MAX_TOTAL_BYTES: MAX_TOTAL_BYTES,
        MAX_BINARY_BYTES: MAX_BINARY_BYTES,
        importFromDataTransfer: importFromDataTransfer,
        importFromFileList: importFromFileList,
        importZip: importZip,
        commit: commit,
        isBinary: isBinary,
        eachBinary: eachBinary,
        dataUriOf: dataUriOf,
        binaryInfo: binaryInfo,
        eolFor: eolFor,
        adopt: adopt,
        reset: reset,
        droppedRoot: droppedRoot,
        noticeWasShown: noticeWasShown,
        markNoticeShown: markNoticeShown,
        dumpBinaries: dumpBinaries,
        restoreBinaries: restoreBinaries
    };
})();

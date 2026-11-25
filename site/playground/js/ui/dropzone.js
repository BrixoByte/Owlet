// dropzone.js — the drag-and-drop UX for Owlet's folder import.
//
// Owns: the full-window "Drop a folder or files" overlay, the hidden
// <input type="file"> pickers (folder + loose files), and the cancellable
// progress toast. The actual reading lives in js/import.js — this file only
// decides WHICH entry point to call and reports progress/errors.
//
// Internal drags (tabs, explorer rows) use application/x-owlet-* types and
// never trigger this overlay: we only react to drags containing 'Files'.

window.OwletUI = window.OwletUI || {};

OwletUI.dropzone = (function () {
    var dragDepth = 0;      // enter/leave counter — avoids flicker over children
    var overlay = null;     // lazily-built overlay element
    var pickFolderInput = null;
    var pickFilesInput = null;

    // ---------- overlay ------------------------------------------------------

    // Build the overlay once; shown/hidden via the .is-on class.
    function getOverlay() {
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.className = 'drop-overlay';
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'polite');
        overlay.innerHTML = '<div class="drop-overlay-inner">'
            + OwletUI.icon('folder-open')
            + '<strong>Drop a folder or files</strong>'
            + '<span>Files stay on your device — nothing is uploaded.</span>'
            + '</div>';
        document.body.appendChild(overlay);
        return overlay;
    }

    function showOverlay() { getOverlay().classList.add('is-on'); }
    function hideOverlay() {
        dragDepth = 0;
        if (overlay) overlay.classList.remove('is-on');
    }

    // Is this an OS file drag (vs. an in-app tab/explorer drag)?
    function isFileDrag(e) {
        var t = e.dataTransfer && e.dataTransfer.types;
        if (!t) return false;
        for (var i = 0; i < t.length; i++) {
            if (t[i] === 'Files') return true;
        }
        return false;
    }

    // ---------- progress toast -------------------------------------------------

    // A persistent toast with a live counter and a Cancel button.
    // Returns { update(done,total), close(msg) }.
    function progressToast() {
        var root = document.querySelector('.toast-root');
        if (!root) {
            root = document.createElement('div');
            root.className = 'toast-root';
            root.setAttribute('role', 'status');
            root.setAttribute('aria-live', 'polite');
            document.body.appendChild(root);
        }
        var el = document.createElement('div');
        el.className = 'toast toast--info import-progress';
        el.setAttribute('role', 'status');
        var body = document.createElement('div');
        body.className = 'toast-body';
        var text = document.createElement('div');
        text.textContent = 'Reading files…';
        body.appendChild(text);
        var bar = document.createElement('span');
        bar.className = 'import-progress-bar';
        var fill = document.createElement('span');
        bar.appendChild(fill);
        body.appendChild(bar);
        var cancel = document.createElement('button');
        cancel.className = 'toast-action';
        cancel.textContent = 'Cancel';
        body.appendChild(cancel);
        el.appendChild(body);
        root.appendChild(el);

        var stop = { cancelled: false };
        cancel.addEventListener('click', function () {
            stop.cancelled = true;
            text.textContent = 'Cancelling…';
            cancel.disabled = true;
        });

        return {
            stop: stop,
            update: function (done, total) {
                text.textContent = 'Reading files… ' + done + '/' + total;
                fill.style.width = total ? Math.round(done / total * 100) + '%' : '0';
            },
            close: function () {
                el.classList.add('is-leaving');
                setTimeout(function () { el.remove(); }, 200);
            }
        };
    }

    // ---------- drop handling -------------------------------------------------

    // A .zip anywhere in the drop goes to the ZIP importer instead.
    function isZipFile(f) { return /\.zip$/i.test(f && f.name || ''); }

    // Route a window drop: ZIP -> importer.importZip, else the folder walker.
    async function handleDrop(e) {
        var dt = e.dataTransfer;
        var files = dt && dt.files ? Array.prototype.slice.call(dt.files) : [];
        var zip = files.filter(isZipFile)[0];
        var progress = progressToast();
        try {
            var result;
            if (zip && Owlet.importer && Owlet.importer.importZip) {
                result = await Owlet.importer.importZip(zip, function (stage, done, total) {
                    progress.update(done, total);
                }, progress.stop);
            } else if (zip) {
                result = null;
                Owlet.ui && Owlet.ui.status('ZIP import needs the zip module — see Import ZIP in the palette.');
            } else {
                result = await Owlet.importer.importFromDataTransfer(dt, function (stage, done, total) {
                    if (stage === 'read') progress.update(done, total);
                }, progress.stop);
            }
            progress.close();
            if (!result) return;
            if (result.cancelled) {
                OwletUI.toast && OwletUI.toast('Import cancelled', 'info', { duration: 2500 });
                return;
            }
            await Owlet.importer.commit(result);
        } catch (err) {
            progress.close();
            console.error('[Owlet] import failed:', err);
            OwletUI.toast && OwletUI.toast('Import failed: ' + (err && err.message || err), 'error', { duration: 5000 });
        }
    }

    // ---------- window wiring -------------------------------------------------

    function init() {
        // Never let a missed drop navigate the browser to the file.
        window.addEventListener('dragover', function (e) { e.preventDefault(); });
        window.addEventListener('drop', function (e) {
            e.preventDefault();
            if (isFileDrag(e)) {
                hideOverlay();
                handleDrop(e);
            }
        });

        // Track enters/leaves at the window edge so child elements don't flicker.
        window.addEventListener('dragenter', function (e) {
            if (!isFileDrag(e)) return;
            dragDepth++;
            showOverlay();
        });
        window.addEventListener('dragleave', function (e) {
            if (!isFileDrag(e)) return;
            if (--dragDepth <= 0) hideOverlay();
        });
        window.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay && overlay.classList.contains('is-on')) {
                hideOverlay();
            }
        });

        // Hidden pickers — folder uses webkitdirectory, files use multiple.
        pickFolderInput = makePicker(true);
        pickFilesInput = makePicker(false);
    }

    // Create a hidden file input; `folder` toggles webkitdirectory.
    function makePicker(folder) {
        var input = document.createElement('input');
        input.type = 'file';
        input.style.display = 'none';
        input.setAttribute('aria-hidden', 'true');
        input.tabIndex = -1;
        if (folder) {
            input.setAttribute('webkitdirectory', '');
            input.setAttribute('directory', '');
        } else {
            input.multiple = true;
        }
        document.body.appendChild(input);
        input.addEventListener('change', function () {
            var files = Array.prototype.slice.call(input.files || []);
            input.value = ''; // allow picking the same folder twice
            if (files.length) pickFromList(files);
        });
        return input;
    }

    // Import a FileList — .zip goes to the ZIP importer, the rest to FileList.
    async function pickFromList(files) {
        var list = Array.prototype.slice.call(files || []);
        var zip = list.filter(isZipFile)[0];
        var progress = progressToast();
        try {
            var result;
            if (zip && Owlet.importer.importZip) {
                result = await Owlet.importer.importZip(zip, function (stage, done, total) {
                    progress.update(done, total);
                }, progress.stop);
            } else {
                result = await Owlet.importer.importFromFileList(list, function (stage, done, total) {
                    if (stage === 'read') progress.update(done, total);
                }, progress.stop);
            }
            progress.close();
            if (result && !result.cancelled) await Owlet.importer.commit(result);
            else if (result && result.cancelled) {
                OwletUI.toast && OwletUI.toast('Import cancelled', 'info', { duration: 2500 });
            }
        } catch (err) {
            progress.close();
            console.error('[Owlet] import failed:', err);
            OwletUI.toast && OwletUI.toast('Import failed: ' + (err && err.message || err), 'error', { duration: 5000 });
        }
    }

    // Open the folder picker (input fallback — works everywhere).
    function pickFolder() { pickFolderInput && pickFolderInput.click(); }

    // Open the loose-file picker (accepts a .zip too).
    function pickFiles() { pickFilesInput && pickFilesInput.click(); }

    return {
        init: init,
        pickFolder: pickFolder,
        pickFiles: pickFiles
    };
})();

document.addEventListener('DOMContentLoaded', OwletUI.dropzone.init);

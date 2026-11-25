// editor.js — CodeMirror FACTORY plus shared documents for the split editor.
// Old shape: ONE CodeMirror instance editing the active file.
// New shape: js/editorgroups.js owns N groups, each with its own CodeMirror
// created here by createEditor(). Documents live once per file path in the
// docs map; a second pane showing the same file gets doc.linkedDoc({sharedHist})
// so typing and Ctrl+Z stay in sync across panes.
//
// Backwards compatibility: Owlet.editor.instance() / getValue() / openFileAt()
// still work — they just talk to the ACTIVE group's editor.

window.Owlet = window.Owlet || {};

Owlet.editor = (function () {
    // One "master" CodeMirror.Doc per open file. Editors that show a file
    // already shown elsewhere hold a linkedDoc instead (shared text + history).
    var docs = {};
    // Editor settings applied to every editor now and to future ones.
    var currentSettings = {};

    // Extension -> CodeMirror mode name (python mode is loaded lazily in Phase 3).
    var MODE_BY_EXT = {
        html: 'htmlmixed', htm: 'htmlmixed', xml: 'xml',
        css: 'css', scss: 'css', less: 'css',
        js: 'javascript', mjs: 'javascript', json: 'javascript',
        py: 'python',
        md: 'text/plain', txt: 'text/plain'
    };

    // Extension -> hint behaviour while typing.
    var TRIGGER_CHARS = /[\w.<:\-/]/;

    // Keys for the completion popup. show-hint's customKeys replaces its whole default
    // map, so every key is listed. Enter accepts only after the user moved the selection
    // with the arrow / Home / End / Page keys; otherwise it closes the popup and inserts
    // a normal newline. Tab always accepts the selected item. Esc closes.
    function hintKeys() {
        var moved = function (h) { h.owletMoved = true; };
        return {
            Up: function (cm, h) { moved(h); h.moveFocus(-1); },
            Down: function (cm, h) { moved(h); h.moveFocus(1); },
            PageUp: function (cm, h) { moved(h); h.moveFocus(-h.menuSize() + 1, true); },
            PageDown: function (cm, h) { moved(h); h.moveFocus(h.menuSize() - 1, true); },
            Home: function (cm, h) { moved(h); h.setFocus(0); },
            End: function (cm, h) { moved(h); h.setFocus(h.length - 1); },
            Enter: function (cm, h) {
                if (h.owletMoved) { h.pick(); return; }
                h.close();
                cm.execCommand('newlineAndIndent');
            },
            Tab: function (cm, h) { h.pick(); },
            Esc: function (cm, h) { h.close(); }
        };
    }

    // Should typing this character open the popup here? In HTML text (plain content)
    // it stays closed; inside a tag, attribute or attribute value, or after '<', it opens.
    // JS, CSS and other modes keep the word trigger.
    function shouldOpenHint(cm, typed) {
        if (!TRIGGER_CHARS.test(typed)) return false;
        var pos = cm.getCursor();
        var mode = cm.getModeAt(pos).name;
        if (mode !== 'htmlmixed' && mode !== 'xml') return true;
        if (typed === '<') return true;
        var type = cm.getTokenTypeAt(pos);
        return type === 'tag' || type === 'attribute' || type === 'string';
    }

    // Called once at boot (before editorgroups creates the first editor).
    function init() {
        // Keep the docs map aligned with the file set: drop docs of deleted
        // files and re-key docs on rename (detected via tabs:changed diff).
        Owlet.state.on('files:changed', function () { cleanupDocs(); });
        Owlet.state.on('file:renamed', function (d) {
            if (d && docs[d.from]) { docs[d.to] = docs[d.from]; delete docs[d.from]; }
        });
        Owlet.state.on('project:loaded', function () { docs = {}; });
    }

    // Remove cached docs whose file no longer exists; re-key on rename by
    // comparing open tab paths — cheapest reliable way without an event detail.
    function cleanupDocs() {
        Object.keys(docs).forEach(function (path) {
            if (Owlet.state.files[path] === undefined) delete docs[path];
        });
    }

    // mode string for a file path, with a plain-text fallback.
    function modeFor(path) {
        var name = path.split('/').pop();
        var dot = name.lastIndexOf('.');
        // No extension (e.g. the 'untitled' scratch buffer): a web editor
        // defaults to HTML so highlighting, hints and lint still work.
        if (dot === -1) return 'htmlmixed';
        return MODE_BY_EXT[name.slice(dot + 1).toLowerCase()] || 'text/plain';
    }

    // The shared doc for a path (created from file content on first use).
    function docFor(path) {
        if (!docs[path]) docs[path] = CodeMirror.Doc(Owlet.state.getFile(path), modeFor(path));
        return docs[path];
    }

    // A linked doc for a second (or third…) pane showing the same file.
    function linkedDocFor(path) {
        return docFor(path).linkedDoc({ sharedHist: true });
    }

    // Detach a linked doc when an editor stops showing it (prevents leaks).
    function releaseDoc(doc, path) {
        if (!doc || !docs[path] || doc === docs[path]) return;
        try { doc.unlinkDoc(docs[path]); } catch (e) { /* already detached */ }
    }

    // Drop a file's master doc when it is closed in every group.
    function dropDoc(path) {
        if (Owlet.state.groupWithFile(path)) return;
        delete docs[path];
    }

    // Create a CodeMirror inside hostEl with the full Owlet wiring.
    // editorgroups calls this once per group; every editor gets identical
    // behaviour (write-back, autosave, preview, auto-suggest).
    function createEditor(hostEl) {
        var cm = CodeMirror(hostEl, {
            theme: 'owlet',
            lineNumbers: true,
            autoCloseTags: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 4,
            tabSize: 4,
            lineWrapping: true,
            scrollbarStyle: 'native',
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-lint-markers'],
            extraKeys: { 'Ctrl-Space': 'autocomplete' },
            hintOptions: { completeSingle: false, customKeys: hintKeys() },
            lint: false // lint is wired on by lint.js
        });
        cm.owletPath = null;   // path this editor currently shows (set by groups)

        // Any keystroke -> write back to state (autosave + preview re-render).
        // Linked docs fire 'change' in BOTH panes; the guard skips the
        // second write because the content is already identical.
        cm.on('change', function (instance, change) {
            var path = instance.owletPath;
            if (!path || change.origin === 'setValue') return;
            var text = instance.getValue();
            if (text === Owlet.state.getFile(path)) return;
            Owlet.state.setFile(path, text);
            Owlet.storage.autosave();
            Owlet.preview && Owlet.preview.scheduleUpdate();
        });

        // Show the completion popup as you type — the VS Code feel.
        cm.on('inputRead', function (instance, change) {
            if (!change.origin || change.origin === '+delete'
                || change.origin === 'setValue' || change.origin === 'complete') return;
            var typed = change.text && change.text[0];
            if (typed && shouldOpenHint(instance, typed)) {
                instance.showHint({ completeSingle: false });
            }
        });

        applySettingsTo(cm, hostEl, currentSettings);
        return cm;
    }

    // Point an editor at a file: swap to its (possibly linked) doc + set mode.
    function showFile(cm, path, firstViewer) {
        var oldPath = cm.owletPath;
        var oldDoc = cm.getDoc();
        var doc = firstViewer ? docFor(path) : linkedDocFor(path);
        cm.setOption('mode', modeFor(path));
        cm.swapDoc(doc);
        if (oldPath && oldDoc) releaseDoc(oldDoc, oldPath);
        cm.owletPath = path;
    }

    // Clear an editor (group with no tabs shows an empty buffer).
    function showEmpty(cm) {
        var oldPath = cm.owletPath;
        var oldDoc = cm.getDoc();
        cm.swapDoc(CodeMirror.Doc('', 'text/plain'));
        if (oldPath && oldDoc) releaseDoc(oldDoc, oldPath);
        cm.owletPath = null;
    }

    // Destroy an editor created by createEditor (group removal cleanup).
    function destroyEditor(cm) {
        if (!cm) return;
        var oldPath = cm.owletPath;
        if (oldPath) releaseDoc(cm.getDoc(), oldPath);
        cm.owletPath = null;
        var wrapper = cm.getWrapperElement();
        if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    }

    // ---- facade used by the rest of the app (targets the ACTIVE group) ------

    // The active group's CodeMirror, or null before groups exist.
    function instance() {
        return Owlet.groups && Owlet.groups.activeEditor
            ? Owlet.groups.activeEditor()
            : null;
    }

    // Current editor text (used by run/preview flows).
    function getValue() {
        var cm = instance();
        return cm ? cm.getValue() : '';
    }

    // Open a file and put the cursor on a line/column (both 1-based).
    // If the file is already open in some group, focus THAT group instead
    // of duplicating the tab in the active group.
    function openFileAt(path, line, col) {
        if (Owlet.state.files[path] === undefined) return false;
        var existing = Owlet.state.groupWithFile(path);
        if (existing) Owlet.state.focusFile(path, existing);
        else Owlet.state.openFile(path);
        var cm = instance();
        if (cm && line) {
            var pos = { line: Math.max(0, line - 1), ch: Math.max(0, (col || 1) - 1) };
            cm.setCursor(pos);
            cm.scrollIntoView(pos, 80);
        }
        if (cm) cm.focus();
        return true;
    }

    // Apply a setting object to one editor + its host element.
    function applySettingsTo(cm, hostEl, s) {
        if (!cm || !s) return;
        if (s.fontSize) hostEl.style.fontSize = s.fontSize + 'px';
        if (s.tabSize) { cm.setOption('tabSize', +s.tabSize); cm.setOption('indentUnit', +s.tabSize); }
        if (s.lineNumbers !== undefined) cm.setOption('lineNumbers', !!s.lineNumbers);
        if (s.wordWrap !== undefined) cm.setOption('lineWrapping', !!s.wordWrap);
        cm.refresh();
    }

    // Apply simple editor settings to every editor in every group.
    function applySettings(s) {
        currentSettings = s || {};
        if (Owlet.groups && Owlet.groups.forEachEditor) {
            Owlet.groups.forEachEditor(function (cm, hostEl) {
                applySettingsTo(cm, hostEl, currentSettings);
            });
        }
    }

    return {
        init: init,
        createEditor: createEditor,
        destroyEditor: destroyEditor,
        showFile: showFile,
        showEmpty: showEmpty,
        docFor: docFor,
        dropDoc: dropDoc,
        getValue: getValue,
        instance: instance,
        openFileAt: openFileAt,
        applySettings: applySettings,
        modeFor: modeFor
    };
})();

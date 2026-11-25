// contract.js — the ONLY bridge between the UI layer and the logic layer.
//
// UI  -> logic : OwletUI.emit('ui:<name>', detail) dispatches a CustomEvent on
//                window. The listeners at the bottom of this file call the real
//                Owlet.* logic when it exists, or stay a documented stub.
// Logic -> UI  : call the functions on window.OwletUI (setTree, toast, ...).
//                They only store data and announce 'owletui:changed', so the
//                panels re-render without knowing who sent the data.
// Reference: CONTRACT.md in the project root.

window.Owlet = window.Owlet || {};
window.OwletUI = window.OwletUI || {};

// Everything the panels render, kept in one place (the UI-side snapshot).
OwletUI.snapshot = {
    tree: {},          // path -> git status letter ('M' | 'A' | 'U' | 'D')
    git: [],           // [{ path, status, staged }]
    problems: [],      // [{ path, line, col, severity, message, source }]
    status: {},        // { branch, ahead, behind, sandbox, ai, layout }
    terminal: { state: 'local', label: 'Local' },
    collaborators: [], // [{ name, initials, color }]
    previewError: null,
    ai: { streaming: '' }
};

// Dispatch a UI event (UI -> logic). Listeners are registered below.
// detail: plain object; see CONTRACT.md for each event's fields.
OwletUI.emit = function (name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
};

// Tell every panel that a part of the snapshot changed (UI-internal event).
// topic: 'tree' | 'git' | 'problems' | 'status' | 'terminal' | 'collab' | 'preview' | 'ai'
OwletUI.notify = function (topic) {
    window.dispatchEvent(new CustomEvent('owletui:changed', { detail: { topic: topic } }));
};

// ---- Logic -> UI functions --------------------------------------------------

// Git decorations for the file tree. The tree's structure still comes from
// Owlet.state; this only colours and letters the rows.
// entries: [{ path: 'style.css', git: 'M' }]
OwletUI.setTree = function (entries) {
    var map = {};
    (entries || []).forEach(function (e) { if (e && e.path) map[e.path] = e.git || ''; });
    OwletUI.snapshot.tree = map;
    OwletUI.notify('tree');
};

// Source-control changes. // TODO: connect backend (git status)
// list: [{ path, status: 'M'|'A'|'U'|'D', staged: boolean }]
OwletUI.setGitChanges = function (list) {
    OwletUI.snapshot.git = list || [];
    OwletUI.notify('git');
};

// Problems (lint / compiler diagnostics) for the Problems panel and counters.
// list: [{ path, line, col, severity: 'error'|'warn'|'info', message, source }]
OwletUI.setProblems = function (list) {
    OwletUI.snapshot.problems = list || [];
    OwletUI.notify('problems');
};

// Append one console line through the existing console module.
// type: 'log' | 'info' | 'warn' | 'error'
OwletUI.addConsoleLine = function (type, text) {
    var kind = type === 'log' ? 'info' : type;
    if (Owlet.console && Owlet.console.log) Owlet.console.log(kind, text);
};

// Partial update of status-bar items. Only the keys you pass are changed.
// partial: { branch, ahead, behind, sandbox, ai, collaborators? }
OwletUI.setStatus = function (partial) {
    Object.keys(partial || {}).forEach(function (k) { OwletUI.snapshot.status[k] = partial[k]; });
    OwletUI.notify('status');
};

// Terminal connection pill. state: 'local' | 'connecting' | 'connected' | 'disconnected'
OwletUI.setTerminalState = function (state, label) {
    OwletUI.snapshot.terminal = { state: state, label: label || state };
    OwletUI.notify('terminal');
};

// Show (err = { message, file, line }) or clear (err = null) the preview error banner.
OwletUI.setPreviewError = function (err) {
    OwletUI.snapshot.previewError = err || null;
    OwletUI.notify('preview');
};

// Collaborator avatars in the top bar. // TODO: connect backend (collaboration)
// list: [{ name, initials, color }]
OwletUI.setCollaborators = function (list) {
    OwletUI.snapshot.collaborators = list || [];
    OwletUI.notify('collab');
};

// Streamed AI text. // TODO: connect backend (AI provider streaming)
// Tokens accumulate in the snapshot; the AI panel renders them.
OwletUI.streamAiToken = function (text, done) {
    if (done) { OwletUI.snapshot.ai.streaming = ''; }
    else { OwletUI.snapshot.ai.streaming += String(text || ''); }
    OwletUI.notify('ai');
};

// Read-only copy of the snapshot (handy in the console while developing).
OwletUI.getSnapshot = function () {
    return JSON.parse(JSON.stringify(OwletUI.snapshot));
};

// ---- UI -> logic bridge -----------------------------------------------------

// Open a file in a tab; optional line jumps the cursor there.
// detail: { path, line?, col? }
window.addEventListener('ui:file-open', function (e) {
    var d = e.detail || {};
    if (!d.path || Owlet.state.files[d.path] === undefined) return;
    Owlet.editor.openFileAt(d.path, d.line, d.col);
});

// Reload the preview iframe. detail: {}
window.addEventListener('ui:preview-refresh', function () {
    if (Owlet.preview) Owlet.preview.update();
});

// Run the active file (same path as the Run button). detail: {}
window.addEventListener('ui:run', function () {
    var btn = document.getElementById('btn-run');
    if (btn) btn.click();
});

// Settings changed in the UI. Logic-owned editor keys are persisted and applied here.
// detail: { key: 'fontSize'|'tabSize'|'lineNumbers'|'wordWrap', value }
window.addEventListener('ui:setting-change', function (e) {
    var d = e.detail || {};
    var keys = ['fontSize', 'tabSize', 'lineNumbers', 'wordWrap'];
    if (keys.indexOf(d.key) === -1) return;
    var raw = {};
    try { raw = JSON.parse(localStorage.getItem('owlet:settings') || '{}'); } catch (err) { raw = {}; }
    raw[d.key] = d.value;
    localStorage.setItem('owlet:settings', JSON.stringify(raw));
    if (Owlet.editor) Owlet.editor.applySettings(raw);
});

// ---- editor group commands removed with the split feature ----

// Stub events: the UI shows the feature, the backend is not connected yet.
// Each one logs a TODO so developers see exactly where to hook in.
['ui:file-create', 'ui:file-rename', 'ui:file-delete', 'ui:folder-create',
 'ui:terminal-input', 'ui:terminal-profile', 'ui:terminal-kill',
 'ui:git-stage', 'ui:git-unstage', 'ui:git-discard', 'ui:git-commit',
 'ui:git-checkout', 'ui:git-sync', 'ui:ai-send', 'ui:ai-stop',
 'ui:collab-share', 'ui:sandbox-connect'].forEach(function (name) {
    window.addEventListener(name, function (e) {
        // TODO: connect backend for this event (see CONTRACT.md)
        Owlet.log('[OwletUI] stub event', name, e.detail || {});
    });
});

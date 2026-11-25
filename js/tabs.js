// tabs.js — tab helpers shared by the editor groups.
// The per-group tab bars are built by editorgroups.js; this module only keeps
// the close-with-dirty-confirm behaviour used by every group's tabs.

window.Owlet = window.Owlet || {};

Owlet.tabs = (function () {
    // Called once at boot — nothing to initialise (groups render the tabs).
    function init() {}

    // A short display name for a path: "css/style.css" -> "style.css".
    function baseName(path) {
        return path.split('/').pop();
    }

    // Close a tab, asking first when it has unsaved edits.
    // groupId: which group's tab to close (active group when omitted).
    function closeTab(path, groupId) {
        var s = Owlet.state;
        var g = (groupId && s.groupById(groupId)) || s.activeGroup();
        if (!g || g.tabs.indexOf(path) === -1) return;
        if (Owlet.groups.isPinned && Owlet.groups.isPinned(path)) return;
        if (s.isDirty(path)) {
            OwletUI.dialogs.confirm({
                title: 'Unsaved changes',
                message: '"' + path + '" has unsaved changes. Close anyway?',
                okLabel: 'Close anyway',
                danger: true
            }).then(function (ok) { if (ok) finishClose(path, g); });
            return;
        }
        finishClose(path, g);
    }

    function finishClose(path, g) {
        var s = Owlet.state;
        s.closeFile(path, g.id);
        // Free the shared doc when the file is closed in every group.
        if (!s.groupWithFile(path)) Owlet.editor.dropDoc(path);
        // An emptied extra group collapses (the last group always stays).
        if (g.tabs.length === 0 && s.getGroups().length > 1) s.removeGroup(g.id);
    }

    // Close the active tab of the active group (Ctrl+W).
    function closeActive() {
        var path = Owlet.state.activeFile;
        if (path) closeTab(path, Owlet.state.activeGroup().id);
    }

    return { init: init, baseName: baseName, closeTab: closeTab, closeActive: closeActive };
})();

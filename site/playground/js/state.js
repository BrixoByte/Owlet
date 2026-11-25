// state.js — single source of truth for Owlet.
// Holds the current project's files, the EDITOR GROUPS (split panes — each with
// its own tabs and active tab), and a tiny publish/subscribe bus so modules can
// react to changes without knowing each other.
//
// Compatibility: Owlet.state.openTabs / Owlet.state.activeFile expose the
// ACTIVE GROUP's tabs and active file, so modules that assume a single editor
// keep working — with one group the app behaves exactly as before.

window.Owlet = window.Owlet || {};

Owlet.state = (function () {
    // file contents keyed by path, e.g. { "index.html": "...", "css/style.css": "..." }
    var files = {};
    // a snapshot of the files as last saved — comparing the two tells us what is dirty
    var savedFiles = {};
    var projectName = 'untitled';
    var storageMode = 'browser';  // 'browser' | 'fs' (File System Access)
    var fsRoot = null;            // FileSystemDirectoryHandle when storageMode is 'fs'

    // --- editor groups -----------------------------------------------------
    // Ordered array of groups; each owns its tabs, active tab and flex size.
    var nextGroupId = 1;
    var groups = [freshGroup()];
    var activeGroupId = groups[0].id;
    // 'horizontal' = groups side by side, 'vertical' = stacked on top of each other
    var layoutDirection = 'horizontal';

    // Create a blank group object (first group and later splits).
    function freshGroup() {
        return { id: 'g' + nextGroupId++, tabs: [], activeTab: null, size: 1 };
    }

    // Find a group object by id.
    function groupById(id) {
        for (var i = 0; i < groups.length; i++) {
            if (groups[i].id === id) return groups[i];
        }
        return null;
    }

    // The group that currently has focus.
    function activeGroup() {
        return groupById(activeGroupId) || groups[0];
    }

    var listeners = {};

    // Subscribe to an event name; fn receives whatever emit() passes.
    function on(event, fn) {
        (listeners[event] = listeners[event] || []).push(fn);
    }

    // Notify every subscriber of an event.
    function emit(event, a, b) {
        (listeners[event] || []).forEach(function (fn) {
            try { fn(a, b); } catch (e) { console.error('Owlet listener error:', e); }
        });
    }

    // Emit both events used when tab membership or structure changes.
    function tabsChanged() {
        emit('tabs:changed');
        emit('groups:changed');
    }

    // Return the text of a file (empty string when missing).
    function getFile(path) { return files[path] || ''; }

    // Write file text into memory and tell listeners (editor, preview, autosave).
    function setFile(path, content) {
        files[path] = content;
        emit('content:changed', path);
        emit('dirty:changed');
    }

    // Is a file different from its last saved copy?
    function isDirty(path) {
        return savedFiles[path] !== files[path];
    }

    // Any file with unsaved changes?
    function hasUnsaved() {
        return Object.keys(files).some(function (p) { return isDirty(p); });
    }

    // Mark every file as saved (clears dirty dots).
    function markAllSaved() {
        savedFiles = {};
        Object.keys(files).forEach(function (p) { savedFiles[p] = files[p]; });
        emit('dirty:changed');
    }

    // Mark a single file as saved — the importer uses this so merged files
    // arrive "saved" without clearing other dirty flags.
    function markSaved(path) {
        savedFiles[path] = files[path];
        emit('dirty:changed');
    }

    // Replace the whole project at once (load/import/new) — back to one empty group.
    function loadFiles(newFiles, name) {
        files = newFiles;
        savedFiles = {};
        Object.keys(files).forEach(function (p) { savedFiles[p] = files[p]; });
        groups = [freshGroup()];
        activeGroupId = groups[0].id;
        layoutDirection = 'horizontal';
        projectName = name || 'untitled';
        emit('project:loaded');
        emit('groups:changed');
        emit('dirty:changed');
    }

    // Add a new empty file (fails quietly if the path already exists).
    function createFile(path, content) {
        if (files[path] !== undefined) return false;
        files[path] = content === undefined ? '' : content;
        savedFiles[path] = '';
        emit('files:changed', path);
        emit('dirty:changed');
        return true;
    }

    // Rename/move a file and update tabs in EVERY group.
    function renameFile(oldPath, newPath) {
        if (files[oldPath] === undefined || files[newPath] !== undefined) return false;
        files[newPath] = files[oldPath];
        savedFiles[newPath] = savedFiles[oldPath];
        delete files[oldPath];
        delete savedFiles[oldPath];
        groups.forEach(function (g) {
            g.tabs = g.tabs.map(function (p) { return p === oldPath ? newPath : p; });
            if (g.activeTab === oldPath) g.activeTab = newPath;
        });
        emit('file:renamed', { from: oldPath, to: newPath });
        emit('files:changed');
        tabsChanged();
        emit('active:changed', activeGroup().activeTab);
        emit('dirty:changed');
        return true;
    }

    // Delete a file — closes its tab in EVERY group that shows it.
    function deleteFile(path) {
        if (files[path] === undefined) return false;
        delete files[path];
        delete savedFiles[path];
        closeInAllGroups(path);
        emit('files:changed');
        tabsChanged();
        emit('active:changed', activeGroup().activeTab);
        emit('dirty:changed');
        return true;
    }

    // Remove a path from every group's tab list, fixing each group's active tab.
    function closeInAllGroups(path) {
        groups.forEach(function (g) {
            var i = g.tabs.indexOf(path);
            if (i === -1) return;
            g.tabs.splice(i, 1);
            if (g.activeTab === path) g.activeTab = g.tabs[i] || g.tabs[i - 1] || null;
        });
    }

    // All file paths, folders first feel comes from sorting in the tree.
    function listFiles() {
        return Object.keys(files).sort();
    }

    // --- tab helpers (act on the active group by default) --------------------

    // Open a file as a tab in the given group (active group when groupId is null)
    // and make it that group's active tab.
    function openFile(path, groupId) {
        if (files[path] === undefined) return;
        var g = (groupId && groupById(groupId)) || activeGroup();
        if (!g) return;
        if (g.tabs.indexOf(path) === -1) g.tabs.push(path);
        g.activeTab = path;
        tabsChanged();
        emit('active:changed', g.activeTab);
    }

    // Close a tab. With a groupId it closes only in that group (per-pane close);
    // without one it closes everywhere (delete-file semantics).
    function closeFile(path, groupId) {
        if (groupId) {
            var g = groupById(groupId);
            if (!g) return;
            var i = g.tabs.indexOf(path);
            if (i === -1) return;
            g.tabs.splice(i, 1);
            if (g.activeTab === path) g.activeTab = g.tabs[i] || g.tabs[i - 1] || null;
            tabsChanged();
            if (g.id === activeGroupId) emit('active:changed', g.activeTab);
            return;
        }
        closeInAllGroups(path);
        tabsChanged();
        emit('active:changed', activeGroup().activeTab);
    }

    // --- group helpers -------------------------------------------------------

    // The configured group cap, clamped to a sane 1-4 range (default 4).
    function maxGroups() {
        var raw = Owlet.settings && Owlet.settings.get && Owlet.settings.get('maxGroups');
        var n = +raw;
        if (!isFinite(n) || n < 1) n = 4;
        return Math.min(4, Math.round(n));
    }

    // Create a group (optionally duplicating a file into it). Returns the new
    // group, or null when the maxGroups cap is reached.
    function addGroup(withPath) {
        var max = maxGroups();
        if (groups.length >= max) return null;
        var g = freshGroup();
        if (withPath && files[withPath] !== undefined) {
            g.tabs.push(withPath);
            g.activeTab = withPath;
        }
        groups.push(g);
        emit('groups:changed');
        return g;
    }

    // Remove a group by id. The last remaining group is never removed.
    function removeGroup(id) {
        if (groups.length <= 1) return false;
        var i = -1;
        for (var k = 0; k < groups.length; k++) if (groups[k].id === id) { i = k; break; }
        if (i === -1) return false;
        groups.splice(i, 1);
        if (activeGroupId === id) activeGroupId = groups[Math.max(0, i - 1)].id;
        emit('groups:changed');
        emit('active:changed', activeGroup().activeTab);
        return true;
    }

    // Mark a group as the focused one (clicks inside it land here).
    function setActiveGroup(id) {
        if (!groupById(id) || activeGroupId === id) return;
        activeGroupId = id;
        emit('groups:changed');
        emit('active:changed', activeGroup().activeTab);
    }

    // Focus a specific tab inside a specific group (used by "go to source").
    function focusFile(path, groupId) {
        var g = groupById(groupId);
        if (!g || g.tabs.indexOf(path) === -1) return;
        g.activeTab = path;
        activeGroupId = groupId;
        emit('groups:changed');
        emit('tabs:changed');
        emit('active:changed', path);
    }

    // Move a tab between groups (drag & drop, context menu).
    // index = position inside the target tab list (end when undefined).
    function moveTabToGroup(path, fromId, toId, index) {
        var from = groupById(fromId);
        var to = groupById(toId);
        if (!from || !to || from === to) return;
        var i = from.tabs.indexOf(path);
        if (i === -1) return;
        from.tabs.splice(i, 1);
        if (from.activeTab === path) from.activeTab = from.tabs[i] || from.tabs[i - 1] || null;
        if (to.tabs.indexOf(path) === -1) {
            to.tabs.splice(index === undefined ? to.tabs.length : index, 0, path);
        }
        to.activeTab = path;
        activeGroupId = toId;
        emit('tabs:changed');
        emit('groups:changed');
        emit('active:changed', path);
        // An emptied group disappears (except the last one).
        if (from.tabs.length === 0 && groups.length > 1) removeGroup(fromId);
    }

    // Reorder a tab inside its own group (drop before `index`, or append).
    function reorderTab(path, groupId, index) {
        var g = groupById(groupId);
        if (!g) return;
        var i = g.tabs.indexOf(path);
        if (i === -1) return;
        g.tabs.splice(i, 1);
        var at = (index === undefined || index > g.tabs.length) ? g.tabs.length : index;
        g.tabs.splice(at, 0, path);
        emit('tabs:changed');
        emit('groups:changed');
    }

    // First group id that has this file open, or null.
    function groupWithFile(path) {
        for (var i = 0; i < groups.length; i++) {
            if (groups[i].tabs.indexOf(path) !== -1) return groups[i].id;
        }
        return null;
    }

    // True when at least one group has a tab open (drives the welcome screen).
    function anyTabsOpen() {
        return groups.some(function (g) { return g.tabs.length > 0; });
    }

    // Merge every group's tabs into the first group, then drop the rest.
    function joinAllGroups() {
        if (groups.length <= 1) return;
        var first = groups[0];
        for (var i = 1; i < groups.length; i++) {
            groups[i].tabs.forEach(function (p) {
                if (first.tabs.indexOf(p) === -1) first.tabs.push(p);
            });
            if (!first.activeTab && groups[i].activeTab) first.activeTab = groups[i].activeTab;
        }
        groups = [first];
        activeGroupId = first.id;
        emit('groups:changed');
        emit('tabs:changed');
        emit('active:changed', first.activeTab);
    }

    // Toggle the split direction (row <-> column).
    function toggleDirection() {
        layoutDirection = layoutDirection === 'horizontal' ? 'vertical' : 'horizontal';
        emit('groups:changed');
    }

    // Update a group's flex size (drag-resize).
    function setGroupSize(id, size) {
        var g = groupById(id);
        if (!g) return;
        g.size = size;
    }

    // Snapshot for persistence (validated + restored by editorgroups.js).
    function layoutSnapshot() {
        return {
            version: 1,
            direction: layoutDirection,
            activeGroupId: activeGroupId,
            groups: groups.map(function (g) {
                return { id: g.id, tabs: g.tabs.slice(), activeTab: g.activeTab, size: g.size };
            })
        };
    }

    // Restore a saved layout. Missing files are dropped silently; anything
    // unusable falls back to a single empty group (returns false).
    function restoreLayout(data) {
        if (!data || !Array.isArray(data.groups) || !data.groups.length) return false;
        var clean = [];
        data.groups.slice(0, 4).forEach(function (g) {
            if (!g || !Array.isArray(g.tabs)) return;
            var grp = freshGroup();
            grp.tabs = g.tabs.filter(function (p) { return files[p] !== undefined; });
            grp.activeTab = grp.tabs.indexOf(g.activeTab) !== -1 ? g.activeTab : (grp.tabs[0] || null);
            grp.size = (typeof g.size === 'number' && g.size > 0) ? g.size : 1;
            clean.push(grp);
        });
        // Drop empty groups left by missing files or stale saves — they would
        // only waste the group cap. Always keep at least one group.
        clean = clean.filter(function (g, i) { return i === 0 || g.tabs.length; });
        if (!clean.length) return false;
        // Splits are removed — fold tabs from any saved extra groups
        // into the first so old layouts can't resurrect them.
        if (clean.length > 1) {
            var first = clean[0];
            clean.slice(1).forEach(function (g) {
                g.tabs.forEach(function (p) {
                    if (first.tabs.indexOf(p) === -1) first.tabs.push(p);
                });
                if (!first.activeTab && g.activeTab) first.activeTab = g.activeTab;
            });
            clean = [first];
        }
        groups = clean;
        var wanted = clean.filter(function (g) { return g.id === data.activeGroupId; })[0];
        activeGroupId = wanted ? wanted.id : clean[0].id;
        if (data.direction === 'vertical' || data.direction === 'horizontal') {
            layoutDirection = data.direction;
        }
        emit('groups:changed');
        emit('tabs:changed');
        emit('active:changed', activeGroup().activeTab);
        return true;
    }

    return {
        on: on,
        emit: emit,
        getFile: getFile,
        setFile: setFile,
        isDirty: isDirty,
        hasUnsaved: hasUnsaved,
        markAllSaved: markAllSaved,
        markSaved: markSaved,
        loadFiles: loadFiles,
        createFile: createFile,
        renameFile: renameFile,
        deleteFile: deleteFile,
        listFiles: listFiles,
        openFile: openFile,
        closeFile: closeFile,
        // groups
        getGroups: function () { return groups; },
        activeGroup: activeGroup,
        groupById: groupById,
        addGroup: addGroup,
        removeGroup: removeGroup,
        setActiveGroup: setActiveGroup,
        focusFile: focusFile,
        moveTabToGroup: moveTabToGroup,
        reorderTab: reorderTab,
        groupWithFile: groupWithFile,
        anyTabsOpen: anyTabsOpen,
        joinAllGroups: joinAllGroups,
        toggleDirection: toggleDirection,
        setGroupSize: setGroupSize,
        maxGroups: maxGroups,
        layoutSnapshot: layoutSnapshot,
        restoreLayout: restoreLayout,
        get files() { return files; },
        // Active group's tabs — the old "one tab bar" view every module knows.
        get openTabs() { return activeGroup().tabs; },
        get activeFile() { return activeGroup().activeTab; },
        set activeFile(p) {
            var g = activeGroup();
            if (g.tabs.indexOf(p) === -1) return;
            g.activeTab = p;
            emit('tabs:changed');
            emit('active:changed', p);
        },
        get layoutDirection() { return layoutDirection; },
        get projectName() { return projectName; },
        set projectName(n) { projectName = n; },
        get storageMode() { return storageMode; },
        set storageMode(m) { storageMode = m; },
        get fsRoot() { return fsRoot; },
        set fsRoot(h) { fsRoot = h; }
    };
})();

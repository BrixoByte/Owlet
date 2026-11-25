// menubar.js — the VS Code-style app menu in the top bar (File, Edit,
// Selection, View, Go, …). Every item calls an EXISTING API or button —
// nothing here invents new behaviour. Menu definitions are functions so
// dynamic labels and "checked" states evaluate fresh on each open.

window.OwletUI = window.OwletUI || {};

OwletUI.menubar = (function () {

    // Click an existing toolbar button by id (single source of truth).
    function click(id) {
        return function () { var b = document.getElementById(id); if (b) b.click(); };
    }

    // The CodeMirror instance of the active editor group.
    function cm() {
        return Owlet.groups && Owlet.groups.activeEditor ? Owlet.groups.activeEditor() : null;
    }

    // Run a CodeMirror command on the active editor (no-op when unfocused).
    function cmd(name) {
        return function () { var e = cm(); if (e) e.execCommand(name); };
    }

    // Clipboard commands are not CodeMirror commands: focus the active editor
    // and run the native clipboard action on its selection.
    function clip(name) {
        return function () { var e = cm(); if (e) { e.focus(); document.execCommand(name); } };
    }

    var MENUS = {
        file: function () {
            return [
                { label: 'New file', icon: 'file-plus', onSelect: click('btn-new-file') },
                { label: 'New folder', icon: 'folder-plus', onSelect: click('btn-new-folder') },
                { separator: true },
                { label: 'Open folder…', icon: 'folder-open', onSelect: function () { Owlet.storage.openLocalFolder(); } },
                { label: 'Clone repository…', icon: 'github', onSelect: function () { Owlet.clone && Owlet.clone.openDialog(); } },
                { label: 'Saved projects…', icon: 'folder', onSelect: function () { Owlet.app.showProjects(); } },
                { label: 'Close project', icon: 'x', onSelect: function () { Owlet.storage.closeProject(); } },
                { separator: true },
                { label: 'Save', icon: 'save', hint: 'Ctrl+S', onSelect: function () { Owlet.storage.saveActive(); } },
                { label: 'Share project…', icon: 'share', onSelect: function () { Owlet.share && Owlet.share.openDialog(); } },
                { label: 'Download project (.zip)', icon: 'download', onSelect: function () { Owlet.storage.exportZip(); } },
                { separator: true },
                { label: 'Run active file', icon: 'play', onSelect: click('btn-run') }
            ];
        },
        edit: function () {
            return [
                { label: 'Undo', icon: 'undo', hint: 'Ctrl+Z', onSelect: cmd('undo') },
                { label: 'Redo', icon: 'redo', hint: 'Ctrl+Y', onSelect: cmd('redo') },
                { separator: true },
                { label: 'Cut', icon: 'scissors', hint: 'Ctrl+X', onSelect: clip('cut') },
                { label: 'Copy', icon: 'copy', hint: 'Ctrl+C', onSelect: clip('copy') },
                { label: 'Paste', icon: 'clipboard', hint: 'Ctrl+V', onSelect: clip('paste') },
                { separator: true },
                { label: 'Find in files', icon: 'search', onSelect: function () { OwletUI.layout.setView('search'); } },
                { label: 'Command palette', icon: 'command', hint: 'Ctrl+P', onSelect: function () { Owlet.app.openPalette(); } }
            ];
        },
        selection: function () {
            return [
                { label: 'Select all', icon: 'copy', hint: 'Ctrl+A', onSelect: cmd('selectAll') },
                { separator: true },
                { label: 'Insert line below', icon: 'arrow-down', hint: 'Ctrl+Enter', onSelect: cmd('insertLineAfter') },
                { label: 'Delete line', icon: 'trash', hint: 'Ctrl+D', danger: true, onSelect: cmd('deleteLine') }
            ];
        },
        view: function () {
            return [
                { label: 'Toggle explorer', icon: 'sidebar', hint: 'Ctrl+B', onSelect: function () { OwletUI.layout.toggle('side'); } },
                { label: 'Toggle bottom panel', icon: 'panel-bottom', hint: 'Ctrl+J', onSelect: function () { OwletUI.layout.toggle('bottom'); } },
                { label: 'Toggle preview', icon: 'eye', onSelect: function () { OwletUI.layout.toggle('right'); } },
                { label: 'Toggle terminal', icon: 'terminal', hint: 'Ctrl+`', onSelect: function () { OwletUI.layout.showDockTab('terminal'); } },
                { separator: true },
                { label: 'Reset layout', icon: 'refresh', onSelect: function () { OwletUI.layout.reset(); } },
                { separator: true },
                { label: 'Keyboard shortcuts…', icon: 'keyboard', onSelect: function () {
                    Owlet.app.toggleDialog('settings-dialog', true);
                    var tab = document.querySelector('[data-settings-tab="shortcuts"]');
                    if (tab) tab.click();
                } }
            ];
        },
        go: function () {
            return [
                { label: 'Go to file…', icon: 'files', hint: 'Ctrl+P', onSelect: function () { Owlet.app.openPalette(); } },
                { separator: true },
                { label: 'Go to Console', icon: 'terminal', onSelect: function () { OwletUI.layout.showDockTab('console'); } },
                { label: 'Go to Terminal', icon: 'terminal', onSelect: function () { OwletUI.layout.showDockTab('terminal'); } },
                { label: 'Go to Problems', icon: 'alert', onSelect: function () { OwletUI.layout.showDockTab('problems'); } }
            ];
        },
        more: function () {
            return [
                { label: 'Settings', icon: 'settings', onSelect: function () { Owlet.app.toggleDialog('settings-dialog', true); } },
                { label: 'Keyboard shortcuts', icon: 'keyboard', onSelect: function () {
                    Owlet.app.toggleDialog('settings-dialog', true);
                    var tab = document.querySelector('[data-settings-tab="shortcuts"]');
                    if (tab) tab.click();
                } },
                { separator: true },
                { label: 'Help', icon: 'help', hint: '?', onSelect: function () { Owlet.app.toggleDialog('help-dialog', true); } },
                { label: 'About Owlet', icon: 'info', onSelect: function () {
                    Owlet.app.toggleDialog('settings-dialog', true);
                    var tab = document.querySelector('[data-settings-tab="about"]');
                    if (tab) tab.click();
                } }
            ];
        }
    };

    // Wire each [data-menu] button to open its dropdown under itself.
    function init() {
        var bar = document.getElementById('menubar');
        if (!bar) return;
        bar.querySelectorAll('[data-menu]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var build = MENUS[btn.getAttribute('data-menu')];
                if (build) OwletUI.menu.open(btn, build());
            });
        });
    }

    return { init: init };
})();

// shortcuts.js — the single source of truth for keyboard shortcuts.
// The settings "Shortcuts" tab renders from SHORTCUTS; the command palette
// and help dialog read the same data. Keys are written for Windows/Linux
// (Ctrl) and translated for macOS (Cmd) by keyLabel().

window.OwletUI = window.OwletUI || {};

OwletUI.shortcuts = (function () {

    // Groups + entries: { key, action }. 'key' is a combo like 'Ctrl+S'.
    var SHORTCUTS = [
        { group: 'General', items: [
            { key: 'Ctrl+S', action: 'Save the active file' },
            { key: 'Ctrl+P', action: 'Command palette / Go to file' },
            { key: 'Ctrl+W', action: 'Close the active tab' },
            { key: 'Esc',    action: 'Close menus and dialogs' },
            { key: '?',      action: 'Open the help dialog' }
        ]},
        { group: 'Editor', items: [
            { key: 'Ctrl+Z',     action: 'Undo' },
            { key: 'Ctrl+Y',     action: 'Redo' },
            { key: 'Ctrl+A',     action: 'Select all' },
            { key: 'Ctrl+D',     action: 'Delete line' },
            { key: 'Ctrl+Enter', action: 'Insert line below' }
        ]},
        { group: 'View & panels', items: [
            { key: 'Ctrl+B', action: 'Toggle explorer' },
            { key: 'Ctrl+J', action: 'Toggle bottom panel' },
            { key: 'Ctrl+`', action: 'Toggle terminal' },
            { key: 'Alt+R',  action: 'Refresh preview' }
        ]}
    ];

    // macOS shows Cmd/Opt; Windows and Linux show Ctrl/Alt.
    var isMac = navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') !== -1;

    // Split "Ctrl+Alt+R" into display parts: ['Ctrl','+','Alt','+','R'].
    // Each key part gets its own kbd chip in the UI.
    function parts(combo) {
        return combo.split('+').map(function (k) {
            if (isMac && k === 'Ctrl') return '⌘';
            if (isMac && k === 'Alt')  return '⌥';
            if (isMac && k === 'Shift') return '⇧';
            return k;
        });
    }

    // Render one group's rows into a container.
    function renderGroup(container, group) {
        var title = document.createElement('div');
        title.className = 'shortcut-group-title';
        title.textContent = group.group;
        container.appendChild(title);
        group.items.forEach(function (item) {
            var row = document.createElement('div');
            row.className = 'shortcut-row';
            row.setAttribute('data-keys', item.key.toLowerCase());
            var name = document.createElement('span');
            name.className = 'shortcut-name';
            name.textContent = item.action;
            var keys = document.createElement('span');
            keys.className = 'shortcut-keys';
            parts(item.key).forEach(function (p, i) {
                if (i) {
                    var sep = document.createElement('span');
                    sep.className = 'kbd-sep';
                    sep.textContent = '+';
                    keys.appendChild(sep);
                }
                var chip = document.createElement('kbd');
                chip.textContent = p;
                keys.appendChild(chip);
            });
            row.appendChild(name);
            row.appendChild(keys);
            container.appendChild(row);
        });
    }

    // Render the whole list into #shortcut-list, filtered by the search text.
    function render(container, filter) {
        container.innerHTML = '';
        var q = (filter || '').trim().toLowerCase();
        var shown = 0;
        SHORTCUTS.forEach(function (group) {
            var visible = !q ? group.items : group.items.filter(function (i) {
                return i.action.toLowerCase().indexOf(q) !== -1 ||
                       i.key.toLowerCase().indexOf(q) !== -1;
            });
            if (!visible.length) return;
            renderGroup(container, { group: group.group, items: visible });
            shown += visible.length;
        });
        if (!shown) {
            var empty = document.createElement('div');
            empty.className = 'settings-empty is-on';
            empty.textContent = 'No shortcuts match.';
            container.appendChild(empty);
        }
    }

    // Wire the settings-tab search box + render the initial list.
    function init() {
        var list = document.getElementById('shortcut-list');
        if (!list) return;
        render(list, '');
        var search = document.getElementById('shortcut-search');
        if (search) {
            search.addEventListener('input', function () { render(list, search.value); });
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    return { list: SHORTCUTS, render: render, isMac: isMac };
})();

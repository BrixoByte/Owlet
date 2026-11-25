// dock-panel.js — the bottom panel content: Console filters, timestamps,
// grouped repeats and clickable file:line links; the Problems list; and the
// Terminal toolbar. console.js and terminal.js still produce the rows and the
// shell; this module only decorates and filters them.

window.OwletUI = window.OwletUI || {};

OwletUI.dock = (function () {
    var LEVELS = ['error', 'warn', 'info'];
    var LOCATION_RE = /\(([^()]+):(\d+):(\d+)\)\s*$/;
    var TERMINAL_PROFILES = [
        { id: 'local', label: 'Local (JS / Python)' },
        { id: 'python', label: 'Python (Pyodide)' },
        { id: 'cloud', label: 'Cloud sandbox' }
    ];
    var lastRow = null;     // last visible console row, used for grouping
    var levelOn = { error: true, warn: true, info: true };
    var searchText = '';
    var originOn = 'all';   // 'all' | 'project' | 'internal'
    var DEBUG_KEY = 'owlet:debug';   // shared with console.js

    // Element helper.
    function el(id) { return document.getElementById(id); }

    // "HH:MM:SS" for the timestamp column.
    function clock() {
        var d = new Date();
        return [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (n) {
            return (n < 10 ? '0' : '') + n;
        }).join(':');
    }

    // Level of a console row from its class (console.js sets error | warn | info).
    function levelOf(row) {
        for (var i = 0; i < LEVELS.length; i++) {
            if (row.classList.contains(LEVELS[i])) return LEVELS[i];
        }
        return 'info';
    }

    // Decide whether a row passes the level chips and the search box.
    function rowMatches(row) {
        if (row.dataset.grouped) return false;
        if (row.dataset.origin === 'internal' && !debugOn()) return false;
        if (!levelOn[levelOf(row)]) return false;
        if (originOn !== 'all' && row.dataset.origin !== originOn) return false;
        return !searchText || row.dataset.key.toLowerCase().indexOf(searchText) !== -1;
    }

    // Debug mode: show Owlet's own internal errors in the console.
    function debugOn() {
        try { return localStorage.getItem(DEBUG_KEY) === '1'; }
        catch (e) { return false; } // storage blocked: debug stays off
    }

    // Debug toggle button: persists the flag and re-runs the filters.
    function wireDebug() {
        var btn = el('btn-console-debug');
        if (!btn) return;
        btn.setAttribute('aria-pressed', String(debugOn()));
        btn.addEventListener('click', function () {
            var on = !debugOn();
            localStorage.setItem(DEBUG_KEY, on ? '1' : '0');
            btn.setAttribute('aria-pressed', String(on));
            applyFilters();
            window.dispatchEvent(new CustomEvent('owlet:debug-changed'));
            OwletUI.toast(on ? 'Debug mode on: Owlet internal errors are visible' : 'Debug mode off', 'info', { duration: 2200 });
        });
    }

    // Show or hide one row according to the filters.
    function applyRow(row) {
        row.classList.toggle('is-hidden', !rowMatches(row));
    }

    // Re-run the filters on every row.
    function applyFilters() {
        var out = el('console-output');
        if (!out) return;
        out.querySelectorAll('.console-line').forEach(applyRow);
    }

    // Add a timestamp, a repeat counter, and a file link to a new row.
    function decorateRow(row) {
        if (row.dataset.cp) return;
        row.dataset.cp = '1';
        row.dataset.key = row.textContent;
        var where = LOCATION_RE.exec(row.textContent);
        if (where) {
            row.dataset.file = where[1];
            row.dataset.line = where[2];
            row.dataset.col = where[3];
            row.classList.add('clickable');
        }
        var ts = document.createElement('span');
        ts.className = 'console-ts';
        ts.textContent = clock();
        row.insertBefore(ts, row.firstChild);
        var count = document.createElement('span');
        count.className = 'console-count';
        row.appendChild(count);
    }

    // Collapse a repeat of the previous visible row into a counter.
    function groupWithPrevious(row) {
        if (!lastRow || lastRow.dataset.key !== row.dataset.key || levelOf(lastRow) !== levelOf(row)) {
            lastRow = row;
            return;
        }
        var n = (Number(lastRow.dataset.count) || 1) + 1;
        lastRow.dataset.count = String(n);
        lastRow.querySelector('.console-count').textContent = '×' + n;
        row.dataset.grouped = '1';
    }

    // Process rows that appeared since the last run.
    function processNewRows() {
        var out = el('console-output');
        if (!out) return;
        if (!out.children.length) lastRow = null;
        out.querySelectorAll('.console-line').forEach(function (row) {
            if (row.dataset.cp) return;
            decorateRow(row);
            groupWithPrevious(row);
            applyRow(row);
        });
        OwletUI.notify('console');
    }

    // Open the file behind a row when it has a known location.
    function onRowClick(e) {
        var row = e.target.closest('.console-line');
        if (!row || !row.dataset.file) return;
        if (Owlet.state.files[row.dataset.file] === undefined) return;
        OwletUI.emit('ui:file-open', { path: row.dataset.file, line: Number(row.dataset.line), col: Number(row.dataset.col) });
    }

    // Level chips: "All" turns every level on; each other chip toggles one level.
    function wireChips() {
        document.querySelectorAll('.filter-chip[data-level]').forEach(function (chip) {
            chip.addEventListener('click', function () {
                var level = chip.getAttribute('data-level');
                if (level === 'all') {
                    LEVELS.forEach(function (name) { levelOn[name] = true; });
                } else {
                    levelOn[level] = !levelOn[level];
                }
                syncChips();
                applyFilters();
            });
        });
        syncChips();
    }

    // Pressed state of every level chip (All is pressed when every level is on).
    function syncChips() {
        document.querySelectorAll('.filter-chip[data-level]').forEach(function (chip) {
            var level = chip.getAttribute('data-level');
            var on = level === 'all'
                ? LEVELS.every(function (name) { return levelOn[name]; })
                : levelOn[level];
            chip.setAttribute('aria-pressed', String(on));
        });
    }

    // Source dropdown: all sources, project code only, or Owlet's own errors only.
    function wireOrigin() {
        var select = el('console-origin');
        if (!select) return;
        select.addEventListener('change', function () {
            originOn = select.value;
            applyFilters();
        });
    }

    // Text search over the console messages.
    function wireSearch() {
        var input = el('console-search');
        if (!input) return;
        input.addEventListener('input', function () {
            searchText = input.value.trim().toLowerCase();
            applyFilters();
        });
    }

    // Timestamp toggle (CSS shows .console-ts when the output has .is-ts).
    function wireTimestamps() {
        var btn = el('btn-console-ts');
        var out = el('console-output');
        if (!btn || !out) return;
        btn.addEventListener('click', function () {
            var on = !out.classList.contains('is-ts');
            out.classList.toggle('is-ts', on);
            btn.setAttribute('aria-pressed', String(on));
        });
    }

    // Console wiring: observe rows, clicks, and the filter controls.
    function wireConsole() {
        var out = el('console-output');
        if (!out) return;
        out.addEventListener('click', onRowClick);
        if (window.MutationObserver) {
            new MutationObserver(processNewRows).observe(out, { childList: true });
        }
        wireChips();
        wireSearch();
        wireOrigin();
        wireDebug();
        wireTimestamps();
        processNewRows();
    }

    // Render the Problems list grouped by file.
    function renderProblems() {
        var list = el('problems-list');
        if (!list) return;
        var items = OwletUI.snapshot.problems;
        var badge = el('problems-badge');
        if (badge) badge.textContent = items.length ? String(items.length) : '';
        var summary = el('problems-summary');
        if (summary) summary.textContent = summaryText(items);
        list.innerHTML = '';
        if (!items.length) {
            list.innerHTML = '<div class="empty-state"><h4>No problems</h4><p>Lint and compiler messages show up here.</p></div>';
            return;
        }
        groupByFile(items).forEach(function (group) {
            list.appendChild(fileHeader(group.path, group.items.length));
            group.items.forEach(function (p) { list.appendChild(problemRow(p)); });
        });
    }

    // "2 errors, 1 warning" plus a demo label while mock data is on.
    function summaryText(items) {
        var errors = items.filter(function (p) { return p.severity === 'error'; }).length;
        var warns = items.filter(function (p) { return p.severity === 'warn'; }).length;
        var text = errors + ' error' + (errors === 1 ? '' : 's') + ', ' + warns + ' warning' + (warns === 1 ? '' : 's');
        return OwletUI.snapshot.demo ? text + ' · demo data' : text;
    }

    // Group problems into { path, items } buckets, keeping the input order.
    function groupByFile(items) {
        var groups = [];
        var byPath = {};
        items.forEach(function (p) {
            if (!byPath[p.path]) { byPath[p.path] = { path: p.path, items: [] }; groups.push(byPath[p.path]); }
            byPath[p.path].items.push(p);
        });
        return groups;
    }

    // Sticky header row for one file.
    function fileHeader(path, count) {
        var row = document.createElement('div');
        row.className = 'problem-file';
        row.textContent = path;
        var n = document.createElement('span');
        n.className = 'problem-count';
        n.textContent = String(count);
        row.appendChild(n);
        return row;
    }

    // One problem: severity icon, message, and line:col (click opens the file).
    function problemRow(p) {
        var row = document.createElement('button');
        var icon = p.severity === 'info' ? 'info' : 'alert';
        row.className = 'problem-item is-' + (p.severity === 'warn' ? 'warn' : p.severity);
        row.innerHTML = OwletUI.icon(icon, 'icon-sm');
        var msg = document.createElement('span');
        msg.textContent = p.message + (p.source ? ' (' + p.source + ')' : '');
        var loc = document.createElement('span');
        loc.className = 'problem-loc';
        loc.textContent = p.line + ':' + p.col;
        row.appendChild(msg);
        row.appendChild(loc);
        row.addEventListener('click', function () {
            OwletUI.emit('ui:file-open', { path: p.path, line: p.line, col: p.col });
        });
        return row;
    }

    // Terminal toolbar: connection pill, profile picker, kill, copy, new.
    function renderTerminal() {
        var t = OwletUI.snapshot.terminal;
        var pill = el('terminal-status');
        if (pill) { pill.dataset.state = t.state; pill.textContent = t.label; }
        var mode = el('terminal-mode');
        if (mode) mode.textContent = t.label;
    }

    // Fill the profile dropdown from TERMINAL_PROFILES.
    function fillProfiles() {
        var select = el('terminal-profile');
        if (!select || select.children.length) return;
        TERMINAL_PROFILES.forEach(function (p) {
            var o = document.createElement('option');
            o.value = p.id;
            o.textContent = p.label;
            select.appendChild(o);
        });
        select.addEventListener('change', function () {
            OwletUI.emit('ui:terminal-profile', { id: select.value });
            OwletUI.toast('Cloud and profile switching: not connected yet', 'info', { duration: 2200 });
        });
    }

    // Copy whatever xterm is showing (the DOM renderer keeps the text).
    function copyTerminal() {
        var rows = document.querySelector('#terminal-host .xterm-rows');
        var text = rows ? rows.innerText.replace(/\s+$/g, '') : '';
        if (!text || !navigator.clipboard) {
            OwletUI.toast('Nothing to copy yet', 'info', { duration: 2000 });
            return;
        }
        navigator.clipboard.writeText(text).then(function () {
            OwletUI.toast('Terminal output copied', 'success', { duration: 2000 });
        }, function () {
            OwletUI.toast('Copy was blocked by the browser', 'warn', { duration: 2600 });
        });
    }

    // Wire the terminal toolbar buttons (kill and new are UI stubs).
    function wireTerminal() {
        fillProfiles();
        var copy = el('btn-terminal-copy');
        if (copy) copy.addEventListener('click', copyTerminal);
        var kill = el('btn-terminal-kill');
        if (kill) kill.addEventListener('click', function () {
            OwletUI.emit('ui:terminal-kill', {});
            OwletUI.toast('Kill session: not connected yet', 'info', { duration: 2200 });
        });
        var add = el('btn-terminal-new');
        if (add) add.addEventListener('click', function () {
            OwletUI.toast('Multiple terminals: coming in a later phase', 'info', { duration: 2200 });
        });
        renderTerminal();
    }

    // Re-render Problems and the terminal pill when contract data changes.
    function wireUpdates() {
        window.addEventListener('owletui:changed', function (e) {
            var topic = e.detail && e.detail.topic;
            if (topic === 'problems') renderProblems();
            if (topic === 'terminal') renderTerminal();
        });
    }

    // Start the bottom dock content.
    function init() {
        wireConsole();
        wireTerminal();
        wireUpdates();
        renderProblems();
    }

    return { init: init, renderProblems: renderProblems, applyFilters: applyFilters };
})();

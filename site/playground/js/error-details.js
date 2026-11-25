// error-details.js - the Error Details popup opened from a Console row.
// Shows the full message, the stack with project file names, a code frame around
// the error line, the raw arguments, copy buttons, Previous / Next and a plain-text
// fix hint. Markup lives in index.html (#error-dialog); this file only fills it.

window.Owlet = window.Owlet || {};

Owlet.errorDetails = (function () {
    // Beginner hints: the first pattern that matches the message wins.
    var FIX_HINTS = [
        { match: /is not defined/i, text: 'A variable or function is used before it is declared, or its name is misspelled. Check the spelling, and make sure the script that declares it runs first.' },
        { match: /Cannot read propert(y|ies) of (null|undefined)/i, text: 'Something is null or undefined. Usually an element was not found: check the id in getElementById and make sure the <script> runs after the element exists (or use DOMContentLoaded).' },
        { match: /Unexpected token|Unexpected end of input|Unexpected identifier|Invalid or unexpected token/i, text: 'Syntax error. Check matching brackets ( ) { } [ ], quotes, and missing commas or semicolons near the line shown.' },
        { match: /Failed to load resource/i, text: 'The file was not found or could not be loaded. Check the path and the exact file name (upper and lower case matter).' },
        { match: /is not a function/i, text: 'Something was called like a function but is not one. Check the name, and check that it is not a number, string or object.' },
        { match: /Assignment to constant variable/i, text: 'A const value is being changed. Use let if the value must change.' },
        { match: /Unhandled promise rejection/i, text: 'A Promise failed and nothing caught the error. Add .catch(...) or wrap await in try / catch.' }
    ];

    var current = null;   // the entry being shown
    var returnTo = null;  // element that gets the focus back when the popup closes

    // Element helper.
    function el(id) { return document.getElementById(id); }

    // The first line of a text.
    function firstLine(text) { return String(text || '').split('\n')[0]; }

    // Human label for a level.
    function levelLabel(level) {
        if (level === 'error') return 'Error';
        if (level === 'warn') return 'Warning';
        return 'Log';
    }

    // Readable time, or the raw value when it cannot be parsed.
    function formatTime(iso) {
        var d = new Date(iso);
        return isNaN(d.getTime()) ? String(iso || '') : d.toLocaleTimeString();
    }

    // "file:line:col", or the display name for Owlet's own errors.
    function placeText(entry) {
        if (!entry.file) return entry.where || '-';
        return entry.file + (entry.line ? ':' + entry.line + ':' + (entry.column || 1) : '');
    }

    // Title line: runtime errors use their own message; console calls get a prefix.
    function titleOf(entry) {
        if (entry.kind === 'console') return 'Console ' + levelLabel(entry.level).toLowerCase() + ': ' + firstLine(entry.message);
        return firstLine(entry.message);
    }

    // Errors and warnings in buffer order (Previous / Next walk through these).
    function problemList() {
        return Owlet.console.getEntries().filter(function (e) {
            return e.level === 'error' || e.level === 'warn';
        });
    }

    // True while the popup is visible.
    function isOpen() {
        var dialog = el('error-dialog');
        return !!dialog && dialog.style.display !== 'none' && current !== null;
    }

    // Open the popup for one entry. The entry's row gets the focus back on close.
    function show(entry) {
        var dialog = el('error-dialog');
        if (!dialog || !entry) return;
        var wasOpen = isOpen();
        current = entry;
        if (!wasOpen) returnTo = entry.row && document.body.contains(entry.row) ? entry.row : document.activeElement;
        fill(entry);
        dialog.style.display = 'flex';
        document.body.classList.add('modal-open');
        if (!wasOpen) dialog.querySelector('.error-box').focus();
    }

    // Hide the popup and unlock the page. restoreFocus=false keeps the focus where it is.
    function close(restoreFocus) {
        var dialog = el('error-dialog');
        if (!dialog || dialog.style.display === 'none') return;
        dialog.style.display = 'none';
        document.body.classList.remove('modal-open');
        if (restoreFocus !== false && returnTo && document.body.contains(returnTo)) returnTo.focus();
        current = null;
    }

    // Put one entry into every part of the popup.
    function fill(entry) {
        var level = el('error-level');
        level.textContent = levelLabel(entry.level);
        level.className = 'error-badge level-' + entry.level;
        el('error-title').textContent = titleOf(entry);
        el('error-kind').textContent = entry.kind + (entry.origin === 'internal' ? ' (Owlet internal)' : '');
        el('error-time').textContent = formatTime(entry.time);
        var goto = el('error-goto');
        goto.textContent = placeText(entry);
        goto.disabled = !entry.file || Owlet.state.files[entry.file] === undefined;
        goto.title = goto.disabled ? 'No project file for this error' : 'Open this line in the editor';
        el('error-message').textContent = entry.message || '(no message)';
        el('error-stack').textContent = entry.stack || '(no stack trace)';
        el('error-fix').textContent = hintFor(entry.message);
        renderFrame(entry);
        renderArgs(entry);
        updateNav(entry);
    }

    // Lines around the error (two above, two below) from the real file, or null.
    function frameLines(entry) {
        if (!entry.file || !entry.line || Owlet.state.files[entry.file] === undefined) return null;
        var all = Owlet.state.getFile(entry.file).split('\n');
        var from = Math.max(1, entry.line - 2);
        var to = Math.min(all.length, entry.line + 2);
        var rows = [];
        for (var n = from; n <= to; n++) {
            rows.push({ n: n, text: all[n - 1], hit: n === entry.line });
        }
        return rows;
    }

    // Show the code frame with line numbers, the error line highlighted and a caret.
    function renderFrame(entry) {
        var box = el('error-frame');
        box.innerHTML = '';
        var rows = frameLines(entry);
        if (!rows) {
            box.textContent = 'No source code for this location.';
            return;
        }
        rows.forEach(function (row) {
            var line = document.createElement('div');
            line.className = 'cf-line' + (row.hit ? ' cf-hit' : '');
            var num = document.createElement('span');
            num.className = 'cf-num';
            num.textContent = String(row.n);
            var text = document.createElement('span');
            text.className = 'cf-text';
            text.textContent = row.text || ' ';
            line.appendChild(num);
            line.appendChild(text);
            box.appendChild(line);
            if (row.hit && entry.column) {
                var caret = document.createElement('div');
                caret.className = 'cf-caret';
                caret.textContent = new Array(entry.column).join(' ') + '^';
                box.appendChild(caret);
            }
        });
    }

    // Show the raw arguments of console.* calls as an expandable tree.
    function renderArgs(entry) {
        var box = el('error-args');
        box.innerHTML = '';
        var args = entry.args || [];
        if (!args.length) {
            box.textContent = 'No arguments.';
            return;
        }
        args.forEach(function (arg, i) {
            box.appendChild(valueNode(arg, 'arg ' + (i + 1), 0));
        });
    }

    // One argument: a plain row for values, a collapsible block for objects and arrays.
    function valueNode(item, label, depth) {
        var branch = item.type === 'object' || item.type === 'array' || item.type === 'error';
        if (!branch) return valueRow(label, item);
        var block = document.createElement('details');
        block.open = depth < 1;
        var title = document.createElement('summary');
        title.textContent = label + ': ' + branchTitle(item);
        block.appendChild(title);
        childrenOf(item).forEach(function (child) {
            block.appendChild(valueNode(child.value, child.key, depth + 1));
        });
        return block;
    }

    // Short description of an object, array or error for its summary line.
    function branchTitle(item) {
        if (item.type === 'array') return 'Array(' + item.length + ')';
        if (item.type === 'error') return item.value;
        return item.ctor + ' {' + item.entries.length + ' keys}';
    }

    // The child items of an object, array or error.
    function childrenOf(item) {
        if (item.type === 'array') {
            return item.items.map(function (value, i) { return { key: '[' + i + ']', value: value }; });
        }
        if (item.type === 'object') return item.entries;
        if (item.type === 'error') return [{ key: 'stack', value: { type: 'string', value: item.stack || '' } }];
        return [];
    }

    // One leaf row: "key: value", coloured by type.
    function valueRow(label, item) {
        var row = document.createElement('div');
        row.className = 'arg-row';
        var key = document.createElement('span');
        key.className = 'arg-key';
        key.textContent = label + ': ';
        var value = document.createElement('span');
        value.className = 'arg-value arg-' + item.type;
        value.textContent = item.type === 'string' ? '"' + item.value + '"' : String(item.value);
        row.appendChild(key);
        row.appendChild(value);
        return row;
    }

    // Plain-text hint for a common beginner error, matched on the message.
    function hintFor(message) {
        for (var i = 0; i < FIX_HINTS.length; i++) {
            if (FIX_HINTS[i].match.test(message || '')) return FIX_HINTS[i].text;
        }
        return 'No specific hint. Read the message first, then look at the highlighted line in the code frame.';
    }

    // Enable Previous / Next and show "2 of 5".
    function updateNav(entry) {
        var list = problemList();
        var index = list.indexOf(entry);
        el('error-position').textContent = index === -1 ? '' : (index + 1) + ' of ' + list.length;
        el('error-prev').disabled = index <= 0;
        el('error-next').disabled = index === -1 || index >= list.length - 1;
    }

    // Move to the previous (-1) or next (+1) error in the list.
    function step(delta) {
        var list = problemList();
        var target = list[list.indexOf(current) + delta];
        if (target) show(target);
    }

    // Plain-text report for a bug report or a chat message.
    function reportText(entry) {
        var rows = frameLines(entry);
        var code = rows ? rows.map(function (row) {
            return (row.hit ? '> ' : '  ') + row.n + ' | ' + row.text;
        }).join('\n') : '(no code frame)';
        return [
            'Owlet error report',
            'Level: ' + levelLabel(entry.level),
            'Kind: ' + entry.kind,
            'Time: ' + formatTime(entry.time),
            'Location: ' + placeText(entry),
            '',
            'Message:',
            entry.message,
            '',
            'Code:',
            code,
            '',
            'Stack:',
            entry.stack || '(no stack trace)'
        ].join('\n');
    }

    // Copy text to the clipboard: try the Clipboard API, and on any failure
    // (insecure context, denied permission, rejected promise) use a hidden
    // textarea + execCommand('copy') instead.
    function copy(text, button) {
        if (!text) { flash(button, 'Nothing to copy'); return; }
        var done = false;
        function fallback() {
            if (done) return;
            done = true;
            var ok = false;
            var area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', '');
            area.style.position = 'fixed';
            area.style.top = '0';
            area.style.left = '0';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.focus();
            area.select();
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            area.remove();
            flash(button, ok ? 'Copied!' : 'Copy blocked');
        }
        if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(function () {
                done = true;
                flash(button, 'Copied!');
            }, fallback);
            return;
        }
        fallback();
    }

    // Show a short message on a button, then restore its label.
    function flash(button, text) {
        var original = button.getAttribute('data-label') || button.textContent;
        button.setAttribute('data-label', original);
        button.textContent = text;
        setTimeout(function () { button.textContent = original; }, 1500);
    }

    // Jump to the error line in the editor and close the popup.
    function goToSource() {
        if (!current || !current.file) return;
        Owlet.editor.openFileAt(current.file, current.line, current.column);
        close(false);
    }

    // Keep Tab inside the popup and close it on Escape. Runs in the capture phase
    // so the page-wide Escape handler does not also run.
    function onKeyDown(e) {
        if (!isOpen()) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            close(true);
            return;
        }
        if (e.key !== 'Tab') return;
        var items = focusables();
        if (!items.length) return;
        var first = items[0];
        var last = items[items.length - 1];
        var active = document.activeElement;
        var box = el('error-dialog').querySelector('.error-box');
        if (!el('error-dialog').contains(active)) {
            e.preventDefault();
            first.focus();
        } else if (e.shiftKey && (active === first || active === box)) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    }

    // Buttons and links inside the popup that can take focus.
    function focusables() {
        var nodes = el('error-dialog').querySelectorAll('button:not([disabled]), a[href], input, select, textarea');
        return Array.prototype.slice.call(nodes);
    }

    // Wire the popup buttons and the keyboard trap once at boot.
    function init() {
        var dialog = el('error-dialog');
        if (!dialog) return;
        el('error-close').addEventListener('click', function () { close(true); });
        var closeX = el('error-close-x');
        if (closeX) closeX.addEventListener('click', function () { close(true); });
        el('error-prev').addEventListener('click', function () { step(-1); });
        el('error-next').addEventListener('click', function () { step(1); });
        el('error-goto').addEventListener('click', goToSource);
        var copyBtn = el('error-copy');
        copyBtn.addEventListener('click', function () { if (current) copy(reportText(current), copyBtn); });
        var copyStackBtn = el('error-copy-stack');
        copyStackBtn.addEventListener('click', function () {
            if (!current) return;
            var stack = current.stack || el('error-stack').textContent || '';
            copy(stack === '(no stack trace)' ? '' : stack, copyStackBtn);
        });
        dialog.addEventListener('click', function (e) {
            if (e.target === dialog) close(true);
        });
        document.addEventListener('keydown', onKeyDown, true);
    }

    document.addEventListener('DOMContentLoaded', init);

    return { show: show, close: close, isOpen: isOpen };
})();

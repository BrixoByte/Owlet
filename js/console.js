// console.js - the Owlet Console panel.
// Receives messages from the preview bridge (see preview.js), keeps a buffer of up
// to 1000 entries, draws one row per entry, counts errors for the badge and opens
// the Error Details popup (error-details.js). dock-panel.js adds the filters,
// timestamps, repeat counters and file-link clicks on top of these rows.
//
// Entry shape: { id, level: 'error'|'warn'|'info', kind, origin: 'project'|'internal',
//   message, stack, file, line, column, where, time, args, row }
// kind: 'console' | 'runtime-error' | 'syntax-error' | 'unhandled-rejection' | 'resource-error'

window.Owlet = window.Owlet || {};

Owlet.console = (function () {
    var MAX_ENTRIES = 1000;   // buffer size and maximum number of rows
    var LABELS = { error: 'Error', warn: 'Warning', info: 'Log' };
    var outputEl = null;
    var badgeEl = null;
    var entries = [];         // messages since the last clear, oldest first
    var nextId = 1;
    var errorCount = 0;
    var warnCount = 0;

    // Grab DOM nodes and start listening for preview messages and Owlet's own errors.
    function init() {
        outputEl = document.getElementById('console-output');
        badgeEl = document.getElementById('console-badge');
        window.addEventListener('message', onMessage);
        window.addEventListener('error', onWindowError);
        window.addEventListener('unhandledrejection', onWindowRejection);
        Owlet.state.on('preview:run', function (info) {
            if (info.fresh && Owlet.settings.get('clearOnRun') !== false) clear();
        });
        var clearBtn = document.getElementById('btn-clear-console');
        if (clearBtn) clearBtn.addEventListener('click', clear);
        window.addEventListener('owlet:debug-changed', recount);
        updateBadge();
    }

    // Debug mode (Owlet's own errors visible): persisted flag shared with dock-panel.js.
    function debugOn() {
        try { return localStorage.getItem('owlet:debug') === '1'; }
        catch (e) { return false; } // storage blocked: debug stays off
    }

    // Internal entries are kept in the buffer but hidden unless debug mode is on.
    function entryVisible(entry) {
        return entry.origin !== 'internal' || debugOn();
    }

    // Recount the badge after debug mode toggles or the buffer changes.
    function recount() {
        errorCount = 0;
        warnCount = 0;
        entries.forEach(function (e) {
            if (!entryVisible(e)) return;
            if (e.level === 'error') errorCount++;
            if (e.level === 'warn') warnCount++;
        });
        updateBadge();
    }

    // Accept only messages from the preview iframe and only from the current run.
    function onMessage(e) {
        var d = e.data;
        var frame = document.getElementById('preview-frame');
        if (!d || d.source !== 'owlet-preview' || !frame || e.source !== frame.contentWindow) return;
        if (d.runId !== Owlet.preview.currentRunId()) return;
        if (d.level === 'clear') {
            clear();
            return;
        }
        addEntry(entryFromBridge(d));
    }

    // Convert one bridge record into an entry with a project file location.
    function entryFromBridge(d) {
        var loc = { file: '', line: 0, column: 0 };
        if (d.kind === 'resource-error') {
            loc = Owlet.preview.locate(Owlet.preview.entryFile(), d.raw || '');
        } else if (d.file) {
            loc = Owlet.preview.mapLocation(d.file, d.line, d.column);
        } else {
            var frame = firstFrame(d.stack || '');
            if (frame) loc = Owlet.preview.mapLocation(frame.url, frame.line, frame.column);
        }
        return {
            id: nextId++, level: d.level || 'info', kind: d.kind || 'console', origin: 'project',
            message: String(d.message || ''), stack: Owlet.preview.mapText(filterBridgeFrames(d.stack || '')),
            file: loc.file, line: loc.line, column: loc.column, where: '',
            time: d.time || new Date().toISOString(), args: d.args || []
        };
    }

    // Drop the bridge's own wrapper frames from a stack trace.
    function filterBridgeFrames(stack) {
        return String(stack || '').split('\n').filter(function (line) {
            return line.indexOf('owletWrapped') === -1;
        }).join('\n');
    }

    // First stack frame that is not the bridge: returns its url, line and column.
    function firstFrame(stack) {
        var lines = String(stack || '').split('\n');
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].indexOf('owletWrapped') !== -1) continue;
            var m = /(\S+?):(\d+):(\d+)\)?\s*$/.exec(lines[i]);
            if (m) return { url: m[1].replace(/^\(/, ''), line: Number(m[2]), column: Number(m[3]) };
        }
        return null;
    }

    // Errors raised by Owlet's own code (main window) are tagged "Owlet (internal)".
    function onWindowError(e) {
        var err = e.error;
        var text = err instanceof Error ? err.name + ': ' + err.message : String(e.message || 'Unknown error');
        addEntry(internalEntry('runtime-error', text, err && err.stack, e.filename, e.lineno, e.colno));
    }

    // Promise rejections in Owlet's own code.
    function onWindowRejection(e) {
        var r = e.reason;
        var text = r instanceof Error ? r.name + ': ' + r.message : String(r);
        addEntry(internalEntry('unhandled-rejection', 'Unhandled promise rejection: ' + text, r && r.stack));
    }

    // Build an entry for an error raised by Owlet's own code.
    function internalEntry(kind, message, stack, filename, line, column) {
        var shortName = filename ? String(filename).split('/').pop().split('?')[0] : '';
        return {
            id: nextId++, level: 'error', kind: kind, origin: 'internal',
            message: message, stack: String(stack || ''),
            file: '', line: line || 0, column: column || 0, where: shortName ? shortName + (line ? ':' + line + ':' + (column || 1) : '') : '',
            time: new Date().toISOString(), args: []
        };
    }

    // Store one entry, count it, draw its row and keep the buffer capped.
    function addEntry(entry) {
        entries.push(entry);
        if (entries.length > MAX_ENTRIES) entries.shift();
        if (entryVisible(entry)) {
            if (entry.level === 'error') errorCount++;
            if (entry.level === 'warn') warnCount++;
            renderRow(entry);
        }
        updateBadge();
        window.dispatchEvent(new CustomEvent('owlet:console-entry', { detail: entry }));
    }

    // Draw one row: level label, first line of the message, Details button, location.
    function renderRow(entry) {
        if (!outputEl) return;
        var row = document.createElement('div');
        row.className = 'console-line ' + (entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'info');
        row.dataset.origin = entry.origin;
        row.tabIndex = 0;
        row.appendChild(textSpan('console-level', LABELS[entry.level] || 'Log'));
        if (entry.origin === 'internal') row.appendChild(textSpan('console-origin-tag', 'Owlet (internal)'));
        row.appendChild(textSpan('console-msg', String(entry.message).split('\n')[0]));
        row.appendChild(detailsButton(entry));
        var place = placeOf(entry);
        if (place) row.appendChild(textSpan('console-loc', '(' + place + ')'));
        row.addEventListener('dblclick', function () { showDetails(entry); });
        row.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && e.target === row) {
                e.preventDefault();
                showDetails(entry);
            }
        });
        entry.row = row;
        outputEl.appendChild(row);
        outputEl.scrollTop = outputEl.scrollHeight;
        trimRows();
    }

    // Small text element with a class.
    function textSpan(className, text) {
        var span = document.createElement('span');
        span.className = className;
        span.textContent = text;
        return span;
    }

    // The Details button on a row. It opens the popup and does not open the file.
    function detailsButton(entry) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'console-details';
        btn.textContent = 'Details';
        btn.setAttribute('aria-label', 'Show error details');
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            showDetails(entry);
        });
        return btn;
    }

    // "file:line:col" text for a row, or the display name for Owlet's own errors.
    function placeOf(entry) {
        if (entry.file) return entry.file + (entry.line ? ':' + entry.line + ':' + (entry.column || 1) : '');
        return entry.where || '';
    }

    // Keep the number of rows equal to the buffer size.
    function trimRows() {
        while (outputEl && outputEl.children.length > MAX_ENTRIES) {
            outputEl.removeChild(outputEl.firstChild);
        }
    }

    // Badge on the Console tab: errors since the last clear (warnings in the tooltip).
    function updateBadge() {
        if (!badgeEl) return;
        badgeEl.textContent = errorCount ? String(errorCount) : '';
        badgeEl.title = errorCount + ' errors, ' + warnCount + ' warnings since the last clear';
    }

    // Plain message from Owlet's own modules (sandbox, compiler, Python output).
    function log(kind, text) {
        addEntry({
            id: nextId++, level: kind === 'error' ? 'error' : kind === 'warn' ? 'warn' : 'info',
            kind: 'console', origin: 'project', message: String(text), stack: '',
            file: '', line: 0, column: 0, where: '', time: new Date().toISOString(), args: []
        });
    }

    // Shorthands used by python.js / compiler.js / sandbox.js.
    function info(text) { log('info', text); }
    function warn(text) { log('warn', text); }
    function error(text) { log('error', text); }

    // Empty the buffer, the rows and the counters.
    function clear() {
        entries = [];
        errorCount = 0;
        warnCount = 0;
        if (outputEl) outputEl.innerHTML = '';
        updateBadge();
    }

    // Copy of the buffer (used by the popup for Previous / Next).
    function getEntries() {
        return entries.slice();
    }

    // Open the Error Details popup for one entry (generic: also used for Python and terminal errors).
    function showDetails(entry) {
        if (entry && window.Owlet.errorDetails) Owlet.errorDetails.show(entry);
    }

    return {
        init: init, log: log, info: info, warn: warn, error: error, clear: clear,
        getEntries: getEntries, showDetails: showDetails
    };
})();

// Public name from the task brief: OwletConsole.showDetails(entry).
window.OwletConsole = Owlet.console;

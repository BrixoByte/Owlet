// lint.js — real-time linting for Owlet (Phase 2).
// Wires ESLint (JS), HTMLHint (HTML) and csstree (CSS) into CodeMirror's lint
// addon, debounced so typing stays smooth. Python checks come with Pyodide.

window.Owlet = window.Owlet || {};

Owlet.lint = (function () {
    var timer = null;

    // Called once by app.js after the editor groups exist.
    // Linting runs per editor, for whatever file THAT pane shows — so two
    // panes with different files get independent squiggles.
    function init() {
        noticeMissingLinters();
        // Re-lint shortly after each change in any pane.
        function attach(cm) {
            if (cm._lintBound) return;
            cm._lintBound = true;
            cm.on('change', function () {
                schedule(function () { lintEditor(cm); }, 600);
            });
        }
        Owlet.groups.on('editorCreated', function (info) { attach(info.cm); });
        // Editors that already exist (created before lint.init ran).
        Owlet.groups.forEachEditor(attach);
        Owlet.state.on('active:changed', lintAll);
        Owlet.state.on('groups:changed', lintAll);
        Owlet.state.on('tabs:changed', lintAll);
    }

    // Show one calm status-bar hint when a lint library failed to load (offline
    // or CDN blocked). Not a console error: the app keeps working without it.
    function noticeMissingLinters() {
        var missing = [];
        if (!window.eslint) missing.push('JavaScript');
        if (!window.HTMLHint) missing.push('HTML');
        if (!window.csstree) missing.push('CSS');
        if (!missing.length) return;
        Owlet.ui.hint(missing.join(' / ') + ' lint unavailable offline — connect once to enable it');
    }

    // Debounce helper — one timer per lint call keeps typing smooth.
    function schedule(fn, ms) {
        clearTimeout(timer);
        timer = setTimeout(fn, ms);
    }

    // Lint every live editor for the file it currently shows.
    function lintAll() {
        if (!Owlet.groups || !Owlet.groups.forEachEditor) return;
        Owlet.groups.forEachEditor(lintEditor);
    }

    // Latest diagnostics per file — feeds the Problems dock + status counts.
    var diagnostics = {};

    // Republish every file's diagnostics to the UI contract.
    function publish() {
        if (!OwletUI.setProblems) return;
        var all = [];
        Object.keys(diagnostics).forEach(function (path) {
            diagnostics[path].forEach(function (m) {
                all.push({ path: path, line: m.line, col: m.col, severity: m.severity,
                           message: m.message, source: 'lint' });
            });
        });
        OwletUI.setProblems(all);
    }

    // Record one editor's lint result (CodeMirror Pos -> 1-based line/col).
    function report(path, list) {
        diagnostics[path] = (list || []).map(function (m) {
            return { line: (m.from ? m.from.line : 0) + 1, col: (m.from ? m.from.ch : 0) + 1,
                     severity: m.severity === 'warning' ? 'warn' : m.severity, message: m.message };
        });
        publish();
    }

    // Pick the right linter for one editor's current file.
    function lintEditor(cm) {
        if (!cm || !cm.owletPath) { if (cm) cm.setOption('lint', false); return; }
        var path = cm.owletPath;
        var mode = Owlet.editor.modeFor(path);
        var linter = mode === 'javascript' && window.eslint ? jsLint
                   : mode === 'htmlmixed' && window.HTMLHint ? htmlLint
                   : mode === 'css' && window.csstree ? cssLint
                   : null;
        if (!linter) { cm.setOption('lint', false); return; }
        cm.setOption('lint', { async: true, getAnnotations: function (text, cb, opts) {
            linter(text, opts, function (list) { report(path, list); cb(list); });
        } });
        if (cm.getOption('lint')) cm.performLint();
    }

    // eslint-linter-browserify exposes the Linter CLASS on window.eslint —
    // not a ready instance — so window.eslint.verify doesn't exist. Resolve a
    // usable instance once, whatever shape the bundle hands us.
    var eslintInstance = null;
    function getEslint() {
        if (eslintInstance) return eslintInstance;
        var e = window.eslint;
        if (!e) return null;
        if (typeof e.verify === 'function') eslintInstance = e;
        else if (e.Linter) eslintInstance = new e.Linter();
        else if (typeof e === 'function') eslintInstance = new e();
        return eslintInstance;
    }

    // ESLint browser build -> CodeMirror annotation format.
    function jsLint(text, options, callback) {
        try {
            var linter = getEslint();
            if (!linter) { callback([]); return; }
            var messages = linter.verify(text, {
                parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
                env: { browser: true, es2022: true },
                rules: { 'no-undef': 'warn', 'no-unused-vars': 'warn', 'no-redeclare': 'error' }
            });
            callback(messages.map(function (m) {
                return { from: cmPos(m.line, m.column), to: cmPos(m.endLine || m.line, m.endColumn || m.column),
                         message: m.message, severity: m.severity === 2 ? 'error' : 'warning' };
            }));
        } catch (e) {
            callback([{ from: CodeMirror.Pos(0, 0), to: CodeMirror.Pos(0, 1), message: 'Lint error: ' + e.message, severity: 'warning' }]);
        }
    }

    // HTMLHint -> CodeMirror annotations.
    function htmlLint(text, options, callback) {
        try {
            var messages = window.HTMLHint.verify(text, {
                'tagname-lowercase': true, 'attr-lowercase': true,
                'attr-value-double-quotes': false, 'doctype-first': false,
                'spec-char-escape': true, 'id-unique': true,
                'tag-pair': true, 'attr-no-duplication': true
            });
            callback(messages.map(function (m) {
                return { from: CodeMirror.Pos(m.line - 1, m.col - 1),
                         to: CodeMirror.Pos(m.line - 1, (m.col || 1) + ((m.raw && m.raw.length) || 1)),
                         message: m.message, severity: m.type === 'error' ? 'error' : 'warning' };
            }));
        } catch (e) {
            callback([{ from: CodeMirror.Pos(0, 0), to: CodeMirror.Pos(0, 1), message: 'Lint error: ' + e.message, severity: 'warning' }]);
        }
    }

    // css-tree parse errors -> CodeMirror annotations.
    function cssLint(text, options, callback) {
        try {
            var errors = [];
            window.csstree.parse(text, {
                positions: true,
                onParseError: function (e) {
                    errors.push({
                        from: CodeMirror.Pos(e.line - 1, e.column - 1),
                        to: CodeMirror.Pos(e.line - 1, e.column),
                        message: e.message || 'CSS parse error',
                        severity: 'error'
                    });
                }
            });
            callback(errors);
        } catch (e) {
            callback([{ from: CodeMirror.Pos(0, 0), to: CodeMirror.Pos(0, 1), message: 'Lint error: ' + e.message, severity: 'warning' }]);
        }
    }

    // Convert 1-based line/col to a CodeMirror Pos.
    function cmPos(line, col) {
        return CodeMirror.Pos(Math.max(0, (line || 1) - 1), Math.max(0, (col || 1) - 1));
    }

    return { init: init };
})();

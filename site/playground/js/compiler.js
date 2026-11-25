// compiler.js — BYOK multi-language compiler (Phase 6).
// Sends code to a user-configured compiler API (Judge0-style) and prints
// stdout/stderr into the console panel. Extension → language mapping is
// intentionally simple and easy to extend.

window.Owlet = window.Owlet || {};

Owlet.compiler = (function () {
    // File extension -> language id the compiler API understands.
    var LANG_BY_EXT = {
        c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp',
        java: 'java',
        py: 'python',
        js: 'javascript', mjs: 'javascript',
        ts: 'typescript',
        go: 'go', rs: 'rust',
        rb: 'ruby', php: 'php',
        cs: 'csharp',
        swift: 'swift', kt: 'kotlin',
        sql: 'sql', sh: 'bash', bash: 'bash'
    };

    // Called once by app.js (nothing to set up yet — settings are read lazily).
    function init() {}

    // Can this file be sent to the compiler?
    function canRun(path) {
        var ext = (path.split('.').pop() || '').toLowerCase();
        return LANG_BY_EXT[ext] !== undefined;
    }

    // Language id for a path, or null.
    function languageFor(path) {
        var ext = (path.split('.').pop() || '').toLowerCase();
        return LANG_BY_EXT[ext] || null;
    }

    // POST the active file to the configured compiler endpoint.
    async function run(path) {
        path = path || Owlet.state.activeFile;
        var lang = path && languageFor(path);
        if (!lang) { Owlet.ui.status('No compiler language for this file.'); return; }

        var url = Owlet.settings.get('compilerUrl');
        var key = Owlet.settings.get('compilerKey');
        if (!url) {
            Owlet.ui.status('Set a compiler endpoint in Settings first.');
            Owlet.console.warn('Compiler API not configured — add an endpoint URL in Settings.');
            return;
        }

        var code = Owlet.state.getFile(path);
        Owlet.console.info('--- compiling ' + path + ' (' + lang + ') ---');

        try {
            var headers = { 'Content-Type': 'application/json' };
            if (key) headers['Authorization'] = 'Bearer ' + key;

            // Judge0-style payload — most free compiler APIs accept this shape.
            var res = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    language: lang,
                    source: code,
                    stdin: ''
                })
            });

            if (!res.ok) throw new Error('HTTP ' + res.status);
            var data = await res.json();

            // Judge0 returns { stdout, stderr, status }; other APIs vary —
            // we print whatever fields exist so beginners can adapt.
            if (data.stdout) Owlet.console.info(data.stdout);
            if (data.stderr) Owlet.console.error(data.stderr);
            if (data.compile_output) Owlet.console.error(data.compile_output);
            if (data.status && data.status.description) {
                Owlet.console.info('Status: ' + data.status.description);
            }
            if (!data.stdout && !data.stderr && !data.compile_output) {
                Owlet.console.info(JSON.stringify(data).slice(0, 500));
            }
        } catch (e) {
            Owlet.console.error('Compiler request failed: ' + e.message);
            Owlet.ui.status('Compiler failed — check endpoint/key in Settings.');
        }
    }

    return { init: init, canRun: canRun, run: run, languageFor: languageFor };
})();

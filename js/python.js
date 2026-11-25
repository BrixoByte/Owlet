// python.js — run Python files in the browser via Pyodide (Phase 3).
// Pyodide (~10MB) is lazy-loaded only when the user first runs a .py file.
// Project files are written into Pyodide's virtual FS so imports work.

window.Owlet = window.Owlet || {};

Owlet.python = (function () {
    var pyodide = null;
    var loading = null;

    // Load Pyodide once; subsequent calls reuse the same promise.
    function load() {
        if (pyodide) return Promise.resolve(pyodide);
        if (loading) return loading;
        Owlet.ui.hint('Loading Python runtime (~10MB, first time only)…');
        loading = loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' })
            .then(function (p) {
                pyodide = p;
                // Route Python stdout/stderr into the Owlet console panel.
                p.setStdout({ batched: function (s) { Owlet.console.info(s); } });
                p.setStderr({ batched: function (s) { Owlet.console.error(s); } });
                Owlet.ui.hint('');
                return p;
            })
            .catch(function (e) {
                loading = null;
                Owlet.ui.hint('');
                Owlet.console.error('Pyodide failed to load: ' + e.message);
                throw e;
            });
        return loading;
    }

    // Write every project file into Pyodide's virtual filesystem.
    async function syncFiles(p) {
        var files = Owlet.state.files;
        for (var path in files) {
            if (!/\.(py|txt|json|csv|md)$/i.test(path)) continue;
            try {
                p.FS.mkdirTree(path.split('/').slice(0, -1).join('/') || '.');
                p.FS.writeFile(path, files[path]);
            } catch (e) { /* path already exists or odd name — skip */ }
        }
    }

    // Run the active .py file (or a given path) and stream output to console.
    async function run(path) {
        path = path || Owlet.state.activeFile;
        if (!path || !/\.py$/i.test(path)) {
            Owlet.ui.status('Open a .py file to run it.');
            return;
        }
        try {
            var p = await load();
            await syncFiles(p);
            Owlet.console.info('--- running ' + path + ' ---');
            await p.runPythonAsync(Owlet.state.getFile(path));
        } catch (e) {
            Owlet.console.error('Python error: ' + (e.message || e));
        }
    }

    // Quick syntax check without running — used by lint.js later.
    async function checkSyntax(path) {
        var p = await load();
        try {
            p.runPython('import ast');
            p.runPython('ast.parse(' + JSON.stringify(Owlet.state.getFile(path)) + ')');
            return null;
        } catch (e) {
            return e.message;
        }
    }

    return { run: run, load: load, checkSyntax: checkSyntax };
})();

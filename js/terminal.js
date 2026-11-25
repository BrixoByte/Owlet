// terminal.js — xterm.js terminal drawer with a pluggable engine interface.
// Phase 4: Local Mode engine (virtual commands + JS REPL + Python REPL).
// Phase 5: cloud engines attach through sandbox.js.

window.Owlet = window.Owlet || {};

Owlet.terminal = (function () {
    var term = null;
    var fitAddon = null;
    var engine = null;
    var hostEl = null;
    var history = [];
    var histIdx = -1;
    var currentLine = '';

    // Engine interface: { name, prompt(), onLine(line), dispose() }
    // Local mode implements it below; cloud engines come from sandbox.js.

    // Create the xterm instance lazily when the terminal tab is first opened.
    function init() {
        hostEl = document.getElementById('terminal-host');
        wireTabs();
        Owlet.state.on('project:loaded', function () { dispose(); });
    }

    // Show/hide the terminal panel via the dock tabs.
    function toggle() {
        var panel = document.getElementById('terminal-panel');
        var consolePanel = document.getElementById('console-panel');
        if (!panel) return;
        var show = panel.style.display !== 'flex' && !panel.classList.contains('active');
        panel.classList.toggle('active', show);
        consolePanel.classList.toggle('active', !show);
        document.querySelectorAll('.dock-tab').forEach(function (t) {
            t.classList.toggle('active', (t.dataset.dock === 'terminal') === show);
        });
        if (show) start();
    }

    // Wire the dock tab buttons + close button.
    function wireTabs() {
        document.querySelectorAll('.dock-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                var which = tab.dataset.dock;
                document.querySelectorAll('.dock-tab').forEach(function (t) {
                    t.classList.toggle('active', t === tab);
                });
                document.getElementById('console-panel').classList.toggle('active', which === 'console');
                document.getElementById('terminal-panel').classList.toggle('active', which === 'terminal');
                if (which === 'terminal') start();
            });
        });
        var closeBtn = document.getElementById('btn-terminal-close');
        if (closeBtn) closeBtn.addEventListener('click', function () {
            document.getElementById('terminal-panel').classList.remove('active');
            document.querySelector('.dock-tab[data-dock="console"]').classList.add('active');
            document.getElementById('console-panel').classList.add('active');
        });
    }

    // Boot xterm + local engine on first open.
    function start() {
        if (term) { fit(); return; }
        if (typeof Terminal === 'undefined') {
            Owlet.ui.status('xterm.js not loaded.');
            return;
        }
        term = new Terminal({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: 'Consolas, monospace',
            theme: { background: '#1e1f24', foreground: '#d7dae0' }
        });
        if (window.FitAddon) {
            fitAddon = new FitAddon.FitAddon();
            term.loadAddon(fitAddon);
        }
        term.open(hostEl);
        fit();
        engine = createLocalEngine();
        term.writeln('Owlet terminal — type "help" for commands.');
        prompt();

        term.onData(function (data) {
            if (data === '\r') {
                term.write('\r\n');
                var line = currentLine;
                history.push(line);
                histIdx = history.length;
                currentLine = '';
                engine.onLine(line);
                prompt();
            } else if (data === '\u007f') { // backspace
                if (currentLine.length) {
                    currentLine = currentLine.slice(0, -1);
                    term.write('\b \b');
                }
            } else if (data === '\u001b[A') { // up arrow
                if (histIdx > 0) {
                    histIdx--;
                    currentLine = history[histIdx] || '';
                    redrawLine();
                }
            } else if (data === '\u001b[B') { // down arrow
                if (histIdx < history.length - 1) {
                    histIdx++;
                    currentLine = history[histIdx] || '';
                    redrawLine();
                }
            } else if (data >= ' ') {
                currentLine += data;
                term.write(data);
            }
        });
    }

    // Repaint the current input line after history navigation.
    function redrawLine() {
        term.write('\r' + ' '.repeat(200) + '\r' + engine.prompt() + currentLine);
    }

    // Write the engine prompt without a newline.
    function prompt() {
        term.write(engine.prompt());
    }

    // Refit xterm to its container.
    function fit() {
        if (fitAddon) try { fitAddon.fit(); } catch (e) {}
    }

    // Dispose engine + xterm (project reload).
    function dispose() {
        if (engine && engine.dispose) engine.dispose();
        engine = null;
        if (term) { term.dispose(); term = null; }
    }

    // ---------- Local Mode engine ----------
    // Virtual commands over the in-memory project + JS/Python REPLs.
    function createLocalEngine() {
        var cwd = '';
        var pyReady = null;

        return {
            name: 'local',
            prompt: function () { return cwd ? cwd + '$ ' : '$ '; },
            dispose: function () {},
            onLine: function (line) {
                var parts = line.trim().split(/\s+/);
                var cmd = parts[0] || '';
                var args = parts.slice(1).join(' ');

                switch (cmd) {
                    case '': break;
                    case 'help':
                        term.writeln('Commands: ls, cd, cat, pwd, clear, run <file>, js <code>, py <code>, python, exit');
                        break;
                    case 'ls':
                        Owlet.state.listFiles().forEach(function (f) { term.writeln('  ' + f); });
                        break;
                    case 'pwd': term.writeln('/' + cwd); break;
                    case 'cd':
                        cwd = args.replace(/^\//, '').replace(/\/$/, '');
                        break;
                    case 'cat': {
                        var target = resolvePath(args);
                        var content = Owlet.state.getFile(target);
                        term.writeln(content || '(no such file)');
                        break;
                    }
                    case 'clear': term.clear(); break;
                    case 'run': {
                        var f = resolvePath(args);
                        var ext = (f.split('.').pop() || '').toLowerCase();
                        if (ext === 'py' && Owlet.python) Owlet.python.run(f);
                        else if (ext === 'js') {
                            try { term.writeln(String(eval(Owlet.state.getFile(f)))); }
                            catch (e) { term.writeln('Error: ' + e.message); }
                        } else term.writeln('Cannot run .' + ext);
                        break;
                    }
                    case 'js': {
                        try { term.writeln(String(eval(line.slice(3)))); }
                        catch (e) { term.writeln('Error: ' + e.message); }
                        break;
                    }
                    case 'py': {
                        pyRun(line.slice(3));
                        break;
                    }
                    case 'python': {
                        // Interactive-ish: run the active .py file.
                        var active = Owlet.state.activeFile;
                        if (active && /\.py$/i.test(active) && Owlet.python) Owlet.python.run(active);
                        else term.writeln('Open a .py file first, or use: py <code>');
                        break;
                    }
                    case 'exit': term.writeln('There is no escape.'); break;
                    default:
                        term.writeln(cmd + ': command not found (try "help")');
                }
            }
        };

        // Resolve a user-typed path against the virtual cwd.
        function resolvePath(p) {
            p = (p || '').replace(/^\//, '');
            if (cwd && p && p.indexOf(cwd + '/') !== 0) p = cwd + '/' + p;
            return p;
        }

        // Lazy-load Pyodide for `py <code>` one-liners.
        function pyRun(code) {
            if (!Owlet.python) { term.writeln('Python support not loaded.'); return; }
            Owlet.python.load().then(function (p) {
                try {
                    var result = p.runPython(code);
                    if (result !== undefined) term.writeln(String(result));
                } catch (e) {
                    term.writeln('Python error: ' + e.message);
                }
            }).catch(function (e) {
                term.writeln('Pyodide load failed: ' + e.message);
            });
        }
    }

    return { init: init, toggle: toggle, start: start, fit: fit, dispose: dispose };
})();

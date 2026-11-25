/* ==========================================================================
   mock.js - renderMock(container, scene): a compact, honest mock of the
   Owlet UI built from data. Everything is created with DOM APIs
   (createElement / textContent) - no innerHTML, nothing is an image.

   scene = {
     files: ["index.html", "style.css", "app.js"],
     activeFile: "app.js",
     code:  [ { tokens: [ { t: "const ", c: "kw" }, { t: "user", c: "pl" } ] } ],
     code2: [ ... ]                       // second pane for layout "split"
     highlightLines: [2],
     errorLine: 2 | null,
     preview: { device: "desktop|tablet|phone", nodes: [ node ] },
     previewAfter: { nodes: [ node ] },    // swapped in by the "preview" step
     console: [ { level: "error|warn|log", text: "..." } ],
     layout: "editor+preview" | "editor+console" | "split",
     showTree: true,
     annotation: { target: "editor|preview|console|tree", text: "..." },
     steps: [ { do, ...args, delayMs } ]   // optional scripted animation
   }

   node = { tag: "h1", text: "...", cls: "pv-btn", style: { color: "#ff8a4c" },
            children: [ node ] }

   Step verbs:
     type    { line: n, tokens: [...] }       type a new line char by char
     select  { file: "style.css" }            move the active-file marker
     unerror {}                               clear the error line + error rows
     log     { level, text }                  append a console row
     preview {}                               swap in scene.previewAfter
     device  { device: "phone" }              resize the preview frame
   ========================================================================== */

(function () {
    'use strict';

    // Map a token kind to a CSS class.
    function tokClass(kind) {
        return 'tok-' + (kind || 'pl');
    }

    // Turn a token list into a DocumentFragment of coloured spans.
    function renderTokens(tokens, into) {
        (tokens || []).forEach(function (tok) {
            var span = document.createElement('span');
            span.className = tokClass(tok.c);
            span.textContent = tok.t;
            into.appendChild(span);
        });
    }

    // Recursively build preview nodes (createElement/textContent only).
    function buildNode(node) {
        var el = document.createElement(node.tag || 'div');
        if (node.cls) el.className = node.cls;
        if (node.style) {
            Object.keys(node.style).forEach(function (prop) {
                el.style[prop] = node.style[prop];
            });
        }
        if (node.text != null) el.textContent = node.text;
        (node.children || []).forEach(function (child) {
            el.appendChild(buildNode(child));
        });
        return el;
    }

    // Build one editor pane from a line list. Returns { pane, lines }.
    function buildEditor(lines, opts) {
        var pane = document.createElement('div');
        pane.className = 'dpm-editor';
        var rows = [];
        (lines || []).forEach(function (line, i) {
            var row = document.createElement('div');
            row.className = 'dpm-line';
            if (opts && opts.errorLine === i + 1) row.classList.add('is-err');
            if (opts && opts.highlightLines && opts.highlightLines.indexOf(i + 1) !== -1) row.classList.add('is-hl');
            var ln = document.createElement('span');
            ln.className = 'dpm-ln';
            ln.textContent = String(i + 1);
            var lc = document.createElement('span');
            lc.className = 'dpm-lc';
            renderTokens(line.tokens, lc);
            row.appendChild(ln);
            row.appendChild(lc);
            pane.appendChild(row);
            rows.push(row);
        });
        return { pane: pane, rows: rows };
    }

    // Build the console pane; returns { pane, addRow }.
    function buildConsole(entries) {
        var pane = document.createElement('div');
        pane.className = 'dpm-console';
        function addRow(level, text, animate) {
            var row = document.createElement('div');
            row.className = 'dpm-crow lvl-' + (level || 'log') + (animate ? ' is-new' : '');
            var span = document.createElement('span');
            span.textContent = text;
            row.appendChild(span);
            pane.appendChild(row);
            return row;
        }
        (entries || []).forEach(function (entry) { addRow(entry.level, entry.text, false); });
        return { pane: pane, addRow: addRow };
    }

    // Build the preview pane with a device frame; returns { pane, device, setNodes }.
    function buildPreview(scene) {
        var pane = document.createElement('div');
        pane.className = 'dpm-preview';
        var device = document.createElement('div');
        device.className = 'dpm-device';
        pane.appendChild(device);
        function setNodes(nodes) {
            device.textContent = '';
            (nodes || []).forEach(function (n) { device.appendChild(buildNode(n)); });
        }
        var preview = scene.preview || {};
        setNodes(preview.nodes || []);
        return { pane: pane, device: device, setNodes: setNodes };
    }

    // Kind hint for the file-tree dot, from the file extension.
    function fileKind(name) {
        if (/\.css$/i.test(name)) return 'css';
        if (/\.(js|mjs|ts)$/i.test(name)) return 'js';
        return 'html';
    }

    // Play one scripted step on a built mock. Returns the ms to wait before the next.
    function runStep(step, ctx) {
        var delay = typeof step.delayMs === 'number' ? step.delayMs : 450;
        switch (step.do) {
            case 'type': {
                // Type a fresh line into the editor, char by char.
                var row = document.createElement('div');
                row.className = 'dpm-line';
                var ln = document.createElement('span');
                ln.className = 'dpm-ln';
                var lc = document.createElement('span');
                lc.className = 'dpm-lc';
                var caret = document.createElement('span');
                caret.className = 'dpm-caret';
                row.appendChild(ln);
                row.appendChild(lc);
                lc.appendChild(caret);
                if (typeof step.at === 'number' && ctx.rows[step.at]) {
                    ctx.editor.insertBefore(row, ctx.rows[step.at]);
                    ctx.rows.splice(step.at, 0, row);
                } else {
                    ctx.editor.appendChild(row);
                    ctx.rows.push(row);
                }
                ctx.rows.forEach(function (r, i) { r.firstChild.textContent = String(i + 1); });
                var text = (step.tokens || []).map(function (t) { return t.t; }).join('');
                var typed = 0;
                var tick = function () {
                    typed += 1;
                    lc.textContent = '';
                    var frag = document.createDocumentFragment();
                    // Re-render tokens progressively: reveal chars across spans.
                    var left = typed;
                    (step.tokens || []).forEach(function (tok) {
                        if (left <= 0) return;
                        var span = document.createElement('span');
                        span.className = tokClass(tok.c);
                        span.textContent = tok.t.slice(0, left);
                        left -= tok.t.length;
                        frag.appendChild(span);
                    });
                    lc.appendChild(frag);
                    lc.appendChild(caret);
                    if (typed < text.length) ctx.timers.push(setTimeout(tick, 34));
                    else caret.remove();
                };
                tick();
                return delay + text.length * 34;
            }
            case 'select': {
                ctx.fileNodes.forEach(function (f) {
                    f.classList.toggle('is-active', f.getAttribute('data-file') === step.file);
                });
                ctx.tabs.forEach(function (t) {
                    t.classList.toggle('is-active', t.getAttribute('data-file') === step.file);
                });
                return delay;
            }
            case 'unerror': {
                ctx.rows.forEach(function (r) { r.classList.remove('is-err'); });
                ctx.consoleRows.forEach(function (r) {
                    if (r.classList.contains('lvl-error')) r.remove();
                });
                return delay;
            }
            case 'log': {
                var row = ctx.addRow(step.level, step.text, true);
                ctx.consoleRows.push(row);
                return delay;
            }
            case 'preview': {
                var after = ctx.scene.previewAfter || {};
                ctx.setNodes(after.nodes || []);
                return delay;
            }
            case 'device': {
                ctx.root.setAttribute('data-device', step.device || 'desktop');
                return delay;
            }
            default:
                return delay;
        }
    }

    // Build the whole mock into `container` and return { root, play }.
    function renderMock(container, scene) {
        scene = scene || {};
        var root = document.createElement('div');
        root.className = 'dpm';
        var layout = scene.layout || 'editor+preview';
        if (layout === 'editor+console') root.classList.add('layout-console');
        if (layout === 'split') root.classList.add('layout-split');
        if (scene.preview && scene.preview.device === 'phone') root.classList.add('layout-phone');
        if (scene.showTree === false) root.classList.add('no-tree');
        root.setAttribute('data-device', (scene.preview && scene.preview.device) || 'desktop');
        root.setAttribute('role', 'img');
        if (scene.ariaLabel) root.setAttribute('aria-label', scene.ariaLabel);

        // Title bar: dots, file tabs, run chip.
        var bar = document.createElement('div');
        bar.className = 'dpm-bar';
        var dots = document.createElement('span');
        dots.className = 'dpm-dots';
        for (var i = 0; i < 3; i++) dots.appendChild(document.createElement('span'));
        bar.appendChild(dots);
        var tabs = document.createElement('span');
        tabs.className = 'dpm-tabs';
        var tabNodes = [];
        (scene.files || [scene.activeFile]).forEach(function (name) {
            var tab = document.createElement('span');
            tab.className = 'dpm-tab' + (name === scene.activeFile ? ' is-active' : '');
            tab.setAttribute('data-file', name);
            tab.textContent = name;
            tabs.appendChild(tab);
            tabNodes.push(tab);
        });
        bar.appendChild(tabs);
        var run = document.createElement('span');
        run.className = 'dpm-run';
        run.textContent = 'Run';
        bar.appendChild(run);
        root.appendChild(bar);

        // Body.
        var body = document.createElement('div');
        body.className = 'dpm-body';

        var fileNodes = [];
        if (scene.showTree !== false && (scene.files || []).length) {
            var tree = document.createElement('aside');
            tree.className = 'dpm-tree';
            scene.files.forEach(function (name) {
                var f = document.createElement('span');
                f.className = 'dpm-file' + (name === scene.activeFile ? ' is-active' : '');
                f.setAttribute('data-kind', fileKind(name));
                f.setAttribute('data-file', name);
                f.textContent = name;
                tree.appendChild(f);
                fileNodes.push(f);
            });
            body.appendChild(tree);
        }

        var ed = buildEditor(scene.code || [], scene);
        body.appendChild(ed.pane);

        var ed2 = null;
        if (layout === 'split') {
            ed2 = buildEditor(scene.code2 || scene.code || [], {});
            body.appendChild(ed2.pane);
        }

        var previewBuilt = null;
        if (layout !== 'editor+console' && layout !== 'split' && scene.preview) {
            previewBuilt = buildPreview(scene);
            body.appendChild(previewBuilt.pane);
        }

        var consoleBuilt = null;
        var consoleRows = [];
        if (scene.console && scene.console.length) {
            consoleBuilt = buildConsole(scene.console);
            consoleRows = Array.prototype.slice.call(consoleBuilt.pane.children);
            if (layout === 'split' || scene.consoleUnder !== false) {
                body.appendChild(consoleBuilt.pane);
            }
        }

        root.appendChild(body);

        // Annotation callout, pinned to a pane corner.
        if (scene.annotation && scene.annotation.text) {
            var note = document.createElement('div');
            note.className = 'dpm-note';
            note.textContent = scene.annotation.text;
            var target = scene.annotation.target;
            var host =
                target === 'preview' && previewBuilt ? previewBuilt.pane :
                target === 'console' && consoleBuilt ? consoleBuilt.pane :
                target === 'tree' ? body.querySelector('.dpm-tree') : null;
            (host || ed.pane).appendChild(note);
        }

        // Replay button (appears on hover/focus or after the play finishes).
        var replay = document.createElement('button');
        replay.type = 'button';
        replay.className = 'dpm-replay';
        replay.textContent = 'Replay';
        root.appendChild(replay);

        var ctx = {
            root: root,
            scene: scene,
            editor: ed.pane,
            rows: ed.rows,
            tabs: tabNodes,
            fileNodes: fileNodes,
            consoleRows: consoleRows,
            addRow: consoleBuilt ? consoleBuilt.addRow : function () { return null; },
            setNodes: previewBuilt ? previewBuilt.setNodes : function () {},
            timers: []
        };

        function clearTimers() {
            ctx.timers.forEach(clearTimeout);
            ctx.timers.length = 0;
        }

        // Instant final state: apply every step without animation or delays.
        function applyFinal() {
            (scene.steps || []).forEach(function (step) {
                switch (step.do) {
                    case 'type': {
                        var row = document.createElement('div');
                        row.className = 'dpm-line';
                        var ln = document.createElement('span');
                        ln.className = 'dpm-ln';
                        var lc = document.createElement('span');
                        lc.className = 'dpm-lc';
                        renderTokens(step.tokens, lc);
                        row.appendChild(ln);
                        row.appendChild(lc);
                        if (typeof step.at === 'number' && ctx.rows[step.at]) {
                            ctx.editor.insertBefore(row, ctx.rows[step.at]);
                            ctx.rows.splice(step.at, 0, row);
                        } else {
                            ctx.editor.appendChild(row);
                            ctx.rows.push(row);
                        }
                        ctx.rows.forEach(function (r, i) { r.firstChild.textContent = String(i + 1); });
                        break;
                    }
                    default:
                        runStep(step, ctx);
                }
            });
            root.classList.add('is-done');
        }

        // Run the script once, step by step.
        function play() {
            clearTimers();
            root.classList.remove('is-done');
            var steps = scene.steps || [];
            var t = 120;
            steps.forEach(function (step) {
                ctx.timers.push(setTimeout(function () { runStep(step, ctx); }, t));
                t += (typeof step.delayMs === 'number' ? step.delayMs : 450)
                   + (step.do === 'type' ? ((step.tokens || []).map(function (x) { return x.t; }).join('').length * 34) : 0);
            });
            ctx.timers.push(setTimeout(function () { root.classList.add('is-done'); }, t));
        }

        var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
            applyFinal();
            replay.hidden = true;
        } else {
            replay.addEventListener('click', play);
            // Auto-play once when the mock scrolls into view.
            if ('IntersectionObserver' in window) {
                var io = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) return;
                        io.unobserve(root);
                        play();
                    });
                }, { threshold: 0.35 });
                io.observe(root);
            } else {
                applyFinal();
            }
        }

        container.textContent = '';
        container.appendChild(root);
        return { root: root, play: play };
    }

    // Replay the mock rendered inside an element (used by the showcase replay).
    function replayIn(el) {
        var root = el && el.querySelector ? el.querySelector('.dpm') : null;
        if (root && root._mock && root._mock.play) root._mock.play();
    }

    var api = { render: renderMock, replayIn: replayIn };
    window.OwletLanding = window.OwletLanding || {};
    window.OwletLanding.mock = api;
    // Stash the instance on the root so replayIn can find it.
    var original = renderMock;
    api.render = function (container, scene) {
        var inst = original(container, scene);
        inst.root._mock = inst;
        return inst;
    };
})();

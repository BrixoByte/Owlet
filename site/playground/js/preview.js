// preview.js — render the multi-file project inside a sandboxed iframe.
// Every file becomes a Blob URL; relative references in HTML/CSS/JS are
// rewritten to those URLs so ./style.css, ./app.js, images, srcsets and even
// links between pages "just work". Every HTML page gets the console bridge,
// so navigating inside the preview keeps reporting errors (each page's line
// shift is mapped back to the user's file).

window.Owlet = window.Owlet || {};

Owlet.preview = (function () {
    var iframe = null;
    var blobUrls = [];        // URLs backing the CURRENT frame — revoked after the next render lands
    var newUrls = [];         // URLs created while building the next document
    var debounceTimer = null;
    var entryPath = 'index.html';
    var runId = 0;            // increases on every render; messages from older runs are ignored
    var blobPath = {};        // blob URL -> project file path (used to name files in stack traces)
    var pageShift = {};       // project path -> line shift caused by the injected bridge
    var bridgeShift = { top: 0, lines: 0, fromLine: 0 }; // entry file's line shift (for srcdoc errors)
    var urlMode = 'blob';     // 'blob' = live preview; 'data' = standalone pop-out
    // MIME type by extension so Blob URLs behave like real files.
    var MIME = {
        html: 'text/html', htm: 'text/html',
        css: 'text/css',
        js: 'text/javascript', mjs: 'text/javascript',
        json: 'application/json',
        svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg',
        jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
        avif: 'image/avif', bmp: 'image/bmp',
        ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2',
        txt: 'text/plain', md: 'text/plain', py: 'text/plain', csv: 'text/csv'
    };

    // Locate the iframe and (re)render when the project loads.
    function init() {
        iframe = document.getElementById('preview-frame');
        Owlet.state.on('project:loaded', function () { update(); });
        // First render without waiting for Run: when the first HTML file
        // appears (new file, import, open) and nothing is drawn yet, draw
        // it — the pane should never sit blank before the first Run click.
        Owlet.state.on('files:changed', function () {
            if (entryPath && iframe && iframe.srcdoc) return;
            if (pickEntry()) update();
        });
        // Re-render when the app theme flips so the preview's default page
        // colours follow it (works for manual toggles and 'system' follow).
        if (window.MutationObserver) {
            new MutationObserver(function (muts) {
                for (var i = 0; i < muts.length; i++) {
                    if (muts[i].attributeName === 'data-theme') { update(); break; }
                }
            }).observe(document.documentElement, { attributes: true });
        }
        bindRefresh();
    }

    // Which file should drive the preview? First .html file wins.
    function pickEntry() {
        var files = Owlet.state.listFiles().filter(function (p) { return /\.html?$/i.test(p); });
        entryPath = files.indexOf('index.html') !== -1 ? 'index.html' : files[0];
        return entryPath;
    }

    // Extension helpers.
    function extOf(path) { return (path.split('.').pop() || '').toLowerCase(); }
    function mimeOf(path) { return MIME[extOf(path)] || 'text/plain'; }

    // Resolve a relative ref (./x, ../x, plain "x") against a file's folder.
    function resolveRef(fromFile, ref) {
        if (!ref || /^(https?:|data:|blob:|mailto:|#|javascript:)/i.test(ref)) return null;
        ref = ref.split('#')[0].split('?')[0];
        if (!ref) return null;
        var base = fromFile.split('/');
        base.pop();                      // folder of the referencing file
        ref.split('/').forEach(function (part) {
            if (part === '..') base.pop();
            else if (part !== '.' && part !== '') base.push(part);
        });
        return base.join('/');
    }

    // Turn file content into a resource URL. Blob URLs made during a build
    // collect in newUrls; render() swaps them in as `blobUrls` only once the
    // new srcdoc is live, so the old document never loses resources mid-rebuild.
    // In 'data' mode the content is inlined as a data: URI instead — used for
    // the popped-out preview window, which must not depend on this tab's blobs.
    function makeBlob(content, mime) {
        if (urlMode === 'data') {
            return 'data:' + mime + ';charset=utf-8;base64,'
                + btoa(unescape(encodeURIComponent(content)));
        }
        var url = URL.createObjectURL(new Blob([content], { type: mime }));
        newUrls.push(url);
        return url;
    }

    // Rewrite CSS url(...) refs AND bare @import "x.css" refs that point to
    // project files.
    function rewriteCssUrls(css, fromFile, urlMap) {
        var out = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, function (m, q, ref) {
            var resolved = resolveRef(fromFile, ref.trim());
            return resolved && urlMap[resolved] ? 'url("' + urlMap[resolved] + '")' : m;
        });
        out = out.replace(/(@import\s+)(['"])([^'"]+)\2/g, function (m, head, q, ref) {
            var resolved = resolveRef(fromFile, ref.trim());
            return resolved && urlMap[resolved] ? head + q + urlMap[resolved] + q : m;
        });
        return out;
    }

    // Rewrite JS import/export specifiers that point to project files.
    function rewriteJsImports(js, fromFile, urlMap) {
        return js.replace(
            /(import\s+[^'"]*|import\s*\(|export\s+[^'"]*from\s*|from\s*)(['"])([^'"]+)\2/g,
            function (m, head, q, ref) {
                var resolved = resolveRef(fromFile, ref.trim());
                return resolved && urlMap[resolved]
                    ? head + q + urlMap[resolved] + q
                    : m;
            });
    }

    // THE BRIDGE: runs inside the preview iframe before any user script.
    // It reports console calls, runtime errors, syntax errors, unhandled promise
    // rejections and failed resources to Owlet with postMessage.
    // It must never throw. It is inlined as a <script>, so it must not contain
    // the closing script tag text.
    function owletBridge(runId, mirror) {
        var MAX_TEXT = 10000; // longer strings are cut
        var MAX_DEPTH = 3;    // deeper objects are shown as [Object]
        var MAX_KEYS = 100;   // more keys or items than this are skipped

        // Cut very long text and say so.
        function clip(text) {
            var s = String(text);
            return s.length > MAX_TEXT ? s.slice(0, MAX_TEXT) + '... (truncated)' : s;
        }

        // Turn any value into plain, cloneable data (handles cycles, DOM nodes, functions, symbols, BigInt).
        function describe(value, depth, seen) {
            try {
                if (value === undefined) return { type: 'undefined', value: 'undefined' };
                if (value === null) return { type: 'null', value: 'null' };
                var kind = typeof value;
                if (kind === 'string') return { type: 'string', value: clip(value) };
                if (kind === 'number' || kind === 'boolean') return { type: kind, value: String(value) };
                if (kind === 'bigint') return { type: 'bigint', value: String(value) + 'n' };
                if (kind === 'symbol') return { type: 'symbol', value: String(value) };
                if (kind === 'function') return { type: 'function', value: '[Function ' + (value.name || 'anonymous') + ']' };
                if (value instanceof Error) {
                    return {
                        type: 'error', name: String(value.name), message: clip(value.message),
                        value: clip(value.name + ': ' + value.message), stack: clip(value.stack || '')
                    };
                }
                if (value instanceof Date) return { type: 'date', value: value.toISOString() };
                if (typeof Node !== 'undefined' && value instanceof Node) {
                    return { type: 'dom', value: '<' + String(value.nodeName).toLowerCase() + (value.id ? ' id="' + value.id + '"' : '') + '>' };
                }
                if (seen.indexOf(value) !== -1) return { type: 'circular', value: '[Circular]' };
                if (depth >= MAX_DEPTH) return { type: 'truncated', value: Array.isArray(value) ? '[Array]' : '[Object]' };
                var nextSeen = seen.concat([value]);
                if (Array.isArray(value)) {
                    return {
                        type: 'array',
                        length: value.length,
                        items: value.slice(0, MAX_KEYS).map(function (item) { return describe(item, depth + 1, nextSeen); })
                    };
                }
                return {
                    type: 'object',
                    ctor: value.constructor && value.constructor.name ? value.constructor.name : 'Object',
                    entries: Object.keys(value).slice(0, MAX_KEYS).map(function (key) {
                        return { key: key, value: describe(value[key], depth + 1, nextSeen) };
                    })
                };
            } catch (err) {
                return { type: 'string', value: '[Unreadable value]' };
            }
        }

        // One line of text for a described value (strings are quoted when nested).
        function summary(item, nested) {
            if (item.type === 'string') return nested ? '"' + item.value + '"' : item.value;
            if (item.type === 'error') return item.value;
            if (item.type === 'array') {
                var parts = item.items.map(function (x) { return summary(x, true); });
                return '[' + parts.join(', ') + (item.length > parts.length ? ', ...' : '') + ']';
            }
            if (item.type === 'object') {
                return '{' + item.entries.map(function (en) { return en.key + ': ' + summary(en.value, true); }).join(', ') + '}';
            }
            return item.value;
        }

        // Post one record to the parent. Never throws.
        function send(level, kind, message, extra) {
            try {
                var record = {
                    source: 'owlet-preview', runId: runId, level: level, kind: kind,
                    message: clip(message), stack: '', file: '', line: 0, column: 0,
                    raw: '', time: new Date().toISOString(), args: []
                };
                Object.keys(extra || {}).forEach(function (key) { record[key] = extra[key]; });
                parent.postMessage(record, '*');
            } catch (err) {
                // the bridge must never break the user's page
            }
        }

        // Replace one console method. The wrapper is named owletWrapped so the
        // parent can skip the bridge's own frame when it reads the call site.
        function wrap(name, level) {
            var original = console[name];
            console[name] = function owletWrapped() {
                var args = Array.prototype.slice.call(arguments);
                var described = args.map(function (arg) { return describe(arg, 0, []); });
                var text = described.map(function (item) { return summary(item, false); }).join(' ');
                send(level, 'console', text, { args: described, stack: clip(new Error().stack || '') });
                if (mirror && original) original.apply(console, args);
            };
        }

        wrap('log', 'log');
        wrap('info', 'info');
        wrap('debug', 'info');
        wrap('warn', 'warn');
        wrap('error', 'error');
        wrap('table', 'log');
        wrap('trace', 'log');

        // console.assert: a failed assertion is reported as an error.
        var originalAssert = console.assert;
        console.assert = function owletWrapped() {
            var args = Array.prototype.slice.call(arguments);
            if (!args[0]) {
                var rest = args.slice(1).map(function (arg) { return summary(describe(arg, 0, []), false); }).join(' ');
                send('error', 'console', 'Assertion failed' + (rest ? ': ' + rest : ''), { stack: clip(new Error().stack || '') });
            }
            if (mirror && originalAssert) originalAssert.apply(console, args);
        };

        // console.clear inside the project clears the Owlet console panel.
        var originalClear = console.clear;
        console.clear = function owletWrapped() {
            send('clear', 'console', 'clear');
            if (mirror && originalClear) originalClear.apply(console, []);
        };

        // Runtime errors, syntax errors and failed resources (capture phase sees
        // <script>, <link> and <img> failures too).
        window.addEventListener('error', function (event) {
            try {
                var target = event.target;
                if (target && target !== window && target.tagName) {
                    var raw = target.getAttribute('src') || target.getAttribute('href') || '';
                    send('error', 'resource-error', 'Failed to load resource: ' + target.tagName.toLowerCase() + ' ' + raw, { raw: raw });
                    return;
                }
                var error = event.error;
                var isError = error instanceof Error;
                var message = isError ? error.name + ': ' + error.message : String(event.message || 'Script error.').replace(/^Uncaught /, '');
                send('error', error instanceof SyntaxError ? 'syntax-error' : 'runtime-error', message, {
                    stack: clip(isError ? (error.stack || '') : ''),
                    file: event.filename || '', line: event.lineno || 0, column: event.colno || 0
                });
                event.preventDefault();
            } catch (err) {
                // ignore
            }
        }, true);

        // Promises that fail without a catch.
        window.addEventListener('unhandledrejection', function (event) {
            try {
                var reason = event.reason;
                var text = reason instanceof Error ? reason.name + ': ' + reason.message : summary(describe(reason, 0, []), false);
                send('error', 'unhandled-rejection', 'Unhandled promise rejection: ' + text, {
                    stack: clip((reason && reason.stack) || ''), args: [describe(reason, 0, [])]
                });
                event.preventDefault();
            } catch (err) {
                // ignore
            }
        });
    }

    // The <script> tag that carries the bridge into the preview document.
    function bridgeTag(id, mirror) {
        return '<script>(' + owletBridge.toString() + ')(' + id + ', ' + (mirror ? 'true' : 'false') + ');</scr' + 'ipt>';
    }

    // Count the line breaks in a text.
    function countNewlines(text) {
        return (String(text).match(/\n/g) || []).length;
    }

    // Default page colours matching the app's resolved theme. Injected right
    // after the bridge <script> so user styles always override it.
    function themeBaseCss() {
        var dark = document.documentElement.getAttribute('data-theme') !== 'light';
        return 'html{background:' + (dark ? '#121419' : '#f8f9fc')
            + ';color:' + (dark ? '#e7e9ef' : '#14161d')
            + ';color-scheme:' + (dark ? 'dark' : 'light') + '}';
    }

    // Owlet's thin themed scrollbar for the preview page (the iframe document
    // can't see the app's own CSS). Appended LAST in <head> and marked
    // !important so a project's own scrollbar rules — e.g. white thumbs on a
    // dark page — can't stomp it. The scrollbar is preview chrome, not page
    // styling, so Owlet keeps control of it.
    function scrollbarCss() {
        var dark = document.documentElement.getAttribute('data-theme') !== 'light';
        // Unmistakably visible on arbitrary page colours. scrollbar-width /
        // scrollbar-color are deliberately NOT used: in Chrome they can make
        // the engine ignore ::-webkit-scrollbar rules entirely, which is why
        // the scrollbar vanished. Webkit rules alone give full control.
        var thumb = dark ? 'rgba(255,255,255,0.45)' : 'rgba(20,24,36,0.4)';
        var thumbHover = dark ? 'rgba(255,255,255,0.65)' : 'rgba(20,24,36,0.55)';
        return '::-webkit-scrollbar{width:12px!important;height:12px!important}'
            + '::-webkit-scrollbar-track{background:transparent!important}'
            + '::-webkit-scrollbar-thumb{background:' + thumb + '!important'
            + ';border-radius:999px!important;border:2px solid transparent!important;background-clip:padding-box!important}'
            + '::-webkit-scrollbar-thumb:hover{background:' + thumbHover + '!important;background-clip:padding-box!important}'
            + '::-webkit-scrollbar-corner{background:transparent!important}';
    }

    // Rewrite every local file reference inside a parsed HTML document:
    // src, href, srcset, inline style="..." attributes and <style> blocks.
    // Fragments (#section) on links survive the swap.
    function rewriteHtmlDoc(html, fromFile, urlMap) {
        var doc = new DOMParser().parseFromString(html, 'text/html');

        function swap(ref) {
            if (!ref) return ref;
            var resolved = resolveRef(fromFile, ref);
            if (!resolved || !urlMap[resolved]) return ref;
            var frag = ref.indexOf('#') !== -1 ? ref.slice(ref.indexOf('#')) : '';
            return urlMap[resolved] + frag;
        }

        doc.querySelectorAll('[src],[href]').forEach(function (el) {
            ['src', 'href'].forEach(function (attr) {
                var ref = el.getAttribute(attr);
                var next = swap(ref);
                if (next !== ref) el.setAttribute(attr, next);
            });
        });

        // srcset="small.png 1x, big.png 2x" — rewrite each candidate URL.
        doc.querySelectorAll('[srcset]').forEach(function (el) {
            var next = el.getAttribute('srcset').split(',').map(function (cand) {
                var parts = cand.trim().split(/\s+/);
                if (parts[0]) parts[0] = swap(parts[0]);
                return parts.join(' ');
            }).join(', ');
            el.setAttribute('srcset', next);
        });

        // Inline style="background:url(pic.png)" attributes.
        doc.querySelectorAll('[style]').forEach(function (el) {
            el.setAttribute('style', rewriteCssUrls(el.getAttribute('style'), fromFile, urlMap));
        });

        // <style> blocks may reference files too — rewrite their url().
        doc.querySelectorAll('style').forEach(function (el) {
            el.textContent = rewriteCssUrls(el.textContent, fromFile, urlMap);
        });

        return doc;
    }

    // Turn an HTML page into a runnable document: rewritten refs, the console
    // bridge as the FIRST <head> child, then the theme base (user styles still
    // win). Returns the markup plus how the bridge shifted the original lines.
    function finalizePage(html, fromFile, urlMap) {
        var doc = rewriteHtmlDoc(html, fromFile, urlMap);

        var tag = bridgeTag(runId, Owlet.settings.get('mirrorToDevTools') === true);
        var head = doc.head || doc.documentElement;
        var holder = doc.createElement('div');
        holder.innerHTML = tag;
        head.insertBefore(holder.firstChild, head.firstChild);

        var base = doc.createElement('style');
        base.setAttribute('data-owlet-theme-base', '');
        base.textContent = themeBaseCss();
        head.insertBefore(base, head.childNodes[1] || null);

        // Themed scrollbar goes LAST in <head>: it must beat the project's own
        // ::-webkit-scrollbar rules, not be overridden by them.
        var sb = doc.createElement('style');
        sb.setAttribute('data-owlet-scrollbar', '');
        sb.textContent = scrollbarCss();
        head.appendChild(sb);

        var out = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
        return {
            html: out,
            shift: {
                top: /^\s*<!doctype/i.test(html) ? 0 : 1,
                lines: countNewlines(tag),
                fromLine: countNewlines(out.slice(0, out.indexOf('<head>'))) + 1
            }
        };
    }

    // Build Blob URLs for every file, then rewrite the files that can carry
    // local refs (css, js, html) and blob them again. Steps:
    // 1) blob everything RAW first so urlMap is complete before any rewriting —
    //    a single pass only worked when refs happened to appear earlier in
    //    Object.keys order;
    // 2) rewrite css/js/html against the full map, re-blob, and repeat until
    //    stable so chained refs (css -> css -> image, page -> page -> asset)
    //    resolve too;
    // 3) the finalized entry document becomes the iframe srcdoc.
    function buildDocument(mode) {
        urlMode = mode === 'data' ? 'data' : 'blob';
        var files = Owlet.state.files;
        newUrls = [];
        blobPath = {};
        pageShift = {};

        var urlMap = {};
        Object.keys(files).forEach(function (path) {
            var url = makeBlob(files[path], mimeOf(path));
            urlMap[path] = url;
            blobPath[url] = path;
        });

        // Imported binary files (images, fonts, media) keep their bytes in
        // Owlet.importer as data: URIs — point refs straight at them.
        if (Owlet.importer && Owlet.importer.eachBinary) {
            Owlet.importer.eachBinary(function (path, dataUri) {
                urlMap[path] = dataUri;
            });
        }

        var transformed = {};
        for (var round = 0; round < 3; round++) {
            var changed = false;
            Object.keys(files).forEach(function (path) {
                var ext = extOf(path);
                var content = transformed[path] !== undefined ? transformed[path] : files[path];
                var next = content;
                if (ext === 'css') next = rewriteCssUrls(content, path, urlMap);
                else if (ext === 'js' || ext === 'mjs') next = rewriteJsImports(content, path, urlMap);
                else if (ext === 'html' || ext === 'htm') {
                    var page = finalizePage(files[path], path, urlMap);
                    next = page.html;
                    pageShift[path] = page.shift;
                } else {
                    return;
                }
                if (next !== content) {
                    transformed[path] = next;
                    URL.revokeObjectURL(urlMap[path]);
                    delete blobPath[urlMap[path]];
                    var url = makeBlob(next, mimeOf(path));
                    urlMap[path] = url;
                    blobPath[url] = path;
                    changed = true;
                }
            });
            if (!changed) break;
        }

        var entry = pickEntry();
        if (!entry) {
            return '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem">'
                + 'No .html file in this project yet.</body></html>';
        }

        // The entry document was already finalized in the rewrite pass — use it
        // as the srcdoc and keep its line shift for mapping srcdoc errors.
        bridgeShift = pageShift[entry] || { top: 0, lines: 0, fromLine: 0 };
        return transformed[entry];
    }

    // Render the project into the iframe. fresh=true for manual runs (Run, Refresh,
    // project load); fresh=false while typing, which must not clear the console.
    function render(fresh) {
        if (!iframe) return;
        runId += 1;
        if (Owlet.settings.get('debug') === true) {
            console.trace('[Owlet] preview run', runId, fresh ? 'fresh' : 'typing');
        }
        try {
            // 'data' mode inlines every resource as a data: URI — the same
            // build the pop-out uses. Blob subresources proved unreliable
            // inside the sandboxed iframe (CSS/JS silently failed to load,
            // leaving an unstyled page and "x is not defined" errors).
            iframe.srcdoc = buildDocument('data');
        } catch (e) {
            newUrls.forEach(function (u) { URL.revokeObjectURL(u); });
            newUrls = [];
            // Show the failure inside the frame — a silently blank preview
            // looks like nothing happened.
            iframe.srcdoc = '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;color:#888">'
                + '<h3 style="margin:0 0 .5rem">Preview failed to build</h3>'
                + String(e && e.message || e).replace(/</g, '&lt;')
                + '</body></html>';
            Owlet.ui && Owlet.ui.status('Preview error: ' + e.message);
            return;
        }
        // The new document is live — release the previous batch of Blob URLs.
        blobUrls.forEach(function (u) { URL.revokeObjectURL(u); });
        blobUrls = newUrls;
        newUrls = [];
        Owlet.state.emit('preview:run', { runId: runId, fresh: fresh });
    }

    // Full render (Run, Refresh, project load).
    function update() {
        render(true);
    }

    // Debounced render while typing — typing shouldn't thrash the iframe every keystroke.
    function scheduleUpdate() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () { render(false); }, 500);
    }

    // The run number of the only document allowed to report to Owlet.
    function currentRunId() {
        return runId;
    }

    // The project file the preview was built from (normally index.html).
    function entryFile() {
        return entryPath;
    }

    // Undo one page's bridge line shift on a reported line number.
    function shiftWith(shift, line) {
        if (!line) return 0;
        var s = line - shift.top;
        if (line > shift.fromLine) s -= shift.lines;
        return Math.max(1, s);
    }

    // Convert a line in the preview document back to a line in the user's file.
    function shiftLine(line) {
        return shiftWith(bridgeShift, line);
    }

    // Turn a script URL and position from an error into project file, line and column.
    function mapLocation(url, line, col) {
        var file = blobPath[url] || '';
        var loc = { file: file, line: line || 0, column: col || 0 };
        if (url === 'about:srcdoc') {
            loc.file = entryPath;
            loc.line = shiftLine(line);
        } else if (file && pageShift[file]) {
            loc.line = shiftWith(pageShift[file], line);
        } else if (!loc.file) {
            loc.file = url || '';
        }
        return loc;
    }

    // Replace blob and srcdoc addresses inside a stack trace with project names
    // and lines. "blob:...:LINE:COL" frames get the page's bridge shift undone.
    // Addresses are matched as plain text, never compiled into a RegExp: the live
    // preview uses data: addresses that can hold a whole file, and some engines
    // (Firefox) reject such a pattern. One fixed pattern parses the :line:col suffix.
    function mapText(text) {
        var out = String(text || '');
        var lineCol = /^:(\d+):(\d+)/;
        Object.keys(blobPath).forEach(function (url) {
            var path = blobPath[url];
            var parts = out.split(url);
            if (parts.length === 1) return;
            var next = parts[0];
            for (var i = 1; i < parts.length; i++) {
                var m = pageShift[path] ? lineCol.exec(parts[i]) : null;
                if (m) {
                    next += path + ':' + shiftWith(pageShift[path], Number(m[1])) + ':' + m[2] + parts[i].slice(m[0].length);
                } else {
                    next += path + parts[i];
                }
            }
            out = next;
        });
        out = out.replace(/about:srcdoc:(\d+):(\d+)/g, function (all, line, col) {
            return entryPath + ':' + shiftLine(Number(line)) + ':' + col;
        });
        return out.split('about:srcdoc').join(entryPath);
    }

    // Line and column of a text (for example an href) inside a project file.
    function locate(path, needle) {
        var text = Owlet.state.getFile(path);
        var at = needle ? text.indexOf(needle) : -1;
        if (at === -1) return { file: path, line: 0, column: 0 };
        var before = text.slice(0, at).split('\n');
        return { file: path, line: before.length, column: before[before.length - 1].length + 1 };
    }

    // A fully self-contained preview document: every resource is a data: URI,
    // so a popped-out window keeps its CSS/JS/images after this tab revokes
    // the live preview's Blob URLs. The live maps are restored afterwards —
    // they describe the iframe's current document, not this throwaway build.
    function standaloneHtml() {
        var savedNew = newUrls;
        var savedPath = blobPath;
        var savedShift = pageShift;
        var savedBridge = bridgeShift;
        var doc = '';
        try { doc = buildDocument('data'); } catch (e) { /* ignore */ }
        newUrls = savedNew;
        blobPath = savedPath;
        pageShift = savedShift;
        bridgeShift = savedBridge;
        urlMode = 'blob';
        return doc;
    }

    // Wire the refresh button (called once in init).
    function bindRefresh() {
        var btn = document.getElementById('btn-refresh-preview');
        if (btn) btn.addEventListener('click', update);
    }

    return {
        init: init,
        update: update,
        scheduleUpdate: scheduleUpdate,
        currentRunId: currentRunId,
        entryFile: entryFile,
        mapLocation: mapLocation,
        mapText: mapText,
        locate: locate,
        standaloneHtml: standaloneHtml
    };
})();

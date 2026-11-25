/* ==========================================================================
   docs.js — Owlet documentation site: CONFIG, router, renderer, sidebar,
   table of contents, theme, drawer and page footer wiring.
   All content comes from js/docs-data/*.js files which push page objects
   into window.OwletDocs.groups. Everything is rendered with createElement
   and textContent — no innerHTML with raw strings, so docs text can never
   inject markup.
   ========================================================================== */
'use strict';
window.OwletDocs = window.OwletDocs || { groups: [] };

/* ---------- CONFIG (edit these once) ---------- */
var CONFIG = {
    repoUrl: 'https://github.com/BrixoByte/Owlet',
    docsPath: 'docs',
    appUrl: '../index.html',
    landingUrl: '../landing/index.html',
    roadmapUrl: 'https://github.com/BrixoByte/Owlet/blob/main/project/roadmap.md',
    issuesUrl: 'https://github.com/BrixoByte/Owlet/issues/new',
    version: 'Latest',
    docsVersion: 'Latest',
    lastUpdated: '2025-11-24',
    siteTitle: 'Owlet Docs'
};

/* ---------- tiny DOM helpers ---------- */

// Query a single element.
function qs(sel, root) { return (root || document).querySelector(sel); }
// Query a list of elements as an array.
function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
// Create an element with a class and optional text content.
function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
}
// Announce a message to screen readers through the live region.
function announce(msg) {
    var live = qs('#a11y-live');
    if (live) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }
}
// Copy text to the clipboard with an execCommand fallback (file:// safe).
function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text); done(); });
    } else { legacyCopy(text); done(); }
}
// Fallback copy: a hidden textarea + execCommand('copy').
function legacyCopy(text) {
    var ta = el('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-999px;left:-999px;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* best effort */ }
    ta.remove();
}

/* ---------- inline content ----------
   Inline values are either a plain string or an array of segments:
   'text'  | {c:'code'} | {b:'bold'} | {i:'italic'} | {a:'text',href:'…'}
   | {kbd:'Ctrl+S'} | {br:true} | {badge:{kind:'planned',text:'Planned'}} */

// Render one inline segment into a parent element.
function addSegment(parent, seg) {
    if (typeof seg === 'string') { parent.appendChild(document.createTextNode(seg)); return; }
    if (!seg) return;
    if (seg.c !== undefined) { parent.appendChild(el('code', null, seg.c)); return; }
    if (seg.b !== undefined) { var s = el('strong'); addInline(s, seg.b); parent.appendChild(s); return; }
    if (seg.i !== undefined) { var it = el('em'); addInline(it, seg.i); parent.appendChild(it); return; }
    if (seg.kbd !== undefined) { parent.appendChild(el('kbd', null, seg.kbd)); return; }
    if (seg.br) { parent.appendChild(el('br')); return; }
    if (seg.badge) { parent.appendChild(makeBadge(seg.badge.kind, seg.badge.text)); return; }
    if (seg.a !== undefined) {
        var link = el('a');
        link.href = seg.href || '#';
        addInline(link, seg.a);
        if (/^https?:/.test(link.href)) { link.target = '_blank'; link.rel = 'noopener'; }
        parent.appendChild(link);
        return;
    }
}
// Append inline content (string or segment array) to a parent.
function addInline(parent, x) {
    if (x === undefined || x === null) return;
    if (Array.isArray(x)) { x.forEach(function (seg) { addSegment(parent, seg); }); return; }
    parent.appendChild(document.createTextNode(String(x)));
}

/* ---------- badges ---------- */

var BADGE_TEXT = { ok: 'Available', progress: 'In progress', planned: 'Planned', experimental: 'Experimental' };
// Build one status badge element.
function makeBadge(kind, text) {
    var b = el('span', 'badge badge--' + (kind || 'ok'), text || BADGE_TEXT[kind] || kind);
    return b;
}

/* ---------- heading slugs ---------- */
var usedSlugs = {};
// Turn heading text into a url-safe id, unique within the current page.
function slugify(text) {
    var base = String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
    var slug = base;
    var n = 2;
    while (usedSlugs[slug]) { slug = base + '-' + n; n++; }
    usedSlugs[slug] = true;
    return slug;
}

/* ---------- heading anchor (copy-link icon) ---------- */

// Add an id and a copy-link anchor to a rendered heading.
function decorateHeading(h, slug) {
    h.id = slug;
    var a = el('a', 'h-anchor');
    a.href = '#/' + currentRoute() + ':' + slug;
    a.setAttribute('aria-label', 'Copy link to this section');
    a.title = 'Copy link';
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a4 4 0 0 0 6 0l3-3a4 4 0 1 0-5.7-5.7l-1.6 1.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.4 10.6a4 4 0 0 0-6 0l-3 3a4 4 0 1 0 5.7 5.7l1.6-1.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    a.addEventListener('click', function (e) {
        e.preventDefault();
        var base = location.href.split('#')[0];
        var url = base + a.getAttribute('href');
        copyText(url, function () { announce('Link copied'); a.title = 'Copied!'; setTimeout(function () { a.title = 'Copy link'; }, 1200); });
    });
    h.appendChild(a);
}

/* ---------- block renderers ---------- */

var renderers = {
    // Paragraph.
    p: function (b, parent) { var p = el('p'); addInline(p, b.x); parent.appendChild(p); },
    // Subheadings with ids for the TOC.
    h2: function (b, parent) { var h = el('h2'); addInline(h, b.x); decorateHeading(h, b.id || slugify(b.x)); parent.appendChild(h); },
    h3: function (b, parent) { var h = el('h3'); addInline(h, b.x); decorateHeading(h, b.id || slugify(b.x)); parent.appendChild(h); },
    // Bulleted / numbered list.
    list: function (b, parent) {
        var list = el(b.style === 'ol' ? 'ol' : 'ul');
        (b.items || []).forEach(function (item) { var li = el('li'); addInline(li, item); list.appendChild(li); });
        parent.appendChild(list);
    },
    // Numbered steps with a connecting line.
    steps: function (b, parent) {
        var list = el('ol', 'steps unstyled');
        (b.items || []).forEach(function (item) {
            var li = el('li');
            if (item.title) li.appendChild(el('span', 'step-title', item.title));
            addInline(li, item.text || item.x);
            list.appendChild(li);
        });
        parent.appendChild(list);
    },
    // Callout box: note | tip | warning | danger | planned.
    callout: function (b, parent) {
        var kind = b.kind || 'note';
        var box = el('div', 'callout callout--' + kind);
        box.setAttribute('role', kind === 'danger' || kind === 'warning' ? 'alert' : 'note');
        var icon = el('span', 'callout-icon');
        icon.innerHTML = CALLOUT_ICONS[kind] || CALLOUT_ICONS.note;
        box.appendChild(icon);
        var body = el('div', 'callout-body');
        body.appendChild(el('span', 'callout-label', b.title || kind.charAt(0).toUpperCase() + kind.slice(1)));
        var p = el('p');
        addInline(p, b.x);
        body.appendChild(p);
        box.appendChild(body);
        parent.appendChild(box);
    },
    // Fenced code block, optionally tabbed.
    code: function (b, parent) { parent.appendChild(makeCodeBlock(b)); },
    // Responsive table inside a horizontal-scroll wrapper.
    table: function (b, parent) {
        var wrap = el('div', 'table-wrap');
        var table = el('table');
        if (b.caption) table.appendChild(el('caption', 'sr-only', b.caption));
        var thead = el('thead');
        var tr = el('tr');
        (b.head || []).forEach(function (h) { var th = el('th'); th.setAttribute('scope', 'col'); addInline(th, h); tr.appendChild(th); });
        thead.appendChild(tr);
        table.appendChild(thead);
        var tbody = el('tbody');
        (b.rows || []).forEach(function (row) {
            var r = el('tr');
            row.forEach(function (cell) { var td = el('td'); addInline(td, cell); r.appendChild(td); });
            tbody.appendChild(r);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);
        parent.appendChild(wrap);
    },
    // Figure with a fixed aspect-ratio box; gradient placeholder if missing.
    figure: function (b, parent) {
        var fig = el('figure', 'figure');
        var box = el('div', 'figure-box');
        box.style.aspectRatio = b.ratio || '16/9';
        var img = el('img');
        img.src = b.src;
        img.alt = b.alt || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', function () {
            img.remove();
            box.appendChild(el('span', 'figure-missing', 'Screenshot coming soon'));
        });
        box.appendChild(img);
        fig.appendChild(box);
        if (b.caption) fig.appendChild(el('figcaption', 'figure-caption', b.caption));
        parent.appendChild(fig);
    },
    // Row of status badges.
    'badge-list': function (b, parent) {
        var row = el('div', 'badge-list');
        (b.items || []).forEach(function (item) { row.appendChild(makeBadge(item.kind, item.text)); });
        parent.appendChild(row);
    },
    // Grid of small cards (links or plain).
    cards: function (b, parent) {
        var grid = el('div', 'card-grid');
        (b.items || []).forEach(function (item) {
            var card = item.href ? el('a', 'mini-card') : el('div', 'mini-card');
            if (item.href) card.href = item.href;
            card.appendChild(el('strong', null, item.title));
            var span = el('span');
            addInline(span, item.text);
            card.appendChild(span);
            grid.appendChild(card);
        });
        parent.appendChild(grid);
    },
    // Annotated file tree (monospace block with comment column).
    filetree: function (b, parent) {
        var pre = el('pre', 'filetree');
        (b.lines || []).forEach(function (line) {
            pre.appendChild(document.createTextNode(line.text));
            if (line.note) {
                var pad = Math.max(1, (b.gutter || 38) - line.text.length);
                pre.appendChild(document.createTextNode(' '.repeat(pad)));
                var note = el('span', 'ft-note', '# ' + line.note);
                pre.appendChild(note);
            }
            pre.appendChild(document.createTextNode('\n'));
        });
        parent.appendChild(pre);
    },
    // Keyboard shortcut table generated from the shared SHORTCUTS array.
    'shortcut-table': function (b, parent) {
        var list = (window.OwletDocs.SHORTCUTS || []);
        var data = list.map(function (s) { return { keys: s.keys, action: s.action, ctx: s.ctx || '' }; });
        var tableBlock = { head: ['Shortcut', 'Action', 'Where'], rows: [] };
        var filterBox = null;
        var tbodyRows = [];
        var wrap = el('div');
        if (b.filter) {
            filterBox = el('input');
            filterBox.type = 'search';
            filterBox.placeholder = 'Filter shortcuts…';
            filterBox.setAttribute('aria-label', 'Filter shortcuts');
            filterBox.style.cssText = 'width:100%;max-width:320px;min-height:40px;margin:0 0 12px;padding:0 14px;background:var(--surface-1);border:1px solid var(--line);border-radius:8px;color:var(--text-1);font:inherit;';
            wrap.appendChild(filterBox);
        }
        var tw = el('div', 'table-wrap');
        var table = el('table');
        table.appendChild(el('caption', 'sr-only', 'Keyboard shortcuts'));
        var thead = el('thead'); var trh = el('tr');
        tableBlock.head.forEach(function (h) { trh.appendChild(el('th', null, h)); });
        thead.appendChild(trh); table.appendChild(thead);
        var tbody = el('tbody');
        data.forEach(function (s) {
            var tr = el('tr');
            var td1 = el('td'); td1.appendChild(el('kbd', null, s.keys));
            var td2 = el('td', null, s.action);
            var td3 = el('td', null, s.ctx);
            tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
            tbody.appendChild(tr);
            tbodyRows.push({ tr: tr, hay: (s.keys + ' ' + s.action + ' ' + s.ctx).toLowerCase() });
        });
        table.appendChild(tbody);
        tw.appendChild(table);
        wrap.appendChild(tw);
        if (filterBox) {
            filterBox.addEventListener('input', function () {
                var q = filterBox.value.trim().toLowerCase();
                tbodyRows.forEach(function (r) { r.tr.hidden = q !== '' && r.hay.indexOf(q) === -1; });
            });
        }
        parent.appendChild(wrap);
    },
    // Design-token reference: name, live value, swatch, contrast vs canvas.
    'token-table': function (b, parent) {
        var style = getComputedStyle(document.documentElement);
        var canvas = style.getPropertyValue('--canvas').trim();
        var wrap = el('div', 'table-wrap');
        var table = el('table');
        var thead = el('thead'); var trh = el('tr');
        ['Token', 'Value', 'Swatch', 'Contrast on canvas'].forEach(function (h) { trh.appendChild(el('th', null, h)); });
        thead.appendChild(trh); table.appendChild(thead);
        var tbody = el('tbody');
        (b.items || []).forEach(function (tok) {
            var tr = el('tr');
            var name = el('td'); name.appendChild(el('code', null, tok.name));
            var value = style.getPropertyValue(tok.name).trim();
            var tdv = el('td'); tdv.appendChild(el('code', null, value || '—'));
            var tds = el('td');
            var sw = el('span');
            sw.style.cssText = 'display:inline-block;width:34px;height:20px;border-radius:5px;border:1px solid var(--line-strong);background:' + (value || 'transparent');
            tds.appendChild(sw);
            var tdc = el('td', null, contrastRatio(value, canvas) || '—');
            tr.appendChild(name); tr.appendChild(tdv); tr.appendChild(tds); tr.appendChild(tdc);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);
        parent.appendChild(wrap);
    }
};

/* ---------- callout icons ---------- */
var CALLOUT_ICONS = {
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v5" stroke-linecap="round"/></svg>',
    tip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.5 1 2.5h6c0-1 .2-1.8 1-2.5A6 6 0 0 0 12 3Z" stroke-linejoin="round"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4.5M12 17.5h.01" stroke-linecap="round"/></svg>',
    danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
    planned: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4M9 15.5l2 2 4-4" stroke-linejoin="round"/></svg>'
};

/* ---------- code blocks (copy, wrap, tabs, mini highlighter) ---------- */

// JS/JSON keywords for the mini highlighter.
var JS_WORDS = 'var let const function return if else for while do switch case break continue new typeof instanceof in of try catch finally throw class extends super this null undefined true false async await import export from default yield delete void'.split(' ');
var CSS_PROPS = 'display position margin padding border background color font width height min-width max-width min-height max-height flex grid gap top left right bottom inset z-index overflow content align-items justify-content text-align line-height letter-spacing transform transition animation opacity cursor pointer-events user-select box-shadow border-radius outline object-fit white-space'.split(' ');

// Escape a string for use inside a RegExp.
function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Turn source code into an array of {cls, text} tokens for safe span rendering.
function highlight(code, lang) {
    var tokens = [];
    var push = function (cls, text) { if (text) tokens.push({ cls: cls, text: text }); };
    var patterns = [];
    if (lang === 'js' || lang === 'javascript' || lang === 'json' || lang === 'ts') {
        patterns = [
            { re: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/, cls: 'tok-c' },
            { re: /('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)/, cls: 'tok-s' },
            { re: /\b(\d[\d_]*(\.\d+)?)\b/, cls: 'tok-n' },
            { re: new RegExp('\\b(' + JS_WORDS.join('|') + ')\\b'), cls: 'tok-k' }
        ];
    } else if (lang === 'css') {
        patterns = [
            { re: /(\/\*[\s\S]*?\*\/)/, cls: 'tok-c' },
            { re: /("[^"\n]*"|'[^'\n]*')/, cls: 'tok-s' },
            { re: /(#[0-9a-fA-F]{3,8}\b|\b\d+(\.\d+)?(px|em|rem|%|vh|vw|s|ms|fr|deg)\b)/, cls: 'tok-n' },
            { re: /(@[a-z-]+)/, cls: 'tok-k' },
            { re: /([a-z-]+)(?=\s*:)/, cls: 'tok-a' }
        ];
    } else if (lang === 'html' || lang === 'xml') {
        patterns = [
            { re: /(<!--[\s\S]*?-->)/, cls: 'tok-c' },
            { re: /("[^"\n]*"|'[^'\n]*')/, cls: 'tok-s' },
            { re: /(<\/?[a-zA-Z][\w-]*|\/?>|<!--|-->)/, cls: 'tok-t' },
            { re: /([a-zA-Z-]+)(?==)/, cls: 'tok-a' }
        ];
    } else if (lang === 'bash' || lang === 'sh' || lang === 'powershell' || lang === 'cmd') {
        patterns = [
            { re: /(#[^\n]*)/, cls: 'tok-c' },
            { re: /("[^"\n]*"|'[^'\n]*')/, cls: 'tok-s' },
            { re: /(\$[A-Za-z_][\w]*|\b\d+\b)/, cls: 'tok-n' }
        ];
    } else if (lang === 'python' || lang === 'py') {
        patterns = [
            { re: /(#[^\n]*)/, cls: 'tok-c' },
            { re: /('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")/, cls: 'tok-s' },
            { re: /\b(\d[\d_]*(\.\d+)?)\b/, cls: 'tok-n' },
            { re: /\b(def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|try|except|finally|raise|with|lambda|None|True|False|print|pass|break|continue|global|is)\b/, cls: 'tok-k' }
        ];
    }
    // Walk the source: first matching pattern wins at the earliest position.
    var rest = code;
    while (rest.length) {
        var best = null;
        patterns.forEach(function (p) {
            var m = p.re.exec(rest);
            if (m && (best === null || m.index < best.index)) best = { m: m, cls: p.cls, index: m.index };
        });
        if (!best) { push(null, rest); break; }
        push(null, rest.slice(0, best.index));
        push(best.cls, best.m[0]);
        rest = rest.slice(best.index + best.m[0].length);
    }
    return tokens;
}

// Fill a <code> element with highlighted token spans.
function renderCode(elCode, code, lang) {
    highlight(code, lang).forEach(function (tok) {
        if (tok.cls) elCode.appendChild(el('span', tok.cls, tok.text));
        else elCode.appendChild(document.createTextNode(tok.text));
    });
}

// Build a full code block: header (tabs/lang label + wrap + copy) and <pre>.
function makeCodeBlock(b) {
    var box = el('div', 'codeblock');
    var head = el('div', 'codeblock-head');
    var tabs = b.tabs || [{ label: b.lang || 'code', lang: b.lang, code: b.code }];
    var pre = el('pre');
    var codeEl = el('code');
    pre.appendChild(codeEl);

    // Render the given tab's code into the <pre>.
    var activeIdx = 0;
    var showTab = function (i) {
        activeIdx = i;
        codeEl.textContent = '';
        renderCode(codeEl, tabs[i].code, tabs[i].lang);
        tabBtns.forEach(function (btn, j) { btn.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
    };

    var tabBtns = [];
    if (tabs.length > 1) {
        var tabWrap = el('div', 'codeblock-tabs');
        tabWrap.setAttribute('role', 'tablist');
        tabs.forEach(function (t, i) {
            var btn = el('button', 'codeblock-tab', t.label);
            btn.type = 'button';
            btn.setAttribute('role', 'tab');
            btn.addEventListener('click', function () {
                showTab(i);
                if (b.remember) try { localStorage.setItem('owlet-docs:codetab:' + b.remember, String(i)); } catch (e) {}
            });
            tabWrap.appendChild(btn);
            tabBtns.push(btn);
        });
        head.appendChild(tabWrap);
    } else {
        head.appendChild(el('span', 'codeblock-lang', tabs[0].label || tabs[0].lang || 'code'));
    }

    var actions = el('div', 'codeblock-actions');
    // Wrap toggle.
    var wrapBtn = el('button', 'codeblock-btn', 'Wrap');
    wrapBtn.type = 'button';
    wrapBtn.setAttribute('aria-pressed', 'false');
    wrapBtn.addEventListener('click', function () {
        var on = box.classList.toggle('is-wrap');
        wrapBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    actions.appendChild(wrapBtn);
    // Copy button with feedback.
    var copyBtn = el('button', 'codeblock-btn', 'Copy');
    copyBtn.type = 'button';
    copyBtn.addEventListener('click', function () {
        copyText(tabs[activeIdx].code, function () {
            copyBtn.textContent = 'Copied';
            copyBtn.classList.add('is-done');
            setTimeout(function () { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('is-done'); }, 1500);
        });
    });
    actions.appendChild(copyBtn);
    head.appendChild(actions);

    box.appendChild(head);
    box.appendChild(pre);

    // Restore a remembered tab choice.
    if (b.remember) {
        try {
            var saved = parseInt(localStorage.getItem('owlet-docs:codetab:' + b.remember) || '0', 10);
            if (saved > 0 && saved < tabs.length) activeIdx = saved;
        } catch (e) {}
    }
    showTab(activeIdx);
    return box;
}

/* ---------- colour contrast (for the token table) ---------- */

// Parse a colour string to [r,g,b] (hex or rgb()).
function parseColor(str) {
    if (!str) return null;
    var s = str.trim();
    var m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (m) {
        var h = m[1];
        if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    var r = s.match(/^rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
    if (r) return [Number(r[1]), Number(r[2]), Number(r[3])];
    return null;
}
// Relative luminance per WCAG.
function luminance(rgb) {
    var f = function (c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}
// WCAG contrast ratio between two colour strings, or null.
function contrastRatio(a, b) {
    var ca = parseColor(a), cb = parseColor(b);
    if (!ca || !cb) return null;
    var l1 = luminance(ca), l2 = luminance(cb);
    var ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    return ratio.toFixed(1) + ':1';
}

/* ---------- registry helpers ---------- */

// Flatten all groups into a single ordered page list.
function allPages() {
    var out = [];
    window.OwletDocs.groups.forEach(function (g) {
        (g.pages || []).forEach(function (p) { if (!p.hidden) out.push({ page: p, group: g }); });
    });
    return out;
}
// Find a page by its route ("group/slug").
function findPage(route) {
    var found = null;
    window.OwletDocs.groups.forEach(function (g) {
        (g.pages || []).forEach(function (p) {
            if (p.id === route) found = { page: p, group: g };
        });
    });
    return found;
}
// The current route part of the hash (no leading '#', no ':anchor').
function currentRoute() {
    var h = location.hash.replace(/^#\/?/, '');
    return h.split(':')[0] || '';
}
// The heading anchor part of the hash, if present.
function currentAnchor() {
    var h = location.hash.replace(/^#\/?/, '');
    var i = h.indexOf(':');
    return i === -1 ? '' : h.slice(i + 1);
}

/* ---------- sidebar ---------- */

// Build the collapsible sidebar navigation once at boot.
function buildSidebar() {
    var host = qs('#sidebar-groups');
    if (!host) return;
    host.textContent = '';
    var collapsed = {};
    try { collapsed = JSON.parse(localStorage.getItem('owlet-docs:nav') || '{}'); } catch (e) {}
    window.OwletDocs.groups.forEach(function (g) {
        var section = el('section', 'side-group');
        var isOpen = collapsed[g.id] !== true;
        var btn = el('button', 'side-group-title', g.title);
        btn.type = 'button';
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        var chev = el('span', 'chev');
        chev.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="m8 5 8 7-8 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        btn.appendChild(chev);
        var list = el('ul', 'side-links');
        list.hidden = !isOpen;
        btn.addEventListener('click', function () {
            var open = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', open ? 'false' : 'true');
            list.hidden = open;
            try {
                var c = JSON.parse(localStorage.getItem('owlet-docs:nav') || '{}');
                c[g.id] = open;
                localStorage.setItem('owlet-docs:nav', JSON.stringify(c));
            } catch (e) {}
        });
        (g.pages || []).forEach(function (p) {
            if (p.hidden) return;
            var li = el('li');
            var a = el('a', null, p.title);
            a.href = '#/' + p.id;
            a.dataset.route = p.id;
            if (p.badge) a.appendChild(makeBadge(p.badge));
            li.appendChild(a);
            list.appendChild(li);
        });
        section.appendChild(btn);
        section.appendChild(list);
        host.appendChild(section);
    });
}
// Highlight the active route in the sidebar.
function markSidebar(route) {
    qsa('.side-links a').forEach(function (a) {
        if (a.dataset.route === route) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
    });
}

/* ---------- table of contents + scroll-spy ---------- */
var tocObserver = null;

// Rebuild both TOCs from the rendered headings and start the scroll-spy.
function buildToc() {
    var desktop = qs('#toc-list');
    var mobile = qs('#toc-mobile-list');
    var mobileBox = qs('#toc-mobile');
    [desktop, mobile].forEach(function (ul) { if (ul) ul.textContent = ''; });
    var headings = qsa('#doc-content h2, #doc-content h3');
    if (mobileBox) mobileBox.hidden = headings.length === 0;
    headings.forEach(function (h) {
        var li = el('li', h.tagName === 'H3' ? 'toc-l3' : 'toc-l2');
        var a = el('a', null, h.textContent);
        a.href = '#/' + currentRoute() + ':' + h.id;
        li.appendChild(a);
        if (desktop) desktop.appendChild(li);
        if (mobile) mobile.appendChild(li.cloneNode(true));
    });
    if (tocObserver) tocObserver.disconnect();
    var links = {};
    qsa('#toc-list a, #toc-mobile-list a').forEach(function (a) {
        var id = a.getAttribute('href').split(':')[1];
        (links[id] = links[id] || []).push(a);
    });
    tocObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            qsa('.toc-list a').forEach(function (a) { a.classList.remove('is-active'); });
            (links[entry.target.id] || []).forEach(function (a) { a.classList.add('is-active'); });
        });
    }, { rootMargin: '-80px 0px -70% 0px' });
    headings.forEach(function (h) { tocObserver.observe(h); });
}

/* ---------- page footer (edit, helpful, prev/next) ---------- */

// Wire the edit link, last-updated, feedback thumbs and prev/next cards.
function buildPageFooter(entry) {
    var footer = qs('#doc-footer');
    if (!footer) return;
    footer.hidden = false;
    var p = entry.page;
    // "Edit this page" points at the data file on GitHub.
    var file = p.file || (entry.group.file || 'getting-started.js');
    qs('#edit-link').href = CONFIG.repoUrl + '/edit/main/' + CONFIG.docsPath + '/js/docs-data/' + file;
    var updated = p.updated || CONFIG.lastUpdated;
    qs('#last-updated').textContent = 'Last updated ' + updated;
    // Helpfulness thumbs: both open a prefilled GitHub issue (no tracking).
    var feedback = function (happy) {
        var title = 'Docs feedback: ' + p.title;
        var body = 'Page: ' + location.href + '\n\nRating: ' + (happy ? 'helpful' : 'not helpful') + '\n\nFeedback:\n';
        window.open(CONFIG.issuesUrl + '?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body), '_blank', 'noopener');
    };
    qs('#thumb-yes').onclick = function () { feedback(true); };
    qs('#thumb-no').onclick = function () { feedback(false); };
    // Previous / next in flattened nav order.
    var flat = allPages();
    var idx = flat.findIndex(function (e) { return e.page.id === p.id; });
    var prev = qs('#prev-page'), next = qs('#next-page');
    if (idx > 0) {
        prev.hidden = false;
        prev.href = '#/' + flat[idx - 1].page.id;
        qs('.prevnext-title', prev).textContent = flat[idx - 1].page.title;
    } else prev.hidden = true;
    if (idx !== -1 && idx < flat.length - 1) {
        next.hidden = false;
        next.href = '#/' + flat[idx + 1].page.id;
        qs('.prevnext-title', next).textContent = flat[idx + 1].page.title;
    } else next.hidden = true;
}

/* ---------- page rendering ---------- */

// Render one page object into the article element.
function renderPage(entry) {
    usedSlugs = {};
    var p = entry.page;
    var article = qs('#doc-content');
    article.textContent = '';
    // Kicker: the group name.
    article.appendChild(el('p', 'doc-kicker', entry.group.title));
    // h1 (focus target on route change).
    var h1 = el('h1', null, p.title);
    h1.id = 'doc-title';
    h1.tabIndex = -1;
    article.appendChild(h1);
    // Status badge row when the page describes an unfinished feature.
    if (p.badge) {
        var row = el('div', 'badge-list');
        row.appendChild(makeBadge(p.badge));
        if (p.badgeNote) {
            var note = el('span', null, p.badgeNote);
            note.style.cssText = 'font-size:var(--fs-sm);color:var(--text-3);align-self:center;';
            row.appendChild(note);
        }
        article.appendChild(row);
    }
    // Lede paragraph (also the meta description).
    if (p.description) {
        var lede = el('p', 'doc-lede');
        addInline(lede, p.description);
        article.appendChild(lede);
    }
    (p.blocks || []).forEach(function (block) {
        var fn = renderers[block.t];
        if (fn) fn(block, article);
    });
    document.title = p.title + ' · ' + CONFIG.siteTitle;
    var desc = qs('meta[name="description"]');
    if (desc && p.description) desc.setAttribute('content', typeof p.description === 'string' ? p.description : p.title + ' — Owlet documentation.');
}

// Render the 404 page for unknown routes.
function render404(route) {
    var article = qs('#doc-content');
    article.textContent = '';
    var box = el('div', 'doc-404');
    box.appendChild(el('p', 'big', '404'));
    var h1 = el('h1', null, 'Page not found');
    h1.id = 'doc-title';
    h1.tabIndex = -1;
    box.appendChild(h1);
    box.appendChild(el('p', null, 'There is no docs page at "#/' + route + '". It may have moved. Try one of these:'));
    var grid = el('div', 'card-grid');
    allPages().slice(0, 4).forEach(function (e) {
        var card = el('a', 'mini-card');
        card.href = '#/' + e.page.id;
        card.appendChild(el('strong', null, e.page.title));
        card.appendChild(el('span', null, e.group.title));
        grid.appendChild(card);
    });
    box.appendChild(grid);
    article.appendChild(box);
    document.title = 'Page not found · ' + CONFIG.siteTitle;
    qs('#doc-footer').hidden = true;
    qs('#toc-mobile').hidden = true;
    qsa('#toc-list, #toc-mobile-list').forEach(function (ul) { ul.textContent = ''; });
    if (tocObserver) { tocObserver.disconnect(); tocObserver = null; }
    h1.focus();
    announce('Page not found');
}

/* ---------- router ---------- */

// Handle a hash change (or the first load): find the page, render, scroll, focus.
function route() {
    var routeId = currentRoute();
    var anchor = currentAnchor();
    var entry = findPage(routeId);
    if (!entry) {
        // Empty route lands on the first page; unknown routes get the 404.
        if (!routeId) {
            var first = allPages()[0];
            if (first) { location.replace('#/' + first.page.id); return; }
        }
        render404(routeId);
        markSidebar('');
        return;
    }
    closeDrawer();
    renderPage(entry);
    buildPageFooter(entry);
    buildToc();
    markSidebar(entry.page.id);
    // Scroll: to the heading anchor, else the top of the article.
    if (anchor && document.getElementById(anchor)) {
        document.getElementById(anchor).scrollIntoView({ block: 'start' });
    } else {
        window.scrollTo(0, 0);
    }
    var h1 = qs('#doc-title');
    if (h1) { h1.focus({ preventScroll: true }); }
    announce(entry.page.title + ' loaded');
}

/* ---------- theme toggle ---------- */

// Read the saved UI prefs shared with the app (owlet:ui:prefs).
function readPrefs() {
    try { return JSON.parse(localStorage.getItem('owlet:ui:prefs') || '{}'); }
    catch (e) { return {}; }
}
// Apply 'dark' or 'light' to <html data-theme> and update the button.
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = qs('#btn-theme');
    if (btn) btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
}
// Toggle between dark and light, persisting into owlet:ui:prefs.
function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    var next = cur === 'light' ? 'dark' : 'light';
    var prefs = readPrefs();
    prefs.theme = next;
    try { localStorage.setItem('owlet:ui:prefs', JSON.stringify(prefs)); } catch (e) {}
    applyTheme(next);
}

/* ---------- mobile drawer ---------- */

// Open or close the sidebar drawer on small screens.
function setDrawer(open) {
    var side = qs('#docs-sidebar');
    var scrim = qs('#drawer-scrim');
    var btn = qs('#btn-drawer');
    if (!side) return;
    side.classList.toggle('is-open', open);
    if (scrim) scrim.hidden = !open;
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
        var first = qs('.side-links a', side);
        if (first) first.focus();
    } else if (btn) {
        btn.focus();
    }
}
// Close the drawer if it is open.
function closeDrawer() {
    var side = qs('#docs-sidebar');
    if (side && side.classList.contains('is-open')) setDrawer(false);
}

/* ---------- boot ---------- */

// Wire the static controls and start the router.
function boot() {
    // Static links from CONFIG.
    qs('#nav-github').href = CONFIG.repoUrl;
    qs('#foot-repo').href = CONFIG.repoUrl;
    qs('#nav-roadmap').href = CONFIG.roadmapUrl;
    qs('#btn-open-app').href = CONFIG.appUrl;
    qs('#version-pill').textContent = 'Docs for Owlet · ' + CONFIG.docsVersion;
    // Theme.
    var prefs = readPrefs();
    var theme = prefs.theme;
    if (theme !== 'dark' && theme !== 'light') {
        theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    applyTheme(theme);
    qs('#btn-theme').addEventListener('click', toggleTheme);
    // Drawer.
    qs('#btn-drawer').addEventListener('click', function () { setDrawer(true); });
    qs('#drawer-scrim').addEventListener('click', function () { setDrawer(false); });
    // Global keys: Ctrl+K or '/' opens search, Esc closes drawer/dialogs.
    document.addEventListener('keydown', function (e) {
        var t = e.target;
        var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (window.OwletDocsSearch) window.OwletDocsSearch.open();
        } else if (e.key === '/' && !typing) {
            e.preventDefault();
            if (window.OwletDocsSearch) window.OwletDocsSearch.open();
        } else if (e.key === 'Escape') {
            closeDrawer();
        }
    });
    // Back to top.
    var btt = qs('#back-to-top');
    if (btt) btt.addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    // Sidebar + router.
    buildSidebar();
    window.addEventListener('hashchange', route);
    route();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

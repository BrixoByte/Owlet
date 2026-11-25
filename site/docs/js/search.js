/* ==========================================================================
   search.js — client-side search over the OwletDocs registry.
   The index is built lazily from the same page objects the renderer uses,
   so it can never drift from the content. No libraries; results render
   with createElement/textContent like everything else.
   ========================================================================== */
'use strict';
window.OwletDocsSearch = (function () {

    var RECENTS_KEY = 'owlet-docs:recents';
    var MAX_RESULTS = 12;
    var index = null;          // built on first open
    var activeIdx = -1;        // highlighted result row
    var lastQuery = '';

    /* ---------- index building ---------- */

    // Flatten an inline value (string or segment array) to plain text.
    function flatInline(x) {
        if (x === undefined || x === null) return '';
        if (typeof x === 'string') return x;
        if (Array.isArray(x)) return x.map(flatInline).join(' ');
        return x.c || x.b || x.i || x.a || x.kbd || (x.badge && x.badge.text) || '';
    }

    // Extract searchable text from one block.
    function flatBlock(b) {
        if (!b) return '';
        var parts = [flatInline(b.x), flatInline(b.title)];
        (b.items || []).forEach(function (item) {
            parts.push(flatInline(item));
            if (item && item.title) parts.push(flatInline(item.title));
            if (item && item.text) parts.push(flatInline(item.text));
        });
        (b.head || []).forEach(function (h) { parts.push(flatInline(h)); });
        (b.rows || []).forEach(function (row) { row.forEach(function (c) { parts.push(flatInline(c)); }); });
        if (b.code) parts.push(b.code);
        (b.tabs || []).forEach(function (t) { parts.push(t.code || ''); });
        (b.lines || []).forEach(function (l) { parts.push(l.text + ' ' + (l.note || '')); });
        return parts.join(' ');
    }

    // Build the index once: one entry per heading-level section + the page.
    function buildIndex() {
        index = [];
        (window.OwletDocs.groups || []).forEach(function (g) {
            (g.pages || []).forEach(function (p) {
                if (p.hidden) return;
                var crumbs = g.title + ' › ' + p.title;
                // The page itself.
                index.push({
                    route: p.id, anchor: '', title: p.title, crumb: crumbs,
                    text: (p.title + ' ' + flatInline(p.description) + ' ' + (p.blocks || []).map(flatBlock).join(' ')).toLowerCase(),
                    weight: 2
                });
                // Each h2/h3 becomes its own deep-linkable entry.
                (p.blocks || []).forEach(function (b) {
                    if (b.t !== 'h2' && b.t !== 'h3') return;
                    var slug = String(b.x).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    index.push({
                        route: p.id, anchor: slug, title: flatInline(b.x), crumb: crumbs,
                        text: (flatInline(b.x) + ' ' + p.title).toLowerCase(),
                        weight: 1
                    });
                });
            });
        });
    }

    /* ---------- scoring ---------- */

    // Score an index entry against a query: exact title hit beats body match.
    function score(entry, q) {
        var t = entry.text;
        if (entry.title.toLowerCase() === q) return 100 * entry.weight;
        if (entry.title.toLowerCase().indexOf(q) !== -1) return 60 * entry.weight;
        var words = q.split(/\s+/).filter(Boolean);
        var hits = 0;
        words.forEach(function (w) { if (t.indexOf(w) !== -1) hits++; });
        if (hits === 0) return 0;
        return (10 + hits * 10) * entry.weight;
    }

    // Snippet: the ~140 chars around the first query-word hit.
    function snippet(entry, q) {
        var words = q.split(/\s+/).filter(Boolean);
        var t = entry.text;
        var pos = -1;
        for (var i = 0; i < words.length; i++) {
            var p = t.indexOf(words[i]);
            if (p !== -1 && (pos === -1 || p < pos)) pos = p;
        }
        if (pos === -1) return '';
        var start = Math.max(0, pos - 60);
        return (start > 0 ? '…' : '') + t.slice(start, start + 140) + '…';
    }

    /* ---------- results rendering ---------- */

    function q(sel) { return document.querySelector(sel); }

    // Highlight query words inside a text node → mark elements.
    function highlightInto(el, text, words) {
        var lower = text.toLowerCase();
        var i = 0;
        while (i < text.length) {
            var earliest = -1, hit = '';
            words.forEach(function (w) {
                var p = lower.indexOf(w, i);
                if (p !== -1 && (earliest === -1 || p < earliest)) { earliest = p; hit = w; }
            });
            if (earliest === -1) { el.appendChild(document.createTextNode(text.slice(i))); break; }
            if (earliest > i) el.appendChild(document.createTextNode(text.slice(i, earliest)));
            var mark = document.createElement('mark');
            mark.textContent = text.slice(earliest, earliest + hit.length);
            el.appendChild(mark);
            i = earliest + hit.length;
        }
    }

    // Render the result list for the current input value.
    function renderResults() {
        var input = q('#search-input');
        var list = q('#search-results');
        if (!input || !list) return;
        var qy = input.value.trim().toLowerCase();
        list.textContent = '';
        activeIdx = -1;
        if (!qy) { renderRecents(list); return; }
        var words = qy.split(/\s+/).filter(Boolean);
        var scored = index.map(function (e) { return { e: e, s: score(e, qy) }; })
            .filter(function (r) { return r.s > 0; })
            .sort(function (a, b) { return b.s - a.s; })
            .slice(0, MAX_RESULTS);
        if (!scored.length) {
            var empty = document.createElement('li');
            empty.className = 'search-empty';
            empty.textContent = 'No results for “' + input.value.trim() + '”.';
            list.appendChild(empty);
            return;
        }
        scored.forEach(function (r, i) {
            var li = document.createElement('li');
            li.setAttribute('role', 'option');
            li.id = 'sr-' + i;
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'search-result';
            var title = document.createElement('span');
            title.className = 'search-result-title';
            highlightInto(title, r.e.title, words);
            btn.appendChild(title);
            var crumb = document.createElement('span');
            crumb.className = 'search-result-crumb';
            crumb.textContent = r.e.crumb;
            btn.appendChild(crumb);
            var snip = snippet(r.e, qy);
            if (snip) {
                var s = document.createElement('span');
                s.className = 'search-result-snip';
                highlightInto(s, snip, words);
                btn.appendChild(s);
            }
            btn.addEventListener('click', function () { go(r.e); });
            li.appendChild(btn);
            list.appendChild(li);
        });
        input.setAttribute('aria-expanded', 'true');
    }

    // Show recent successful queries when the input is empty.
    function renderRecents(list) {
        var recents = [];
        try { recents = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]'); } catch (e) {}
        if (!recents.length) {
            var hint = document.createElement('li');
            hint.className = 'search-empty';
            hint.textContent = 'Type to search ' + (index ? index.length : 0) + ' sections.';
            list.appendChild(hint);
            return;
        }
        recents.slice(0, 5).forEach(function (text) {
            var li = document.createElement('li');
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'search-result';
            var span = document.createElement('span');
            span.className = 'search-result-title';
            span.textContent = text;
            btn.appendChild(span);
            var sub = document.createElement('span');
            sub.className = 'search-result-crumb';
            sub.textContent = 'Recent search';
            btn.appendChild(sub);
            btn.addEventListener('click', function () {
                var input = q('#search-input');
                input.value = text;
                renderResults();
            });
            li.appendChild(btn);
            list.appendChild(li);
        });
    }

    // Remember a query that produced a click.
    function remember(qy) {
        try {
            var recents = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
            recents = recents.filter(function (r) { return r !== qy; });
            recents.unshift(qy);
            localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, 5)));
        } catch (e) {}
    }

    /* ---------- navigation ---------- */

    // Navigate to an index entry and close the dialog.
    function go(entry) {
        var href = '#/' + entry.route + (entry.anchor ? ':' + entry.anchor : '');
        close();
        if (lastQuery) remember(lastQuery);
        location.hash = href;
    }

    // Arrow-key navigation inside the result list.
    function move(delta) {
        var items = Array.prototype.slice.call(document.querySelectorAll('#search-results li'));
        var selectable = items.filter(function (li) { return li.querySelector('.search-result'); });
        if (!selectable.length) return;
        activeIdx += delta;
        if (activeIdx < 0) activeIdx = selectable.length - 1;
        if (activeIdx >= selectable.length) activeIdx = 0;
        selectable.forEach(function (li, i) {
            li.classList.toggle('is-active', i === activeIdx);
            li.setAttribute('aria-selected', i === activeIdx ? 'true' : 'false');
        });
        var active = selectable[activeIdx];
        if (active) {
            var input = q('#search-input');
            input.setAttribute('aria-activedescendant', active.id || '');
            active.scrollIntoView({ block: 'nearest' });
        }
    }

    /* ---------- open / close ---------- */

    function open() {
        var dlg = q('#search-dialog');
        var input = q('#search-input');
        if (!dlg || !input) return;
        if (!index) buildIndex();
        dlg.hidden = false;
        input.value = '';
        lastQuery = '';
        renderResults();
        setTimeout(function () { input.focus(); }, 10);
    }

    function close() {
        var dlg = q('#search-dialog');
        if (!dlg) return;
        dlg.hidden = true;
        var trigger = q('#search-trigger');
        if (trigger) trigger.focus();
    }

    // Wire the dialog once at boot.
    function init() {
        var dlg = q('#search-dialog');
        var input = q('#search-input');
        var trigger = q('#search-trigger');
        if (!dlg || !input) return;

        if (trigger) trigger.addEventListener('click', open);
        // Click outside the box closes it.
        dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
        input.addEventListener('input', function () {
            lastQuery = input.value.trim();
            renderResults();
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
            else if (e.key === 'Enter') {
                e.preventDefault();
                var active = document.querySelector('#search-results li.is-active .search-result')
                    || document.querySelector('#search-results li .search-result');
                if (active) active.click();
            }
            else if (e.key === 'Escape') { e.preventDefault(); close(); }
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !dlg.hidden) close();
        });
        // Rebuild the index if docs data ever loads late.
        window.addEventListener('hashchange', function () { /* routes already indexed by id */ });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    return { open: open };
})();

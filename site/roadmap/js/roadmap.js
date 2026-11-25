/* ==========================================================================
   roadmap.js — renders the public Owlet roadmap from window.OwletRoadmap.
   Sections, in file order:
     1. CONFIG + helpers          4. Board view          7. Dependency map
     2. Status metadata + icons   5. Timeline view       8. Help / principles /
     3. State + URL/localStorage  6. Flat list view         changelog / decide
     9. Export + GitHub issue state   10. Theme + boot
   All content renders with createElement/textContent — never innerHTML with
   data strings (icons are the only exception and they are fixed constants).
   ========================================================================== */
'use strict';

/* ---------- 1. CONFIG + helpers ---------- */

var CONFIG = {
    repoUrl: 'https://github.com/BrixoByte/Owlet',
    issuesUrl: 'https://github.com/BrixoByte/Owlet/issues',
    newIssueUrl: 'https://github.com/BrixoByte/Owlet/issues/new',
    discussionsUrl: 'https://github.com/BrixoByte/Owlet/discussions',
    storageKey: 'owlet-roadmap:filters',
    issueCacheKey: 'owlet-roadmap:issue:',
    issueCacheMs: 60 * 60 * 1000 // 1 hour
};

var DATA = window.OwletRoadmap || { updated: '', principles: [], phases: [], changelog: [] };
var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
// Create an SVG element with a fixed icon path (icons are constants, not data).
function svgIcon(paths, cls) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    if (cls) svg.setAttribute('class', cls);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = paths;
    return svg;
}
// Announce a message to screen readers.
function announce(msg) {
    var live = qs('#a11y-live');
    if (live) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }
}
// Copy text to the clipboard with an execCommand fallback (file:// safe).
function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { done(); });
    } else {
        var ta = el('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:-999px;left:-999px;';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* best effort */ }
        ta.remove();
        done();
    }
}

/* ---------- 2. Status metadata + icons ---------- */

var STATUS = {
    'done': {
        label: 'Done',
        icon: '<path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    'in-progress': {
        label: 'In progress',
        icon: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
    },
    'planned': {
        label: 'Planned',
        icon: '<rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 10h16" stroke="currentColor" stroke-width="2"/>'
    },
    'exploring': {
        label: 'Exploring',
        icon: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"/><path d="M9.5 12a2.5 2.5 0 0 1 5 0c0 1.5-2.5 1.5-2.5 3M12 18h.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
    }
};

var CHEV = '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
var LINK_ICON = '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
var HAND_ICON = '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-6.5a1.5 1.5 0 0 1 3 0V11m0-5a1.5 1.5 0 0 1 3 0v7m0-3a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-2a7 7 0 0 1-5-2l-3.5-4.2c-.8-1-.5-2.3.6-2.9.8-.4 1.8-.2 2.4.5L8 13z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';
var LEAF_ICON = '<path d="M12 21c-4 0-8-4-8-9 0-6 5-9 14-9 0 0 2 18-6 18zM8 16c2-4 6-6 10-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
var LOCK_ICON = '<rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.8"/>';
var WIFI_OFF_ICON = '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a11 11 0 0 1 14 0M8.5 16a7 7 0 0 1 7 0M12 20h.01M3 3l18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';

// Build a status badge: icon + text (never colour alone).
function statusBadge(status, big) {
    var meta = STATUS[status] || STATUS.planned;
    var b = el('span', 'status-badge st-' + status);
    if (big) b.classList.add('status-badge-lg');
    b.appendChild(svgIcon(meta.icon));
    b.appendChild(el('span', null, meta.label));
    return b;
}

/* ---------- 3. State + URL hash + localStorage ---------- */

var state = {
    view: 'board',
    status: '', tag: '',
    help: false, first: false, offline: false,
    q: '',
    expanded: {}
};

// Read persisted filter state (hash wins over localStorage).
function loadState() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}'); } catch (e) {}
    Object.keys(state).forEach(function (k) {
        if (k !== 'expanded' && saved[k] !== undefined) state[k] = saved[k];
    });
    var hash = location.hash.replace(/^#/, '');
    if (hash) {
        var params = new URLSearchParams(hash);
        ['view', 'status', 'tag', 'q'].forEach(function (k) {
            if (params.get(k) !== null) state[k] = params.get(k);
        });
        ['help', 'first', 'offline'].forEach(function (k) {
            if (params.get(k) !== null) state[k] = params.get(k) === '1';
        });
    }
    if (['board', 'timeline', 'list'].indexOf(state.view) === -1) state.view = 'board';
}

// Write state back to localStorage and the hash (no history spam).
function saveState() {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        view: state.view, status: state.status, tag: state.tag,
        help: state.help, first: state.first, offline: state.offline, q: state.q
    })); } catch (e) {}
    var params = new URLSearchParams();
    if (state.view !== 'board') params.set('view', state.view);
    if (state.status) params.set('status', state.status);
    if (state.tag) params.set('tag', state.tag);
    if (state.help) params.set('help', '1');
    if (state.first) params.set('first', '1');
    if (state.offline) params.set('offline', '1');
    if (state.q) params.set('q', state.q);
    var s = params.toString();
    history.replaceState(null, '', s ? '#' + s : location.pathname + location.search);
}

/* ---------- derived data ---------- */

// Weight a status for progress math: done=1, in-progress=0.5, else 0.
function statusWeight(s) { return s === 'done' ? 1 : s === 'in-progress' ? 0.5 : 0; }

// Percent complete for one phase, derived from its items.
function phaseProgress(phase) {
    if (!phase.items.length) return 0;
    var sum = phase.items.reduce(function (t, i) { return t + statusWeight(i.status); }, 0);
    return Math.round((sum / phase.items.length) * 100);
}

// Overall percent across every item on the roadmap.
function overallProgress() {
    var total = 0, count = 0;
    DATA.phases.forEach(function (p) {
        p.items.forEach(function (i) { total += statusWeight(i.status); count++; });
    });
    return count ? Math.round((total / count) * 100) : 0;
}

// Count items by status across the whole roadmap.
function statusCounts() {
    var out = { 'done': 0, 'in-progress': 0, 'planned': 0, 'exploring': 0 };
    DATA.phases.forEach(function (p) {
        p.items.forEach(function (i) { if (out[i.status] !== undefined) out[i.status]++; });
    });
    return out;
}

// Does a phase pass the current filters?
function phaseMatches(phase) {
    if (state.status && phase.status !== state.status &&
        !phase.items.some(function (i) { return i.status === state.status; })) return false;
    if (state.tag && phase.tags.indexOf(state.tag) === -1) return false;
    if (state.offline && !phase.offline) return false;
    if (state.help && !phase.items.some(function (i) { return i.help_wanted; })) return false;
    if (state.first && !phase.items.some(function (i) { return i.good_first_issue; })) return false;
    if (state.q) {
        var q = state.q.toLowerCase();
        var hay = (phase.title + ' ' + phase.summary + ' ' + phase.deliverable + ' ' +
            phase.items.map(function (i) { return i.title + ' ' + i.description; }).join(' ')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
    }
    return true;
}

// Phases that pass every active filter.
function filteredPhases() { return DATA.phases.filter(phaseMatches); }

// All distinct tags across phases, for the tag filter.
function allTags() {
    var seen = {};
    DATA.phases.forEach(function (p) { p.tags.forEach(function (t) { seen[t] = true; }); });
    return Object.keys(seen);
}

// Find a phase object by id.
function phaseById(id) {
    var hit = null;
    DATA.phases.forEach(function (p) { if (p.id === id) hit = p; });
    return hit;
}

/* ---------- 4. Progress overview ---------- */

// Animate a number 0 → target over ~700ms (skipped for reduced motion).
function countUp(node, target, suffix) {
    suffix = suffix || '';
    if (reducedMotion) { node.textContent = target + suffix; return; }
    var start = performance.now(), dur = 700;
    function tick(now) {
        var t = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - t, 3);
        node.textContent = Math.round(target * eased) + suffix;
        if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// Render the overall bar, the four counters and the status legend.
function renderOverview() {
    var pct = overallProgress();
    var fill = qs('#overall-fill');
    var track = qs('#overall-track');
    var label = qs('#overall-pct');
    track.setAttribute('aria-valuenow', String(pct));
    requestAnimationFrame(function () { fill.style.width = pct + '%'; });
    countUp(label, pct, '%');

    var counts = statusCounts();
    var host = qs('#status-counters');
    host.textContent = '';
    Object.keys(STATUS).forEach(function (k) {
        var box = el('div');
        box.appendChild(el('dt', null, STATUS[k].label));
        var dd = el('dd', null, '0');
        box.appendChild(dd);
        countUp(dd, counts[k]);
        host.appendChild(box);
    });

    var legend = qs('#status-legend');
    legend.textContent = '';
    Object.keys(STATUS).forEach(function (k) {
        var li = el('li');
        var dot = el('span', 'legend-dot st-' + k + (k === 'exploring' ? ' is-dash' : ''));
        li.appendChild(dot);
        li.appendChild(el('span', null, STATUS[k].label));
        legend.appendChild(li);
    });
}

/* ---------- shared card bits ---------- */

// Row of meta chips: offline/BYOK, cost, dependency links.
function chipsRow(phase) {
    var row = el('div', 'card-row');
    var off = el('span', 'chip');
    off.appendChild(svgIcon(phase.offline ? LEAF_ICON : WIFI_OFF_ICON));
    off.appendChild(el('span', null, phase.offline ? 'Offline' : 'Needs net'));
    row.appendChild(off);
    var cost = el('span', 'chip');
    cost.appendChild(svgIcon(phase.cost === 'Free' ? LEAF_ICON : LOCK_ICON));
    cost.appendChild(el('span', null, phase.cost));
    row.appendChild(cost);
    (phase.needs || []).forEach(function (needId) {
        var dep = phaseById(needId);
        var a = el('a', 'chip chip--needs', 'Needs ' + (dep ? 'P' + dep.number : needId));
        a.href = '#view=timeline&phase=' + needId;
        a.addEventListener('click', function (e) {
            e.preventDefault();
            jumpToPhase(needId);
        });
        row.appendChild(a);
    });
    return row;
}

// Tag pills row for a phase.
function tagsRow(phase) {
    var row = el('div', 'card-row');
    phase.tags.forEach(function (t) { row.appendChild(el('span', 'tag', t)); });
    return row;
}

// Small progress bar + percentage label.
function progressRow(pct) {
    var row = el('div', 'card-progress');
    var track = el('div', 'progress-track');
    var fill = el('div', 'progress-fill');
    requestAnimationFrame(function () { fill.style.width = pct + '%'; });
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('span', 'pct', pct + '%'));
    return row;
}

/* ---------- 5. Board view ---------- */

// One phase card for the board column.
function boardCard(phase) {
    var card = el('article', 'phase-card');
    card.id = 'card-' + phase.id;
    var top = el('div', 'phase-card-top');
    top.appendChild(el('span', 'phase-num', String(phase.number)));
    top.appendChild(el('h3', null, phase.title));
    top.appendChild(statusBadge(phase.status));
    card.appendChild(top);
    card.appendChild(el('p', 'summary', phase.summary));
    card.appendChild(progressRow(phaseProgress(phase)));
    card.appendChild(tagsRow(phase));
    card.appendChild(chipsRow(phase));

    // Expandable item list inside the card.
    var btn = el('button', 'card-expand');
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'items-' + phase.id);
    btn.appendChild(document.createTextNode(phase.items.length + ' items '));
    btn.appendChild(svgIcon(CHEV));
    var items = el('ul', 'tl-items');
    items.id = 'items-' + phase.id;
    items.hidden = true;
    phase.items.forEach(function (item) { items.appendChild(itemRow(item)); });
    btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        items.hidden = open;
        btn.childNodes[0].textContent = (open ? phase.items.length + ' items ' : 'Hide items ');
    });
    card.appendChild(btn);
    card.appendChild(items);
    card.setAttribute('data-reveal', '');
    return card;
}

// One item row used by both board cards and the timeline body.
function itemRow(item) {
    var li = el('li', 'tl-item-row');
    var icon = svgIcon(STATUS[item.status] ? STATUS[item.status].icon : STATUS.planned.icon, 'item-icon st-' + item.status);
    li.appendChild(icon);
    var main = el('div', 'item-main');
    var head = el('div', 'card-row');
    head.appendChild(el('h4', null, item.title));
    head.appendChild(statusBadge(item.status));
    if (item.good_first_issue) head.appendChild(el('span', 'chip chip--first', 'Good first issue'));
    if (item.help_wanted) {
        var hw = el('span', 'chip chip--help');
        hw.appendChild(svgIcon(HAND_ICON));
        hw.appendChild(el('span', null, 'Help wanted'));
        head.appendChild(hw);
    }
    main.appendChild(head);
    if (item.description) main.appendChild(el('p', null, item.description));
    if (item.note) main.appendChild(el('span', 'item-note', item.note));

    var links = el('div', 'item-links');
    var hasLinks = false;
    if (item.issueUrl) {
        var view = el('a', 'item-link');
        view.href = item.issueUrl;
        view.target = '_blank';
        view.rel = 'noopener';
        view.appendChild(document.createTextNode('View issue'));
        view.appendChild(svgIcon(LINK_ICON));
        var state = el('span', 'issue-state');
        view.appendChild(state);
        enrichIssueState(item.issueUrl, state);
        links.appendChild(view);
        hasLinks = true;
    }
    if (item.help_wanted) {
        var help = el('a', 'item-link');
        help.href = CONFIG.newIssueUrl + '?title=' + encodeURIComponent('I want to help: ' + item.title);
        help.target = '_blank';
        help.rel = 'noopener';
        help.appendChild(document.createTextNode('I want to help'));
        help.appendChild(svgIcon(LINK_ICON));
        links.appendChild(help);
        hasLinks = true;
    }
    if (hasLinks) main.appendChild(links);
    li.appendChild(main);
    return li;
}

// The three-column board; empty state when filters hide everything.
function renderBoard() {
    var grid = qs('#board-grid');
    grid.textContent = '';
    var phases = filteredPhases();
    var lanes = [['Now', 'Doing now'], ['Next', 'Up next'], ['Later', 'Later / ideas']];
    lanes.forEach(function (lane) {
        var col = el('div', 'board-col');
        var head = el('div', 'board-col-head');
        head.appendChild(el('span', null, lane[0] + ' — ' + lane[1]));
        var list = phases.filter(function (p) { return p.target === lane[0]; });
        head.appendChild(el('span', 'count', String(list.length)));
        col.appendChild(head);
        list.forEach(function (p) { col.appendChild(boardCard(p)); });
        grid.appendChild(col);
    });
}

/* ---------- 6. Timeline view ---------- */

// One expandable phase on the vertical timeline.
function timelineItem(phase) {
    var li = el('li', 'tl-item');
    li.dataset.status = phase.status;
    li.id = 'tl-' + phase.id;

    li.appendChild(el('span', 'tl-dot', 'P' + phase.number));

    var card = el('div', 'tl-card');
    var heading = el('h3', 'tl-heading');
    var head = el('button', 'tl-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', state.expanded[phase.id] ? 'true' : 'false');
    head.setAttribute('aria-controls', 'tlb-' + phase.id);
    head.appendChild(el('span', 'tl-head-title', 'Phase ' + phase.number + ' · ' + phase.title));
    head.appendChild(statusBadge(phase.status));
    head.appendChild(svgIcon(CHEV, 'chev'));
    heading.appendChild(head);

    var body = el('div', 'tl-body');
    body.id = 'tlb-' + phase.id;
    body.hidden = !state.expanded[phase.id];
    body.appendChild(el('p', 'tl-summary', phase.summary));
    var del = el('p', 'tl-deliverable');
    del.appendChild(el('strong', null, 'Deliverable: '));
    del.appendChild(document.createTextNode(phase.deliverable));
    body.appendChild(del);
    body.appendChild(chipsRow(phase));
    body.appendChild(tagsRow(phase));
    body.appendChild(progressRow(phaseProgress(phase)));
    var items = el('ul', 'tl-items');
    phase.items.forEach(function (item) { items.appendChild(itemRow(item)); });
    body.appendChild(items);

    head.addEventListener('click', function () {
        var open = head.getAttribute('aria-expanded') === 'true';
        head.setAttribute('aria-expanded', open ? 'false' : 'true');
        body.hidden = open;
        state.expanded[phase.id] = !open;
    });
    card.appendChild(heading);
    card.appendChild(body);
    li.appendChild(card);
    return li;
}

// Render the timeline list from the filtered phases.
function renderTimeline() {
    var list = qs('#timeline-list');
    list.textContent = '';
    filteredPhases().forEach(function (p) { list.appendChild(timelineItem(p)); });
}

/* ---------- 7. Flat list view ---------- */

// One row in the simple list view; click jumps to the timeline detail.
function listRow(phase) {
    var li = el('li');
    var card = el('div', 'phase-card');
    var top = el('div', 'phase-card-top');
    top.appendChild(el('span', 'phase-num', String(phase.number)));
    top.appendChild(el('h3', null, phase.title));
    top.appendChild(statusBadge(phase.status));
    card.appendChild(top);
    card.appendChild(el('p', 'summary', phase.summary));
    card.appendChild(progressRow(phaseProgress(phase)));
    var btn = el('button', 'card-expand', 'Open details ');
    btn.type = 'button';
    btn.appendChild(svgIcon(CHEV));
    btn.addEventListener('click', function () { jumpToPhase(phase.id); });
    card.appendChild(btn);
    li.appendChild(card);
    return li;
}

// Render the flat list.
function renderList() {
    var ol = qs('#flat-ol');
    ol.textContent = '';
    filteredPhases().forEach(function (p) { ol.appendChild(listRow(p)); });
}

/* ---------- view switching + results ---------- */

// Show the active view section, hide the others.
function applyView() {
    var views = { board: '#view-board', timeline: '#view-timeline', list: '#view-list' };
    Object.keys(views).forEach(function (v) {
        var sec = qs(views[v]);
        var active = v === state.view;
        sec.hidden = !active;
        qsa('.view-btn[data-view="' + v + '"]').forEach(function (b) {
            b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    });
}

// Re-render the active view + the results count + empty state.
function refresh() {
    renderBoard(); renderTimeline(); renderList();
    applyView();
    var n = filteredPhases().length;
    var itemCount = 0;
    filteredPhases().forEach(function (p) { itemCount += p.items.length; });
    qs('#results-count').textContent = n + (n === 1 ? ' phase' : ' phases') + ' · ' + itemCount + ' items';
    announce(n + ' phases shown');

    // Empty state inside the active section.
    var activeSel = { board: '#view-board', timeline: '#view-timeline', list: '#view-list' }[state.view];
    qsa('.empty-state').forEach(function (e) { e.remove(); });
    if (n === 0) {
        var empty = el('div', 'empty-state');
        empty.appendChild(el('h3', null, 'Nothing matches'));
        empty.appendChild(el('p', null, 'No roadmap phases match those filters.'));
        var reset = el('button', 'btn btn-secondary btn-sm', 'Reset filters');
        reset.type = 'button';
        reset.addEventListener('click', resetFilters);
        empty.appendChild(reset);
        qs(activeSel).appendChild(empty);
    }
    saveState();
    // Re-rendered cards may carry data-reveal: (re)observe them if reveal is on.
    if (revealIO) qsa('[data-reveal]:not(.is-in)').forEach(function (n) { revealIO.observe(n); });
}

// Switch to the timeline view, expand a phase and scroll to it.
function jumpToPhase(phaseId) {
    state.view = 'timeline';
    state.expanded[phaseId] = true;
    refresh();
    var node = qs('#tl-' + phaseId);
    if (node) {
        node.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
        var head = qs('.tl-head', node);
        if (head) head.focus({ preventScroll: true });
    }
}

/* ---------- 8. Dependency map ---------- */

// Compute node positions: two rows, snake order, fixed node size.
function depLayout() {
    var nodes = [], edges = [];
    var w = 150, h = 48, gapX = 36, rowGap = 90;
    var perRow = Math.ceil(DATA.phases.length / 2);
    DATA.phases.forEach(function (p, i) {
        var row = i < perRow ? 0 : 1;
        var col = i < perRow ? i : i - perRow;
        nodes.push({ phase: p, x: 30 + col * (w + gapX), y: 30 + row * (h + rowGap), w: w, h: h });
    });
    DATA.phases.forEach(function (p) {
        (p.needs || []).forEach(function (needId) {
            var from = nodes.filter(function (n) { return n.phase.id === needId; })[0];
            var to = nodes.filter(function (n) { return n.phase.id === p.id; })[0];
            if (from && to) edges.push({ from: from, to: to });
        });
    });
    var width = 30 + perRow * (w + gapX) + 30;
    var height = 30 + 2 * h + rowGap + 30;
    return { nodes: nodes, edges: edges, width: width, height: height };
}

// Draw the SVG dependency map.
function renderDepMap() {
    var svg = qs('#depmap-svg');
    if (!svg) return;
    svg.textContent = '';
    var layout = depLayout();
    svg.setAttribute('viewBox', '0 0 ' + layout.width + ' ' + layout.height);
    svg.setAttribute('width', layout.width);
    svg.setAttribute('height', layout.height);

    var NS = 'http://www.w3.org/2000/svg';
    // Edges first so nodes sit on top.
    layout.edges.forEach(function (e) {
        var path = document.createElementNS(NS, 'path');
        var x1 = e.from.x + e.from.w, y1 = e.from.y + e.from.h / 2;
        var x2 = e.to.x, y2 = e.to.y + e.to.h / 2;
        var mx = x1 + Math.max(18, (x2 - x1) / 2);
        path.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2);
        path.setAttribute('class', 'dep-edge');
        path.dataset.from = e.from.phase.id;
        path.dataset.to = e.to.phase.id;
        svg.appendChild(path);
    });
    // Nodes.
    layout.nodes.forEach(function (n) {
        var g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'dep-node');
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', 'Phase ' + n.phase.number + ': ' + n.phase.title);
        g.dataset.phase = n.phase.id;
        var rect = document.createElementNS(NS, 'rect');
        rect.setAttribute('x', n.x); rect.setAttribute('y', n.y);
        rect.setAttribute('width', n.w); rect.setAttribute('height', n.h);
        rect.setAttribute('rx', 10);
        var t1 = document.createElementNS(NS, 'text');
        t1.setAttribute('x', n.x + 12); t1.setAttribute('y', n.y + 20);
        t1.textContent = 'P' + n.phase.number;
        var t2 = document.createElementNS(NS, 'text');
        t2.setAttribute('x', n.x + 12); t2.setAttribute('y', n.y + 36);
        t2.setAttribute('class', 'dep-sub');
        t2.textContent = n.phase.title.length > 20 ? n.phase.title.slice(0, 19) + '…' : n.phase.title;
        g.appendChild(rect); g.appendChild(t1); g.appendChild(t2);
        g.addEventListener('mouseenter', function () { depHighlight(n.phase.id); });
        g.addEventListener('focus', function () { depHighlight(n.phase.id); });
        g.addEventListener('mouseleave', depClear);
        g.addEventListener('blur', depClear);
        g.addEventListener('click', function () { jumpToPhase(n.phase.id); });
        g.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jumpToPhase(n.phase.id); }
        });
        svg.appendChild(g);
    });

    // Plain-text fallback list (shown on small screens / if SVG unsupported).
    var fb = qs('#depmap-fallback');
    if (fb) {
        fb.textContent = '';
        DATA.phases.forEach(function (p) {
            var li = el('li');
            li.appendChild(el('strong', null, 'P' + p.number + ' ' + p.title));
            var deps = (p.needs || []).map(function (id) {
                var d = phaseById(id);
                return d ? 'P' + d.number : id;
            });
            li.appendChild(document.createTextNode(deps.length ? ' — needs ' + deps.join(', ') : ' — no dependencies'));
            fb.appendChild(li);
        });
    }
}

// Highlight a node plus its dependencies and dependents.
function depHighlight(phaseId) {
    var related = { [phaseId]: true };
    qsa('.dep-edge').forEach(function (edge) {
        var rel = edge.dataset.from === phaseId || edge.dataset.to === phaseId;
        edge.classList.toggle('is-related', rel);
        if (rel) { related[edge.dataset.from] = true; related[edge.dataset.to] = true; }
    });
    qsa('.dep-node').forEach(function (node) {
        var isHit = node.dataset.phase === phaseId;
        node.classList.toggle('is-hit', isHit);
        node.classList.toggle('is-related', !isHit && !!related[node.dataset.phase]);
        node.classList.toggle('is-dim', !related[node.dataset.phase]);
    });
}
// Clear all dependency highlights.
function depClear() {
    qsa('.dep-edge').forEach(function (e) { e.classList.remove('is-related'); });
    qsa('.dep-node').forEach(function (n) { n.classList.remove('is-hit', 'is-related', 'is-dim'); });
}

/* ---------- 9. Help wanted, principles, changelog ---------- */

// The help-wanted strip: every flagged item across all phases.
function renderHelp() {
    var list = qs('#help-list');
    list.textContent = '';
    var any = false;
    DATA.phases.forEach(function (p) {
        p.items.forEach(function (item) {
            if (!item.help_wanted) return;
            any = true;
            var row = el('li', 'help-row');
            var main = el('div');
            main.appendChild(el('div', 'help-title', item.title));
            main.appendChild(el('div', 'help-where', 'Phase ' + p.number + ' · ' + p.title));
            row.appendChild(main);
            var actions = el('div', 'help-actions');
            if (item.good_first_issue) actions.appendChild(el('span', 'chip chip--first', 'Good first issue'));
            actions.appendChild(statusBadge(item.status));
            var a = el('a', 'btn btn-secondary btn-sm', 'I want to help');
            a.href = item.issueUrl || (CONFIG.newIssueUrl + '?title=' + encodeURIComponent('I want to help: ' + item.title));
            a.target = '_blank';
            a.rel = 'noopener';
            actions.appendChild(a);
            row.appendChild(actions);
            list.appendChild(row);
        });
    });
    if (!any) {
        var li = el('li', 'empty-state', 'Nothing flagged right now — check back soon or browse open issues.');
        list.appendChild(li);
    }
}

// Principle cards.
function renderPrinciples() {
    var grid = qs('#principles-grid');
    grid.textContent = '';
    DATA.principles.forEach(function (p) {
        var card = el('div', 'principle-card');
        card.setAttribute('data-reveal', '');
        card.appendChild(svgIcon(LEAF_ICON, 'p-icon'));
        card.appendChild(el('h3', null, p.title));
        card.appendChild(el('p', null, p.text));
        grid.appendChild(card);
    });
}

// Latest changelog entries (first 5).
function renderChangelog() {
    var list = qs('#changelog-list');
    list.textContent = '';
    DATA.changelog.slice(0, 5).forEach(function (c) {
        var row = el('li', 'changelog-row');
        row.appendChild(el('span', 'changelog-date', c.date));
        var main = el('div');
        main.appendChild(el('strong', null, c.title));
        main.appendChild(el('span', 'notes', c.notes));
        row.appendChild(main);
        list.appendChild(row);
    });
}

/* ---------- 10. Filters + search wiring ---------- */

// Pull current control values into state and re-render.
function applyControls() {
    state.status = qs('#f-status').value;
    state.tag = qs('#f-tag').value;
    state.help = qs('#f-help').checked;
    state.first = qs('#f-first').checked;
    state.offline = qs('#f-offline').checked;
    state.q = qs('#f-q').value.trim();
    refresh();
}

// Push state back into the controls (on load / hashchange).
function syncControls() {
    qs('#f-status').value = state.status;
    qs('#f-tag').value = state.tag;
    qs('#f-help').checked = state.help;
    qs('#f-first').checked = state.first;
    qs('#f-offline').checked = state.offline;
    qs('#f-q').value = state.q;
    qsa('.view-btn').forEach(function (b) {
        b.setAttribute('aria-pressed', b.dataset.view === state.view ? 'true' : 'false');
    });
}

// Clear every filter and re-render.
function resetFilters() {
    state.status = ''; state.tag = '';
    state.help = false; state.first = false; state.offline = false;
    state.q = '';
    syncControls();
    refresh();
}

// Fill the tag dropdown from the data.
function buildTagFilter() {
    var sel = qs('#f-tag');
    allTags().forEach(function (t) {
        var opt = el('option', null, t);
        opt.value = t;
        sel.appendChild(opt);
    });
}

/* ---------- 11. Export + GitHub issue state ---------- */

// Build Markdown for the currently filtered phases.
function roadmapMarkdown() {
    var lines = ['# Owlet roadmap (export)', '', 'Generated: ' + DATA.updated, ''];
    var pct = overallProgress();
    lines.push('**Overall progress:** ' + pct + '%', '');
    filteredPhases().forEach(function (p) {
        lines.push('## Phase ' + p.number + ' — ' + p.title + ' [' + (STATUS[p.status] || STATUS.planned).label + ']');
        lines.push('', p.summary, '');
        lines.push('> ' + p.deliverable, '');
        lines.push('- Target: ' + p.target + ' · Cost: ' + p.cost + ' · ' + (p.offline ? 'Works offline' : 'Needs internet'));
        if (p.needs && p.needs.length) {
            lines.push('- Depends on: ' + p.needs.map(function (id) {
                var d = phaseById(id); return d ? 'Phase ' + d.number : id;
            }).join(', '));
        }
        p.items.forEach(function (i) {
            var mark = i.status === 'done' ? '[x]' : '[ ]';
            var note = i.note ? ' — _' + i.note + '_' : '';
            lines.push('  - ' + mark + ' ' + i.title + note);
        });
        lines.push('');
    });
    return lines.join('\n');
}

// Download the filtered roadmap as a .md file (Blob; works on file://).
function exportMarkdown() {
    var blob = new Blob([roadmapMarkdown()], { type: 'text/markdown' });
    var url = URL.createObjectURL(blob);
    var a = el('a');
    a.href = url;
    a.download = 'owlet-roadmap.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    announce('Roadmap exported as Markdown');
}

// Fetch a GitHub issue's open/closed state, cached for 1 hour; silent on failure.
function enrichIssueState(issueUrl, targetEl) {
    var m = issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
    if (!m) return;
    var key = CONFIG.issueCacheKey + m[3];
    try {
        var cached = JSON.parse(localStorage.getItem(key) || 'null');
        if (cached && Date.now() - cached.ts < CONFIG.issueCacheMs && cached.state) {
            targetEl.textContent = '· ' + cached.state;
            return;
        }
    } catch (e) {}
    fetch('https://api.github.com/repos/' + m[1] + '/' + m[2] + '/issues/' + m[3])
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (json) {
            if (!json || !json.state) return;
            targetEl.textContent = '· ' + json.state;
            try { localStorage.setItem(key, JSON.stringify({ state: json.state, ts: Date.now() })); } catch (e) {}
        })
        .catch(function () { /* offline/blocked: leave the link plain */ });
}

/* ---------- 12. Theme, reveal, boot ---------- */

// Read shared UI prefs (same key as the app + docs).
function readPrefs() {
    try { return JSON.parse(localStorage.getItem('owlet:ui:prefs') || '{}'); } catch (e) { return {}; }
}
// Apply dark/light to <html> and the toggle button.
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = qs('#btn-theme');
    if (btn) btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
}
// Toggle theme and persist to the shared prefs key.
function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    var next = cur === 'light' ? 'dark' : 'light';
    var prefs = readPrefs();
    prefs.theme = next;
    try { localStorage.setItem('owlet:ui:prefs', JSON.stringify(prefs)); } catch (e) {}
    applyTheme(next);
}

// Progressive reveal-on-scroll; everything is visible without it.
var revealIO = null;
function initReveal() {
    if (reducedMotion || !('IntersectionObserver' in window)) return;
    document.body.classList.add('js-reveal');
    revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
        });
    }, { rootMargin: '0px 0px -60px 0px' });
    qsa('[data-reveal]').forEach(function (n) { revealIO.observe(n); });
}

// The "suggest an idea" template, copied to the clipboard.
function ideaTemplate() {
    return [
        '## Idea',
        '(one sentence: what should Owlet do?)',
        '',
        '## Problem it solves',
        '(what hurts today without it?)',
        '',
        '## Suggested behaviour',
        '(how would it work for a beginner?)',
        '',
        '## Notes',
        '(optional: similar tools, edge cases)'
    ].join('\n');
}

// Wire everything once the DOM is ready.
function boot() {
    // Hero metadata.
    var time = qs('#last-updated');
    time.dateTime = DATA.updated;
    time.textContent = DATA.updated;

    // Theme.
    var prefs = readPrefs();
    var theme = prefs.theme;
    if (theme !== 'dark' && theme !== 'light') {
        theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    applyTheme(theme);
    qs('#btn-theme').addEventListener('click', toggleTheme);

    // Controls.
    buildTagFilter();
    loadState();
    syncControls();
    qsa('.view-btn').forEach(function (b) {
        b.addEventListener('click', function () {
            state.view = b.dataset.view;
            refresh();
        });
    });
    ['#f-status', '#f-tag'].forEach(function (s) { qs(s).addEventListener('change', applyControls); });
    ['#f-help', '#f-first', '#f-offline'].forEach(function (s) { qs(s).addEventListener('change', applyControls); });
    qs('#f-q').addEventListener('input', applyControls);
    qs('#btn-reset').addEventListener('click', resetFilters);
    qs('#btn-export').addEventListener('click', exportMarkdown);
    qs('#btn-copy-idea').addEventListener('click', function () {
        copyText(ideaTemplate(), function () {
            qs('#idea-copy-note').textContent = 'Copied — paste into a new issue.';
            setTimeout(function () { qs('#idea-copy-note').textContent = ''; }, 3000);
        });
    });
    window.addEventListener('hashchange', function () { loadState(); syncControls(); refresh(); });

    // Render everything.
    renderOverview();
    refresh();
    renderDepMap();
    renderHelp();
    renderPrinciples();
    renderChangelog();
    initReveal();

    // Back to top.
    var btt = qs('#back-to-top');
    if (btt) btt.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

/* ==========================================================================
   check-data.js — validate the docs data files.
   Usage: node tools/check-data.js   (run from the docs/ directory)

   Loads every js/docs-data/*.js into a stubbed window, then verifies:
   - page ids are unique, route-shaped and under their group id
   - every block uses a known renderer type
   - text-bearing blocks carry their required fields
   - inline segments only use known keys (c, b, i, a, kbd, br, badge)
   Exits non-zero if any problem is found.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

global.window = {};
const dir = path.join(__dirname, '..', 'js', 'docs-data');
fs.readdirSync(dir).filter(function (f) { return f.endsWith('.js'); })
    .forEach(function (f) { require(path.join(dir, f)); });

const groups = global.window.OwletDocs.groups || [];
const known = ['p', 'h2', 'h3', 'list', 'steps', 'callout', 'code', 'table',
    'figure', 'badge-list', 'cards', 'filetree', 'shortcut-table', 'token-table'];
const usesX = new Set(['p', 'h2', 'h3', 'callout']);
const badgeKinds = new Set(['ok', 'progress', 'planned', 'experimental', 'plain']);
const inlineKeys = ['c', 'b', 'i', 'a', 'kbd', 'br', 'badge'];

const ids = new Set();
let errs = [], pages = 0, blocks = 0;

function seg(v, where) {
    if (v === undefined || v === null) return;
    if (typeof v === 'string') return;
    if (Array.isArray(v)) { v.forEach(function (s) { seg(s, where); }); return; }
    if (typeof v !== 'object') {
        errs.push(where + ': non-string inline ' + JSON.stringify(v));
        return;
    }
    if (!inlineKeys.some(function (k) { return v[k] !== undefined; })) {
        errs.push(where + ': unknown inline ' + JSON.stringify(v));
    }
}

groups.forEach(function (g) {
    (g.pages || []).forEach(function (p) {
        pages++;
        if (ids.has(p.id)) errs.push('duplicate id ' + p.id);
        ids.add(p.id);
        if (!/^[\w-]+\/[\w-]+$/.test(p.id)) errs.push('bad route shape: ' + p.id);
        if (p.id.indexOf(g.id + '/') !== 0) errs.push(p.id + ' is not under group ' + g.id);
        (p.blocks || []).forEach(function (b, i) {
            blocks++;
            const w = p.id + ' block#' + i + ' (' + b.t + ')';
            if (!b.t || known.indexOf(b.t) === -1) errs.push(w + ': unknown block type');
            if (usesX.has(b.t) && b.x === undefined) errs.push(w + ': missing x');
            if (b.x !== undefined) seg(b.x, w);
            if (b.t === 'list') (b.items || []).forEach(function (it) { seg(it, w + '.items'); });
            if (b.t === 'badge-list') (b.items || []).forEach(function (it) {
                if (!it.kind || !badgeKinds.has(it.kind)) errs.push(w + '.items: bad badge kind ' + JSON.stringify(it));
            });
            if (b.t === 'token-table') (b.items || []).forEach(function (it) {
                if (!it.name || it.name.indexOf('--') !== 0) errs.push(w + '.items: bad token ' + JSON.stringify(it));
            });
            if (b.t === 'steps') (b.items || []).forEach(function (it) {
                if (!it.title) errs.push(w + '.items: step missing title');
                if (it.text !== undefined) seg(it.text, w + '.items.text');
            });
            if (b.t === 'cards') (b.items || []).forEach(function (it) {
                if (!it.title) errs.push(w + '.items: card missing title');
                if (it.text !== undefined) seg(it.text, w);
            });
            if (b.t === 'table') {
                (b.head || []).forEach(function (h) { seg(h, w + '.head'); });
                (b.rows || []).forEach(function (r) { r.forEach(function (c) { seg(c, w + '.rows'); }); });
            }
            if (b.t === 'code' && !(b.code || (b.tabs || []).length)) errs.push(w + ': no code');
            if (b.t === 'callout' && !(b.x || b.title)) errs.push(w + ': empty callout');
        });
    });
});

console.log('groups=' + groups.length + ' pages=' + pages + ' blocks=' + blocks +
    ' shortcuts=' + (global.window.OwletDocs.SHORTCUTS || []).length);
if (errs.length) {
    console.log('ERRORS:');
    errs.forEach(function (e) { console.log(' - ' + e); });
    process.exit(1);
}
console.log('DATA_OK');

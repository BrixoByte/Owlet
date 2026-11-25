// settings.js — behaviour for the redesigned Settings dialog:
//   * search box filters rows across every tab
//   * theme option-cards stay in sync with the hidden #set-theme select
//   * eye buttons toggle password fields
//   * a tiny "Saved" tick fades in next to whatever changed
//   * Reset all restores defaults (with confirm)
// No settings LOGIC lives here — the real apply/persist code stays in app.js.

window.OwletUI = window.OwletUI || {};

OwletUI.settings = (function () {

    function el(id) { return document.getElementById(id); }
    function dlg() { return el('settings-dialog'); }

    // ---------- search -------------------------------------------------------

    // Row-level filter: show every tab that has a match, hide the rest.
    function applySearch(query) {
        var content = dlg().querySelector('.settings-content');
        var panels = dlg().querySelectorAll('.settings-panel');
        var empty = el('settings-empty');
        var q = query.trim().toLowerCase();
        var anyShown = false;

        panels.forEach(function (panel) {
            var rows = panel.querySelectorAll('.set-row, .about-card, .alert, .settings-note, .opt-cards, table, .field');
            var hits = 0;
            rows.forEach(function (row) {
                var match = !q || row.textContent.toLowerCase().indexOf(q) !== -1;
                row.classList.toggle('is-filtered-out', !match);
                if (match) hits++;
            });
            // While searching, temporarily show every panel that has a hit.
            var searching = q.length > 0;
            panel.classList.toggle('active', searching ? hits > 0 : panel.classList.contains('active'));
            if (searching && hits > 0) anyShown = true;
        });

        content.classList.toggle('is-searching', q.length > 0);
        empty.classList.toggle('is-on', q.length > 0 && !anyShown);
        // When the search clears, restore the nav's selected tab.
        if (!q) {
            var activeTab = dlg().querySelector('.settings-nav-item.active');
            panels.forEach(function (p) {
                p.classList.toggle('active', p.getAttribute('data-settings-panel') ===
                    (activeTab && activeTab.getAttribute('data-settings-tab')));
            });
        }
    }

    // Clicking a nav item clears the search so the tab shows normally.
    function wireSearch() {
        var input = el('settings-search');
        if (!input) return;
        input.addEventListener('input', function () { applySearch(input.value); });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { input.value = ''; applySearch(''); }
        });
        dlg().querySelectorAll('.settings-nav-item').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (input.value) { input.value = ''; applySearch(''); }
            });
        });
        // Ctrl+F inside the dialog jumps to the search field.
        dlg().addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                input.focus();
                input.select();
            }
        });
    }

    // ---------- theme option cards ------------------------------------------

    // Clicking a card updates the hidden select, which triggers app.js's
    // normal change handler (the real apply path is untouched).
    function wireThemeCards() {
        var select = el('set-theme');
        if (!select) return;
        dlg().querySelectorAll('.opt-card[data-theme-card]').forEach(function (card) {
            var value = card.getAttribute('data-theme-card');
            var radio = card.querySelector('input[type="radio"]');
            card.addEventListener('click', function () {
                select.value = value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            });
            card.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
            });
            if (radio) radio.tabIndex = -1;   // the card itself is the control
            card.tabIndex = 0;
            card.setAttribute('role', 'radio');
        });
        // Keep the cards' checked rings in sync when the theme changes anywhere.
        select.addEventListener('change', function () {
            dlg().querySelectorAll('.opt-card[data-theme-card]').forEach(function (card) {
                var on = card.getAttribute('data-theme-card') === select.value;
                card.classList.toggle('is-selected', on);
                card.setAttribute('aria-checked', on ? 'true' : 'false');
                var radio = card.querySelector('input[type="radio"]');
                if (radio) radio.checked = on;
            });
        });
        // Initial paint.
        select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // ---------- password eye buttons ----------------------------------------

    function wireEyes() {
        dlg().querySelectorAll('[data-eye]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var input = el(btn.getAttribute('data-eye'));
                if (!input) return;
                var show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                btn.setAttribute('aria-label', show ? 'Hide key' : 'Show key');
            });
        });
        // Never show a saved key in full — hint at the last 4 chars only.
        var key = el('set-sandbox-key');
        var desc = el('sandbox-key-desc');
        if (key && desc && Owlet.settings && Owlet.settings.get('sandboxKey')) {
            var tail = String(Owlet.settings.get('sandboxKey')).slice(-4);
            desc.textContent = 'Saved key ends in …' + tail + ' — stored only in this browser.';
        }
    }

    // ---------- "Saved" tick -------------------------------------------------

    // Fade a small check next to the control that just changed.
    function wireSavedTick() {
        dlg().querySelectorAll('.settings-panel').forEach(function (panel) {
            panel.addEventListener('change', function (e) {
                var row = e.target.closest('.set-row');
                if (!row) return;
                var tick = row.querySelector('.set-saved');
                if (!tick) {
                    tick = document.createElement('span');
                    tick.className = 'set-saved';
                    tick.innerHTML = OwletUI.icon('check', 'icon-sm') + '<span>Saved</span>';
                    var ctrl = row.querySelector('.set-control');
                    (ctrl || row).appendChild(tick);
                }
                tick.classList.add('is-on');
                clearTimeout(tick._t);
                tick._t = setTimeout(function () { tick.classList.remove('is-on'); }, 1500);
            });
        });
    }

    // ---------- reset all ----------------------------------------------------

    function wireResetAll() {
        var btn = el('set-reset-all');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var doIt = function () {
                var defaults = {
                    'set-fontsize': '14', 'set-tabsize': '4',
                    'set-linenumbers': true, 'set-wordwrap': true,
                    'set-preview-auto': true, 'set-theme': 'system'
                };
                Object.keys(defaults).forEach(function (id) {
                    var c = el(id);
                    if (!c) return;
                    if (c.type === 'checkbox') c.checked = defaults[id];
                    else c.value = defaults[id];
                    c.dispatchEvent(new Event('change', { bubbles: true }));
                });
                OwletUI.layout && OwletUI.layout.reset && OwletUI.layout.reset();
            };
            if (OwletUI.dialogs && OwletUI.dialogs.confirm) {
                OwletUI.dialogs.confirm({
                    title: 'Reset all settings?',
                    message: 'Font size, theme, editor options and layout go back to their defaults.',
                    okLabel: 'Reset',
                    danger: true
                }).then(function (ok) { if (ok) doIt(); });
            } else if (confirm('Reset all settings to defaults?')) doIt();
        });
    }

    // ---------- keyboard nav for the tablist --------------------------------

    function wireNavKeys() {
        var nav = dlg().querySelector('.settings-nav');
        if (!nav) return;
        nav.addEventListener('keydown', function (e) {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
            var items = Array.prototype.slice.call(nav.querySelectorAll('.settings-nav-item'));
            var i = items.indexOf(document.activeElement);
            if (i === -1) return;
            e.preventDefault();
            if (e.key === 'ArrowDown') i = Math.min(i + 1, items.length - 1);
            else if (e.key === 'ArrowUp') i = Math.max(i - 1, 0);
            else if (e.key === 'Home') i = 0;
            else if (e.key === 'End') i = items.length - 1;
            items[i].focus();
        });
    }

    function init() {
        if (!dlg()) return;
        wireSearch();
        wireThemeCards();
        wireEyes();
        wireSavedTick();
        wireResetAll();
        wireNavKeys();
    }

    document.addEventListener('DOMContentLoaded', init);

    return {};
})();

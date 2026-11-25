// layout.js — the workbench shell: presets, collapsible regions, resizable
// dividers, moving the preview between right and bottom, the bottom dock tabs,
// and the mobile view switch. Layout state is saved under prefs.layout.
// Only the DOM attributes and CSS variables are touched here; the logic
// modules never know about the layout.

window.OwletUI = window.OwletUI || {};

OwletUI.layout = (function () {
    var DEFAULTS = {
        preset: 'classic',
        side: { open: true, width: 256, view: 'explorer' },
        right: { open: true, width: 440 },
        bottom: { open: true, height: 240, pinned: false }
    };
    var LIMITS = { side: [160, 520], right: [260, 1200], bottom: [96, 900] };
    var KEY_STEP = 16;
    var PRESETS = {
        'classic':       { label: 'Classic',              hint: 'Explorer, editor, console, preview right' },
        'preview-right': { label: 'Preview Right',        hint: 'Wide preview on the right, no explorer' },
        'focus':         { label: 'Focus (editor only)',  hint: 'Hide every side and bottom panel' },
        'zen':           { label: 'Zen',                  hint: 'Editor only, full bleed; Esc to exit' }
    };

    var state = null;
    var pendingFrame = 0;
    var drag = null;
    var mobileQuery = window.matchMedia ? window.matchMedia('(max-width: 720px)') : null;

    // Copy of the defaults so the original object is never changed.
    function cloneDefaults() {
        return JSON.parse(JSON.stringify(DEFAULTS));
    }

    // Versioned storage key: layouts saved by older designs are ignored automatically.
    var STORAGE_KEY = 'owlet.layout.v2';

    // Use a saved number only when it is finite and inside [min, max]; else the default.
    function safeNumber(value, min, max, fallback) {
        if (typeof value !== 'number' || !isFinite(value)) return fallback;
        if (value < min || value > max) return fallback;
        return Math.round(value);
    }

    // Use a saved boolean only when it really is a boolean.
    function safeBool(value, fallback) {
        return typeof value === 'boolean' ? value : fallback;
    }

    // Read saved layout, validating every field against the defaults.
    function load() {
        var merged = cloneDefaults();
        var saved = null;
        try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { saved = null; }
        if (!saved || typeof saved !== 'object') return merged;
        if (PRESETS[saved.preset]) merged.preset = saved.preset;
        if (saved.side && typeof saved.side === 'object') {
            merged.side.open = safeBool(saved.side.open, merged.side.open);
            merged.side.width = safeNumber(saved.side.width, LIMITS.side[0], LIMITS.side[1], merged.side.width);
            merged.side.pinned = safeBool(saved.side.pinned, false);
            if (typeof saved.side.view === 'string') merged.side.view = saved.side.view;
        }
        if (saved.right && typeof saved.right === 'object') {
            merged.right.open = safeBool(saved.right.open, merged.right.open);
            merged.right.width = safeNumber(saved.right.width, LIMITS.right[0], LIMITS.right[1], merged.right.width);
        }
        if (saved.bottom && typeof saved.bottom === 'object') {
            merged.bottom.open = safeBool(saved.bottom.open, merged.bottom.open);
            merged.bottom.height = safeNumber(saved.bottom.height, LIMITS.bottom[0], LIMITS.bottom[1], merged.bottom.height);
            merged.bottom.pinned = safeBool(saved.bottom.pinned, merged.bottom.pinned);
        }
        return merged;
    }

    // Save the current layout state under the versioned key.
    function save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
    }

    // Forget the saved layout (used by Reset layout).
    function clearSaved() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    }

    // Clamp a size to the limits for one region.
    function clamp(region, value) {
        var lim = LIMITS[region];
        return Math.round(Math.min(lim[1], Math.max(lim[0], value)));
    }

    // Element helper.
    function el(id) { return document.getElementById(id); }

    // Write attributes and CSS variables that the stylesheet reads.
    function applyDom() {
        var shell = el('shell');
        if (!shell) return;
        var rightVisible = state.right.open;
        document.documentElement.setAttribute('data-layout', state.preset);
        shell.setAttribute('data-side', state.side.open ? 'open' : 'closed');
        shell.setAttribute('data-right', rightVisible ? 'open' : 'closed');
        shell.setAttribute('data-bottom', state.bottom.open ? 'open' : 'closed');
        // The preview lives in the right column only — never in the dock.
        shell.setAttribute('data-preview', 'right');
        shell.toggleAttribute('data-bottom-pinned', !!state.bottom.pinned);
        // Sidebar: unpinned = overlay drawer (side track stays 0, the width
        // goes to --side-ow and the editor keeps its full size). Pinned =
        // docked: the side track gets the width and pushes the editor.
        var sidePinned = !!state.side.pinned;
        shell.toggleAttribute('data-side-pinned', sidePinned);
        shell.style.setProperty('--side-col', state.side.open && sidePinned ? state.side.width + 'px' : '0px');
        shell.style.setProperty('--side-ow', state.side.open && !sidePinned ? state.side.width + 'px' : '0px');
        // Preview overlays the editor too: the right track stays 0 and the
        // width drives --right-ow, so the editor never reflows on open/close.
        shell.style.setProperty('--right-col', '0px');
        shell.style.setProperty('--right-ow', rightVisible ? state.right.width + 'px' : '0px');
        shell.style.setProperty('--bottom-row', state.bottom.open ? bottomHeight() + 'px' : '0px');
        placePreview();
        markPresetState();
        refreshEditors();
    }

    // Bottom panel height.
    function bottomHeight() {
        return state.bottom.height;
    }

    // The preview always lives in the right column. Older sessions may have
    // parked it inside the bottom dock — put it back and drop its stale tab.
    function placePreview() {
        var preview = el('preview-pane');
        var shell = el('shell');
        if (!preview || !shell) return;
        if (preview.parentNode !== shell) {
            preview.classList.remove('dock-panel', 'active');
            shell.appendChild(preview);
            removePreviewTab();
            syncDock();
        }
    }

    // Remove a stale "Preview" tab left in the dock by an older build.
    function removePreviewTab() {
        var btn = document.querySelector('#dock-tabs [data-dock="preview"]');
        if (btn) btn.remove();
    }

    // Make exactly one dock tab active and show only its panel.
    function syncDock() {
        var active = document.querySelector('#dock-tabs .dock-tab.active');
        var name = active ? active.getAttribute('data-dock') : 'console';
        document.querySelectorAll('#dock-tabs .dock-tab').forEach(function (t) {
            var on = t.getAttribute('data-dock') === name;
            t.classList.toggle('active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var panels = { console: 'console-panel', terminal: 'terminal-panel', problems: 'problems-panel' };
        Object.keys(panels).forEach(function (key) {
            var node = el(panels[key]);
            if (node) node.classList.toggle('active', key === name);
        });
    }

    // Show a dock tab (and open the bottom panel if it was closed).
    function showDockTab(name) {
        document.querySelectorAll('#dock-tabs .dock-tab').forEach(function (t) {
            t.classList.toggle('active', t.getAttribute('data-dock') === name);
        });
        setOpen('bottom', true);
        syncDock();
    }

    // Highlight the rail button of the visible side view, and the preset menu state.
    function markPresetState() {
        document.querySelectorAll('#activity-rail [data-view]').forEach(function (b) {
            var on = state.side.open && b.getAttribute('data-view') === state.side.view;
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
            b.setAttribute('aria-expanded', on ? 'true' : 'false');
        });
        var pin = el('btn-pin-side');
        if (pin) pin.setAttribute('aria-pressed', state.side.pinned ? 'true' : 'false');
        var sbLayout = el('sb-layout');
        if (sbLayout) sbLayout.textContent = PRESETS[state.preset] ? PRESETS[state.preset].label : 'Custom';
        var toggle = el('sb-toggle-panel');
        if (toggle) toggle.setAttribute('aria-pressed', state.bottom.open ? 'true' : 'false');
        var sbPrev = el('sb-toggle-preview');
        if (sbPrev) sbPrev.setAttribute('aria-pressed', previewVisible() ? 'true' : 'false');
        var tbSide = el('btn-toggle-explorer');
        if (tbSide) tbSide.setAttribute('aria-pressed', state.side.open ? 'true' : 'false');
        var tbTerm = el('btn-toggle-terminal');
        if (tbTerm) tbTerm.setAttribute('aria-pressed', state.bottom.open ? 'true' : 'false');
        var tbPrev = el('btn-toggle-preview');
        if (tbPrev) tbPrev.setAttribute('aria-pressed', previewVisible() ? 'true' : 'false');
        var pinBtn = el('btn-dock-pin');
        if (pinBtn) pinBtn.setAttribute('aria-pressed', state.bottom.pinned ? 'true' : 'false');
        syncSideViews();
    }

    // Show the side view that matches state.side.view (others are hidden).
    function syncSideViews() {
        document.querySelectorAll('.side-view').forEach(function (v) {
            v.classList.toggle('active', v.getAttribute('data-side-view') === state.side.view);
        });
        // View-specific tools (e.g. explorer's file buttons) key off this.
        var sb = el('sidebar');
        if (sb) sb.setAttribute('data-view', state.side.view);
        var title = el('side-title');
        if (title) title.textContent = state.side.view.charAt(0).toUpperCase() + state.side.view.slice(1);
    }

    // First-run bare mode (#shell[data-empty], set by editor-chrome when the
    // project has zero files) is only the DEFAULT view. Any manual layout
    // action is an explicit choice, so it leaves bare mode for good — panels
    // then follow their normal saved state again.
    function exitBareMode() {
        var shell = el('shell');
        if (shell) shell.removeAttribute('data-empty');
    }

    // Debounced CodeMirror refresh: open/close/pin/resize all land in
    // applyDom, so editors never keep a stale size afterwards.
    var refreshTimer = null;
    function refreshEditors() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function () {
            if (Owlet.groups && Owlet.groups.forEachEditor) {
                Owlet.groups.forEachEditor(function (cm) { if (cm && cm.refresh) cm.refresh(); });
            }
        }, 200);
    }

    // The rail button that owns a side view (for focus return).
    function railButton(view) {
        return document.querySelector('#activity-rail [data-view="' + view + '"]');
    }

    // Open or close one region ('side' | 'right' | 'bottom') and save.
    function setOpen(region, open) {
        exitBareMode();
        if (region === 'bottom' && !open && state.bottom.pinned) {
            OwletUI.toast('Panel is pinned — click the pin to unlock it', 'info', { duration: 2000 });
            return;
        }
        state[region].open = !!open;
        applyDom();
        save();
        if (region === 'side') {
            var sb = el('sidebar');
            if (open && !state.side.pinned && sb) {
                sb.setAttribute('tabindex', '-1');
                sb.focus({ preventScroll: true });
            } else if (!open && sb && sb.contains(document.activeElement)) {
                var btn = railButton(state.side.view);
                if (btn) btn.focus();
            }
        }
    }

    // Flip one region's open state.
    function toggle(region) {
        setOpen(region, !state[region].open);
    }

    // Is the preview actually on screen right now?
    function previewVisible() {
        return state.right.open;
    }

    // Toggle a dock tab: close the dock when that tab is already showing,
    // otherwise open the dock on it. Used by the topbar quick toggles.
    function toggleDockTab(name) {
        var active = document.querySelector('#dock-tabs .dock-tab.active');
        if (state.bottom.open && active && active.getAttribute('data-dock') === name) {
            setOpen('bottom', false);
        } else {
            showDockTab(name);
        }
    }

    // Select a side view (explorer, search, git, ai, extensions) and open the side panel.
    function setView(view) {
        exitBareMode();
        if (state.side.view === view && state.side.open) { toggle('side'); return; }
        state.side.view = view;
        state.side.open = true;
        applyDom();
        save();
        // Opening the explorer scrolls to the file open in the editor.
        if (view === 'explorer' && Owlet.filetree && Owlet.filetree.reveal) {
            var af = Owlet.state && Owlet.state.activeFile;
            if (af) Owlet.filetree.reveal(af);
        }
    }

    // Apply a named preset. Each preset sets all regions in one step.
    function applyPreset(name) {
        exitBareMode();
        var w = window.innerWidth;
        var base = cloneDefaults();
        if (name === 'preview-right') {
            base.side.open = false;
            base.right.width = clamp('right', Math.round(w * 0.5));
        } else if (name === 'focus' || name === 'zen') {
            base.side.open = false;
            base.right.open = false;
            base.bottom.open = false;
        }
        base.preset = PRESETS[name] ? name : 'classic';
        base.side.view = state.side.view;
        state = base;
        applyDom();
        save();
        if (name === 'zen') enterZen(); else exitZen();
    }

    // Zen also asks the browser for full screen when it is allowed.
    function enterZen() {
        var root = document.documentElement;
        if (document.fullscreenEnabled && !document.fullscreenElement && root.requestFullscreen) {
            root.requestFullscreen().catch(function () {});
        }
    }

    // Leave full screen when the preset changes away from zen.
    function exitZen() {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(function () {});
        }
    }

    // Reset every layout setting to the classic defaults.
    function reset() {
        exitBareMode();
        state = cloneDefaults();
        clearSaved();
        applyDom();
        save();
        OwletUI.toast('Layout reset to Classic', 'success', { duration: 2500 });
    }

    // ---- dividers --------------------------------------------------------

    // Start dragging a divider: remember which region it resizes.
    function startDrag(e, region) {
        if (e.button !== 0) return;
        if (region === 'bottom' && state.bottom.pinned) return;
        e.preventDefault();
        drag = { region: region, handle: e.currentTarget, pointerId: e.pointerId };
        drag.handle.setPointerCapture(e.pointerId);
        drag.handle.classList.add('is-dragging');
        document.body.classList.add(region === 'bottom' ? 'is-resizing-y' : 'is-resizing-x');
    }

    // Convert the pointer position into a size for the dragged region.
    function sizeFromPointer(region, clientX, clientY) {
        if (region === 'side') return clientX - el('sidebar').getBoundingClientRect().left;
        if (region === 'right') return el('preview-pane').getBoundingClientRect().right - clientX;
        return el('bottom-dock').getBoundingClientRect().bottom - clientY;
    }

    // Store the new size; the DOM update runs once per animation frame.
    function onDragMove(e) {
        if (!drag || e.pointerId !== drag.pointerId) return;
        var value = sizeFromPointer(drag.region, e.clientX, e.clientY);
        if (drag.region === 'bottom') state.bottom.height = clamp('bottom', value);
        else state[drag.region].width = clamp(drag.region, value);
        if (!pendingFrame) pendingFrame = requestAnimationFrame(flushFrame);
    }

    // Write the pending size to the DOM (keeps dragging at 60fps).
    function flushFrame() {
        pendingFrame = 0;
        applyDom();
    }

    // Finish a drag and persist the size.
    function endDrag(e) {
        if (!drag || (e && e.pointerId !== drag.pointerId)) return;
        drag.handle.classList.remove('is-dragging');
        document.body.classList.remove('is-resizing-x', 'is-resizing-y');
        drag = null;
        save();
    }

    // Reset one region to its default size (double-click or Home key).
    function resetRegion(region) {
        if (region === 'bottom' && state.bottom.pinned) return;
        if (region === 'bottom') state.bottom.height = DEFAULTS.bottom.height;
        else state[region].width = DEFAULTS[region].width;
        applyDom();
        save();
    }

    // Keyboard resizing: arrows move the divider, Home resets it.
    function onDividerKey(e, region) {
        var grow = { side: 'ArrowRight', right: 'ArrowLeft', bottom: 'ArrowUp' }[region];
        var shrink = { side: 'ArrowLeft', right: 'ArrowRight', bottom: 'ArrowDown' }[region];
        if (region === 'bottom' && state.bottom.pinned) return;
        if (e.key === 'Home') { e.preventDefault(); resetRegion(region); return; }
        if (e.key !== grow && e.key !== shrink) return;
        e.preventDefault();
        var delta = e.key === grow ? KEY_STEP : -KEY_STEP;
        if (region === 'bottom') state.bottom.height = clamp('bottom', state.bottom.height + delta);
        else state[region].width = clamp(region, state[region].width + delta);
        applyDom();
        save();
    }

    // Wire one divider: drag, double-click reset, keyboard.
    function wireDivider(id, region) {
        var handle = el(id);
        if (!handle) return;
        handle.setAttribute('role', 'separator');
        handle.setAttribute('tabindex', '0');
        handle.setAttribute('aria-orientation', region === 'bottom' ? 'horizontal' : 'vertical');
        handle.setAttribute('aria-label', 'Resize ' + region + ' panel (double-click to reset)');
        handle.addEventListener('pointerdown', function (e) { startDrag(e, region); });
        handle.addEventListener('dblclick', function () { resetRegion(region); });
        handle.addEventListener('keydown', function (e) { onDividerKey(e, region); });
    }

    // ---- toggles and menus ------------------------------------------------

    // Open the layout preset menu from the title bar or status bar.
    function openPresetMenu(anchor) {
        var items = Object.keys(PRESETS).map(function (key) {
            return { label: PRESETS[key].label, hint: '', checked: state.preset === key,
                     icon: key === 'zen' ? 'maximize' : 'layout',
                     onSelect: function () { applyPreset(key); } };
        });
        items.push({ separator: true });
        items.push({ label: 'Toggle explorer', hint: 'Ctrl+B', icon: 'files', onSelect: function () { toggle('side'); } });
        items.push({ label: 'Toggle bottom panel', hint: 'Ctrl+J', icon: 'panel-bottom', onSelect: function () { toggle('bottom'); } });
        items.push({ label: 'Toggle preview', hint: '', icon: 'eye', onSelect: function () { toggle('right'); } });
        items.push({ separator: true });
        items.push({ label: 'Reset layout', icon: 'refresh', onSelect: reset });
        OwletUI.menu.open(anchor, items);
    }

    // Show a mobile view (editor | preview | console | ai) and sync the dock.
    function setMobileView(view) {
        document.documentElement.setAttribute('data-mobile-view', view);
        if (view === 'console') showDockTab('console');
        // Preview is a right-panel overlay on phones too (never a dock tab).
        if (view === 'preview') setOpen('right', true);
        if (view === 'editor') setOpen('bottom', false);
        document.querySelectorAll('#mobile-nav .mobile-tab').forEach(function (b) {
            b.setAttribute('aria-selected', b.getAttribute('data-mobile-view') === view ? 'true' : 'false');
        });
        if (view === 'ai') OwletUI.toast('AI chat arrives in a later UI phase', 'info', { duration: 2500 });
    }

    // Wire every title-bar, rail, status-bar, and dock control.
    function wireControls() {
        var layoutBtn = el('btn-layout');
        if (layoutBtn) layoutBtn.addEventListener('click', function () { openPresetMenu(layoutBtn); });
        var sbLayout = el('sb-layout');
        if (sbLayout) sbLayout.addEventListener('click', function () { openPresetMenu(sbLayout); });
        document.querySelectorAll('#activity-rail [data-view]').forEach(function (b) {
            b.addEventListener('click', function () { setView(b.getAttribute('data-view')); });
        });
        bindClick('sb-toggle-panel', function () { toggle('bottom'); });
        bindClick('sb-toggle-preview', function () { toggle('right'); });
        // Topbar quick toggles: explorer drawer, terminal dock, preview.
        bindClick('btn-toggle-explorer', function () { toggle('side'); });
        bindClick('btn-toggle-terminal', function () { toggleDockTab('terminal'); });
        bindClick('btn-toggle-preview', function () { toggle('right'); });
        bindClick('btn-preview-close', function () { setOpen('right', false); });
        bindClick('btn-dock-close', function () { setOpen('bottom', false); });
        bindClick('btn-dock-pin', function () { state.bottom.pinned = !state.bottom.pinned; applyDom(); save(); });
        bindClick('rail-help', function () { Owlet.app.toggleDialog('help-dialog', true); });
        bindClick('rail-settings', function () { Owlet.app.toggleDialog('settings-dialog', true); });
        // Optional pin button in the shared panel header: pinned = docked
        // (pushes the editor), unpinned = overlay drawer.
        var bar = el('sidebar-toolbar');
        if (bar && !el('btn-pin-side')) {
            var pin = document.createElement('button');
            pin.id = 'btn-pin-side';
            pin.className = 'btn-icon btn-sm';
            pin.type = 'button';
            pin.setAttribute('data-tip', 'Pin panel');
            pin.setAttribute('aria-label', 'Pin panel');
            pin.innerHTML = OwletUI.icon('pin');
            bar.appendChild(pin);
            pin.addEventListener('click', function () {
                state.side.pinned = !state.side.pinned;
                applyDom();
                save();
            });
        }
        // Overlay drawer: clicks inside the workbench but outside the panel
        // (editor, preview, dock) close it; rail and divider clicks don't.
        document.addEventListener('click', function (e) {
            if (!state.side.open || state.side.pinned) return;
            var sb = el('sidebar');
            var target = e.target;
            if (!sb || sb.contains(target)) return;
            if (target.closest && (target.closest('#activity-rail') || target.closest('#divider-side'))) return;
            var shell = el('shell');
            if (shell && shell.contains(target)) setOpen('side', false);
        });
        // Esc closes the overlay drawer too (docked panels ignore it).
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && state.side.open && !state.side.pinned) setOpen('side', false);
        });
        wireDividers();
        wireDockTabs();
    }

    // Shortcut for "element exists, then listen for click".
    function bindClick(id, fn) {
        var node = el(id);
        if (node) node.addEventListener('click', fn);
    }

    // Attach the three resize handles.
    function wireDividers() {
        wireDivider('divider-side', 'side');
        wireDivider('divider', 'right');
        wireDivider('divider-bottom', 'bottom');
        document.addEventListener('pointermove', onDragMove);
        document.addEventListener('pointerup', endDrag);
        document.addEventListener('pointercancel', endDrag);
    }

    // Dock tabs: clicking one shows its panel; logic-owned tabs keep working too.
    function wireDockTabs() {
        var tabs = el('dock-tabs');
        if (!tabs) return;
        tabs.addEventListener('click', function (e) {
            var btn = e.target.closest('.dock-tab');
            if (!btn) return;
            showDockTab(btn.getAttribute('data-dock'));
        });
    }

    // Global keys: Ctrl+B explorer, Ctrl+J bottom panel, Esc leaves zen.
    function wireKeys() {
        document.addEventListener('keydown', function (e) {
            var mod = e.ctrlKey || e.metaKey;
            if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') { e.preventDefault(); toggle('side'); }
            else if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'j') { e.preventDefault(); toggle('bottom'); }
            else if (e.key === '`' && mod) { syncDock(); setOpen('bottom', true); }
            else if (e.key === 'Escape' && state.preset === 'zen' && !document.querySelector('.dialog[style*="flex"]')) {
                applyPreset('classic');
            }
        });
        var terminalClose = el('btn-terminal-close');
        if (terminalClose) terminalClose.addEventListener('click', function () { syncDock(); });
    }

    // Mobile: bottom navigation tabs (Editor / Preview / Console / AI).
    function wireMobileNav() {
        document.querySelectorAll('#mobile-nav .mobile-tab').forEach(function (b) {
            b.addEventListener('click', function () { setMobileView(b.getAttribute('data-mobile-view')); });
        });
        if (mobileQuery && mobileQuery.addEventListener) {
            mobileQuery.addEventListener('change', function () { applyDom(); });
        }
    }

    // Recompute bottom height on window resize (debounced by rAF).
    function wireResize() {
        var timer = 0;
        window.addEventListener('resize', function () {
            clearTimeout(timer);
            timer = setTimeout(applyDom, 120);
        });
    }

    // Boot: restore state, apply it, wire controls.
    function init() {
        state = load();
        applyDom();
        wireControls();
        wireKeys();
        wireMobileNav();
        wireResize();
        document.documentElement.setAttribute('data-mobile-view', 'editor');
    }

    return {
        init: init,
        applyPreset: applyPreset,
        toggle: toggle,
        setOpen: setOpen,
        setView: setView,
        reset: reset,
        syncDock: syncDock,
        showDockTab: showDockTab,
        setMobileView: setMobileView,
        getState: function () { return JSON.parse(JSON.stringify(state)); },
        presets: PRESETS
    };
})();

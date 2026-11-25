// dialog.js — shared dialog plumbing used by every .dialog in index.html
// and by JS-built dialogs (.prompt-dialog, menus).
//
// What it adds on top of the markup:
//   - Escape closes (one handler for the whole app)
//   - Backdrop click closes (except .dialog--sticky / unsaved-input dialogs)
//   - Focus trap while open + focus returns to the opener
//   - .dialog-close buttons still work (existing markup keeps functioning)
//
// Existing callers keep using Owlet.app.toggleDialog / style.display — this
// module only OBSERVES display changes via a MutationObserver, so no logic
// file had to change.

window.OwletUI = window.OwletUI || {};

OwletUI.dialog = (function () {

    var openStack = [];   // dialogs currently visible, in open order
    var lastFocus = null; // element that had focus before the top dialog opened

    // Is this dialog element currently visible?
    function isOpen(el) {
        return el && el.style.display !== 'none' && el.offsetParent !== null;
    }

    // Focusable elements inside a dialog, in DOM order.
    function focusables(box) {
        return box.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        );
    }

    // Move focus into the dialog: first [data-autofocus], else the first
    // useful control (input > button), else the box itself.
    function focusInto(box) {
        var target = box.querySelector('[data-autofocus]')
            || box.querySelector('input, select, textarea')
            || box.querySelector('.dlg-x, button, [href]')
            || box;
        if (target && target.focus) target.focus({ preventScroll: true });
    }

    // Trap Tab/Shift+Tab inside the top dialog; Escape closes it.
    function onKeyDown(e) {
        // Prompt dialogs remove their own overlay, so forget any that left the page.
        openStack = openStack.filter(function (d) { return d.isConnected; });
        var top = openStack[openStack.length - 1];
        if (!top) return;
        var box = top.querySelector('.dialog-box') || top;

        if (e.key === 'Escape') {
            // Prompt dialogs handle their own Escape (capture phase in
            // dialogs.js) — don't double-close.
            if (top.classList.contains('prompt-dialog')) return;
            e.preventDefault();
            e.stopPropagation();
            closeDialog(top);
            return;
        }
        if (e.key !== 'Tab') return;

        var items = focusables(box);
        if (!items.length) { e.preventDefault(); box.focus(); return; }
        var first = items[0];
        var last = items[items.length - 1];
        var active = document.activeElement;
        // Wrap-around at both ends keeps focus inside the dialog.
        if (e.shiftKey && (active === first || !box.contains(active))) {
            e.preventDefault(); last.focus();
        } else if (!e.shiftKey && (active === last || !box.contains(active))) {
            e.preventDefault(); first.focus();
        }
    }

    // Backdrop click closes, unless the dialog opts out with .dialog--sticky.
    function onBackdropDown(e) {
        var top = openStack[openStack.length - 1];
        if (!top) return;
        if (e.target !== top) return;                       // clicked inside the box
        if (top.classList.contains('dialog--sticky')) return; // unsaved input dialogs
        if (top.classList.contains('prompt-dialog')) return;  // has own backdrop handler
        closeDialog(top);
    }

    // Track visibility: when a .dialog gets display != none we push it and
    // grab focus; when it hides we pop it and restore the opener's focus.
    function syncState() {
        var visible = [];
        document.querySelectorAll('.dialog').forEach(function (d) {
            if (d.style.display !== 'none') visible.push(d);
        });
        // A dialog just opened -> remember where focus was and move inside.
        visible.forEach(function (d) {
            if (openStack.indexOf(d) === -1) {
                if (!openStack.length) lastFocus = document.activeElement;
                var box = d.querySelector('.dialog-box');
                if (box && !box.hasAttribute('tabindex')) box.setAttribute('tabindex', '-1');
                focusInto(box || d);
            }
        });
        // A dialog just closed -> nothing to do per-dialog; stack rebuild below.
        openStack = visible;
        // Nothing open anymore -> give focus back to whoever opened the last one.
        if (!openStack.length && lastFocus) {
            var back = lastFocus;
            lastFocus = null;
            if (back && back.isConnected && back.focus) back.focus({ preventScroll: true });
        }
    }

    // Programmatic close that respects the same code path the X button uses.
    function closeDialog(dlg) {
        dlg.style.display = 'none';
        syncState();
    }

    // Watch every .dialog for display flips (MutationObserver = zero changes
    // needed inside app.js, share.js, clone.js, etc.).
    function observe() {
        var mo = new MutationObserver(syncState);
        document.querySelectorAll('.dialog').forEach(function (d) {
            mo.observe(d, { attributes: true, attributeFilter: ['style'] });
        });
        // Dialogs built later by JS (prompt/confirm) register on insertion.
        new MutationObserver(function (muts) {
            muts.forEach(function (m) {
                m.addedNodes.forEach(function (n) {
                    if (n.nodeType === 1 && n.classList && n.classList.contains('dialog')) {
                        mo.observe(n, { attributes: true, attributeFilter: ['style'] });
                        syncState();
                    }
                });
            });
        }).observe(document.body, { childList: true });
    }

    // Public close: close the top open dialog (or a given one).
    function close(dlg) {
        var target = dlg || openStack[openStack.length - 1];
        if (target) closeDialog(target);
    }

    // Wire once on DOMContentLoaded.
    function init() {
        document.addEventListener('keydown', onKeyDown, true);
        document.addEventListener('mousedown', onBackdropDown, true);
        // .dialog-close buttons: they already hide via app.js; syncState picks
        // up the display change — nothing to wire here.
        observe();
        syncState();
    }

    document.addEventListener('DOMContentLoaded', init);

    return { close: close, isOpen: isOpen };
})();

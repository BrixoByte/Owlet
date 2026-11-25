// tooltip.js — one shared tooltip element on <body>, positioned with
// position: fixed so it can never be clipped by an overflow:hidden panel.
// Any element with data-tip="text" gets a tip on hover or keyboard focus;
// data-tip-pos="top" | "right" changes the side (default: below).

window.OwletUI = window.OwletUI || {};

OwletUI.tooltip = (function () {
    var DELAY = 350;      // hover delay, matching the old CSS tooltip
    var GAP = 6;          // distance from the trigger element
    var EDGE = 4;         // minimum distance from the viewport edge

    var tip = null;       // the single tooltip node
    var current = null;   // element the tip is shown (or scheduled) for
    var timer = 0;

    // Create the tooltip node once, on first use.
    function ensure() {
        if (tip) return tip;
        tip = document.createElement('div');
        tip.className = 'owlet-tip';
        tip.setAttribute('role', 'tooltip');
        document.body.appendChild(tip);
        return tip;
    }

    // Show the tip for an element after measuring its position.
    function show(target) {
        var text = target.getAttribute('data-tip');
        if (!text) { hide(); return; }
        var node = ensure();
        node.textContent = text;
        node.style.visibility = 'hidden';
        node.style.display = 'block';
        place(node, target);
        node.style.visibility = '';
        current = target;
    }

    // Position the tip beside the trigger, then clamp inside the viewport.
    function place(node, target) {
        var pos = target.getAttribute('data-tip-pos') || 'bottom';
        var r = target.getBoundingClientRect();
        var tw = node.offsetWidth;
        var th = node.offsetHeight;
        var x, y;
        if (pos === 'top') {
            x = r.left + r.width / 2 - tw / 2;
            y = r.top - th - GAP;
        } else if (pos === 'right') {
            x = r.right + GAP;
            y = r.top + r.height / 2 - th / 2;
        } else {
            x = r.left + r.width / 2 - tw / 2;
            y = r.bottom + GAP;
        }
        x = Math.max(EDGE, Math.min(x, window.innerWidth - tw - EDGE));
        y = Math.max(EDGE, Math.min(y, window.innerHeight - th - EDGE));
        node.style.left = Math.round(x) + 'px';
        node.style.top = Math.round(y) + 'px';
    }

    // Hide the tip and cancel a pending show.
    function hide() {
        clearTimeout(timer);
        timer = 0;
        current = null;
        if (tip) tip.style.display = 'none';
    }

    // Schedule a tip when the pointer enters a [data-tip] element.
    function onOver(e) {
        var target = e.target.closest && e.target.closest('[data-tip]');
        if (!target) return;
        if (target === current) return;
        clearTimeout(timer);
        current = target;
        timer = setTimeout(function () { show(target); }, DELAY);
    }

    // Cancel/hide when the pointer leaves the tipped element.
    function onOut(e) {
        if (!current) return;
        var leaving = e.target.closest && e.target.closest('[data-tip]');
        if (leaving !== current) return;
        if (e.relatedTarget && current.contains(e.relatedTarget)) return;
        hide();
    }

    // Focus support: keyboard users see the same tips.
    function onFocus(e) {
        var target = e.target.closest && e.target.closest('[data-tip]');
        if (!target) return;
        clearTimeout(timer);
        current = target;
        show(target);
    }

    function onBlur(e) {
        if (current && e.target === current) hide();
    }

    // Wire delegated listeners once at boot.
    function init() {
        document.addEventListener('mouseover', onOver);
        document.addEventListener('mouseout', onOut);
        document.addEventListener('focusin', onFocus);
        document.addEventListener('focusout', onBlur);
        // Any click or scroll dismisses the tip immediately.
        document.addEventListener('pointerdown', hide, true);
        window.addEventListener('scroll', hide, true);
        window.addEventListener('resize', hide);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') hide();
        });
    }

    return { init: init, hide: hide };
})();

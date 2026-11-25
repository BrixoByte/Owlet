// menu.js — a reusable, keyboard-accessible popup menu (role="menu").
// Used by the menubar, layout/theme switches, and context menus.
//
// OwletUI.menu.open(anchorEl, items, options)
//   items: [{ label, icon?, hint?, checked?, disabled?, danger?, submenu?, onSelect }]
//        | { separator: true }
//        | { title: 'Group label' }
//   options: { x, y } to open at a point instead of under the anchor.
// Keys: ArrowUp/Down move, Home/End jump, Enter/Space choose,
//       ArrowRight/Left for submenus, Escape closes, type-to-jump.

window.OwletUI = window.OwletUI || {};

OwletUI.menu = (function () {
    var current = null;   // { el, items, index, anchor, onClose }

    // Create the menu element with one button per item.
    function build(items) {
        var el = document.createElement('div');
        el.className = 'menu';
        el.setAttribute('role', 'menu');
        items.forEach(function (item, i) {
            if (item.separator) {
                var sep = document.createElement('div');
                sep.className = 'menu-sep';
                sep.setAttribute('role', 'separator');
                el.appendChild(sep);
                return;
            }
            if (item.title) {
                var t = document.createElement('div');
                t.className = 'menu-title';
                t.textContent = item.title;
                el.appendChild(t);
                return;
            }
            el.appendChild(buildItem(item, i));
        });
        return el;
    }

    // One clickable row: reserved icon column, label, hint, check/submenu slot.
    function buildItem(item, index) {
        var row = document.createElement('button');
        row.className = 'menu-item' + (item.danger ? ' is-danger' : '');
        // menuitemcheckbox only when the item is actually checkable.
        var checkable = item.checked !== undefined;
        row.setAttribute('role', checkable ? 'menuitemcheckbox' : 'menuitem');
        if (checkable) row.setAttribute('aria-checked', item.checked ? 'true' : 'false');
        row.setAttribute('data-index', String(index));
        row.tabIndex = -1;
        if (item.disabled) row.disabled = true;
        // The icon column is ALWAYS rendered (empty when no icon) so labels align.
        row.innerHTML =
            '<span class="menu-ico">' + (item.icon ? OwletUI.icon(item.icon, 'icon-sm') : '') + '</span>'
            + '<span class="menu-label"></span>'
            + (item.hint ? '<span class="menu-kbd"></span>' : '')
            + (item.submenu ? '<span class="menu-sub">' + OwletUI.icon('chevron-right', 'icon-sm') + '</span>' : '')
            + (checkable && item.checked ? '<span class="menu-check">' + OwletUI.icon('check', 'icon-sm') + '</span>' : '');
        row.querySelector('.menu-label').textContent = item.label;
        if (item.hint) row.querySelector('.menu-kbd').textContent = item.hint;
        if (item.submenu) row.setAttribute('aria-haspopup', 'menu');
        row.addEventListener('click', function () { choose(index); });
        row.addEventListener('mousemove', function () { highlight(index); });
        return row;
    }

    // Visually and programmatically highlight one item.
    function highlight(index) {
        if (!current) return;
        var rows = current.el.querySelectorAll('.menu-item');
        rows.forEach(function (r) { r.setAttribute('aria-selected', 'false'); r.classList.remove('selected'); });
        var target = current.el.querySelector('[data-index="' + index + '"]');
        if (target && !target.disabled) {
            target.setAttribute('aria-selected', 'true');
            target.classList.add('selected');
            target.focus({ preventScroll: true });
            current.index = index;
        }
    }

    // Move the highlight by delta, skipping disabled rows.
    function move(delta) {
        var rows = current.items.length;
        var i = current.index;
        for (var step = 0; step < rows; step++) {
            i = (i + delta + rows) % rows;
            var item = current.items[i];
            if (item && !item.separator && !item.disabled) { highlight(i); return; }
        }
    }

    // Run the chosen item's action and close the menu.
    function choose(index) {
        var item = current && current.items[index];
        if (!item || item.disabled || item.separator) return;
        close();
        if (item.onSelect) item.onSelect(item);
    }

    // Keyboard support for the open menu.
    function onKeyDown(e) {
        if (!current) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); choose(current.index); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); close(); }
        else if (e.key === 'Home') { e.preventDefault(); highlight(firstEnabled()); }
        else if (e.key === 'End') { e.preventDefault(); highlight(lastEnabled()); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(current.index); }
        else if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'Tab') { close(); }
        else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { typeahead(e.key); }
    }

    // Type-ahead: jump to the next item whose label starts with the typed keys.
    var typeBuffer = '', typeTimer = null;
    function typeahead(ch) {
        typeBuffer += ch.toLowerCase();
        clearTimeout(typeTimer);
        typeTimer = setTimeout(function () { typeBuffer = ''; }, 600);
        var n = current.items.length;
        for (var step = 0; step < n; step++) {
            var i = (current.index + 1 + step) % n;
            var item = current.items[i];
            if (item && !item.separator && !item.disabled && item.label
                && item.label.toLowerCase().indexOf(typeBuffer) === 0) {
                highlight(i);
                return;
            }
        }
    }

    // Index of the first selectable item.
    function firstEnabled() {
        for (var i = 0; i < current.items.length; i++) {
            if (!current.items[i].separator && !current.items[i].disabled) return i;
        }
        return 0;
    }

    // Index of the last selectable item.
    function lastEnabled() {
        for (var i = current.items.length - 1; i >= 0; i--) {
            if (!current.items[i].separator && !current.items[i].disabled) return i;
        }
        return 0;
    }

    // Place the menu under the anchor (or at x/y) and keep it inside the viewport.
    function position(el, anchor, options) {
        var rect = anchor ? anchor.getBoundingClientRect() : { left: 0, bottom: 0, top: 0 };
        var x = options.x !== undefined ? options.x : rect.left;
        var y = options.y !== undefined ? options.y : rect.bottom + 4;
        var w = el.offsetWidth, h = el.offsetHeight;
        x = Math.min(x, window.innerWidth - w - 8);
        y = Math.min(y, window.innerHeight - h - 8);
        el.style.left = Math.max(8, x) + 'px';
        el.style.top = Math.max(8, y) + 'px';
    }

    // Close the open menu (if any) and return focus to the anchor.
    function close() {
        if (!current) return;
        var state = current;
        current = null;
        state.el.remove();
        document.removeEventListener('keydown', onKeyDown, true);
        document.removeEventListener('mousedown', onOutside, true);
        if (state.anchor && state.anchor.setAttribute) state.anchor.setAttribute('aria-expanded', 'false');
        if (state.anchor && state.anchor.focus && state.restoreFocus) state.anchor.focus({ preventScroll: true });
    }

    // Clicking anywhere outside the menu closes it.
    function onOutside(e) {
        if (current && !current.el.contains(e.target)) close();
    }

    // Open a menu. Returns the menu element.
    function open(anchor, items, options) {
        close();
        options = options || {};
        var el = build(items);
        document.body.appendChild(el);
        position(el, anchor, options);
        current = { el: el, items: items, index: -1, anchor: anchor, restoreFocus: true };
        if (anchor && anchor.setAttribute) anchor.setAttribute('aria-expanded', 'true');
        document.addEventListener('keydown', onKeyDown, true);
        document.addEventListener('mousedown', onOutside, true);
        highlight(firstEnabled());
        return el;
    }

    return { open: open, close: close };
})();

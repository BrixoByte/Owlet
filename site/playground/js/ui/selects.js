// selects.js — replaces native <select> popups with a Owlet-styled dropdown.
//
// The browser renders <select> option lists itself, so CSS can never style
// them. Instead the real <select> stays in the DOM (hidden) and a styled
// button + listbox takes its place:
//
//   <span class="dp-select">
//     <select class="dp-native">…</select>
//     <button class="dp-select-btn">Label ▾</button>
//   </span>   +  a fixed-position .dp-menu appended to <body> when opened
//
// Everything keeps working through the native element: .value, .selectedIndex,
// 'change' listeners, disabled state, and dynamically added <option>s (a
// MutationObserver rebuilds the menu). Opt out with data-native on the select.

window.OwletUI = window.OwletUI || {};

OwletUI.selects = (function () {
    var openWrap = null; // the wrapper whose menu is currently open

    // ---- open / close ----------------------------------------------------

    function closeMenu() {
        if (!openWrap) return;
        var wrap = openWrap;
        openWrap = null;
        wrap.classList.remove('is-open');
        wrap._menu.style.display = 'none';
        wrap._btn.setAttribute('aria-expanded', 'false');
        document.removeEventListener('mousedown', onDocDown, true);
        document.removeEventListener('scroll', onDocScroll, true);
        window.removeEventListener('resize', closeMenu);
        window.removeEventListener('blur', closeMenu);
    }

    function onDocDown(e) {
        if (!openWrap) return;
        if (openWrap.contains(e.target) || openWrap._menu.contains(e.target)) return;
        closeMenu();
    }

    function onDocScroll(e) {
        if (!openWrap) return;
        if (openWrap._menu.contains(e.target)) return; // scrolling the list itself
        closeMenu();
    }

    // Place the menu under the button (fixed, so dialogs can't clip it) and
    // flip above when there is no room below.
    function placeMenu(wrap) {
        var menu = wrap._menu;
        var r = wrap._btn.getBoundingClientRect();
        menu.style.minWidth = r.width + 'px';
        menu.style.display = 'block';
        var mh = menu.offsetHeight;
        var mw = menu.offsetWidth;
        var top = r.bottom + 4;
        if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
        var left = Math.min(r.left, window.innerWidth - mw - 8);
        menu.style.top = top + 'px';
        menu.style.left = Math.max(8, left) + 'px';
    }

    // ---- menu contents ----------------------------------------------------

    function menuItems(wrap) {
        return Array.prototype.slice.call(wrap._menu.querySelectorAll('.dp-option'));
    }

    function buildMenu(wrap) {
        var s = wrap._select;
        var menu = wrap._menu;
        menu.innerHTML = '';
        for (var i = 0; i < s.options.length; i++) {
            var opt = s.options[i];
            var item = document.createElement('button');
            item.type = 'button';
            item.className = 'dp-option';
            item.setAttribute('role', 'option');
            item.dataset.index = i;
            var text = document.createElement('span');
            text.className = 'dp-option-text';
            text.textContent = opt.text;
            item.appendChild(text);
            item.insertAdjacentHTML('beforeend', OwletUI.icon('check'));
            if (opt.disabled) item.disabled = true;
            item.setAttribute('aria-selected', i === s.selectedIndex ? 'true' : 'false');
            item.addEventListener('click', pickIndex.bind(null, wrap, i));
            menu.appendChild(item);
        }
    }

    // Reflect the real select's state in the custom control.
    function sync(wrap) {
        var s = wrap._select;
        var opt = s.options[s.selectedIndex];
        wrap._label.textContent = opt ? opt.text : '';
        wrap._btn.disabled = s.disabled;
        menuItems(wrap).forEach(function (item, i) {
            item.setAttribute('aria-selected', i === s.selectedIndex ? 'true' : 'false');
        });
    }

    function pickIndex(wrap, index) {
        var s = wrap._select;
        if (s.selectedIndex !== index) {
            s.selectedIndex = index;
            s.dispatchEvent(new Event('change', { bubbles: true }));
        }
        closeMenu();
        wrap._btn.focus();
    }

    // Focus the enabled option nearest to `start`, walking in `dir`.
    function focusItem(wrap, start, dir) {
        var items = menuItems(wrap);
        if (!items.length) return;
        var i = start;
        for (var n = 0; n < items.length; n++) {
            var idx = ((i % items.length) + items.length) % items.length;
            if (!items[idx].disabled) { items[idx].focus(); return; }
            i += (dir || 1);
        }
    }

    // ---- enhancement ----------------------------------------------------

    // Keep the custom label honest when code sets select.value directly
    // (the settings dialog does this when it loads preferences).
    function hookValue(wrap) {
        var s = wrap._select;
        var desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
        try {
            Object.defineProperty(s, 'value', {
                configurable: true,
                get: desc.get,
                set: function (v) { desc.set.call(s, v); sync(wrap); }
            });
        } catch (e) { /* older engines: label still syncs on change */ }
    }

    // Rebuild the menu whenever the options change (device/zoom/profile
    // selects are populated by JS after page load).
    function watch(wrap) {
        new MutationObserver(function () { buildMenu(wrap); sync(wrap); })
            .observe(wrap._select, {
                childList: true, subtree: true, characterData: true,
                attributes: true, attributeFilter: ['disabled', 'selected', 'label']
            });
    }

    function openMenu(wrap) {
        if (wrap._btn.disabled || openWrap === wrap) { closeMenu(); return; }
        closeMenu();
        openWrap = wrap;
        sync(wrap);
        placeMenu(wrap);
        wrap.classList.add('is-open');
        wrap._btn.setAttribute('aria-expanded', 'true');
        document.addEventListener('mousedown', onDocDown, true);
        document.addEventListener('scroll', onDocScroll, true);
        window.addEventListener('resize', closeMenu);
        window.addEventListener('blur', closeMenu);
        focusItem(wrap, Math.max(0, wrap._select.selectedIndex), 1);
    }

    function enhance(select) {
        if (!select || select.dataset.enhanced === '1' || select.multiple
                || select.size > 1 || select.hasAttribute('data-native')) return;
        select.dataset.enhanced = '1';

        var wrap = document.createElement('span');
        wrap.className = 'dp-select' + (select.className ? ' ' + select.className : '');
        select.parentNode.insertBefore(wrap, select);
        wrap.appendChild(select);
        select.classList.add('dp-native');
        select.setAttribute('aria-hidden', 'true');
        select.tabIndex = -1;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dp-select-btn';
        btn.setAttribute('aria-haspopup', 'listbox');
        btn.setAttribute('aria-expanded', 'false');
        if (select.getAttribute('aria-label')) btn.setAttribute('aria-label', select.getAttribute('aria-label'));
        var label = document.createElement('span');
        label.className = 'dp-select-label';
        btn.appendChild(label);
        btn.insertAdjacentHTML('beforeend', OwletUI.icon('chevron-down', 'dp-select-arrow'));
        wrap.appendChild(btn);

        var menu = document.createElement('span');
        menu.className = 'dp-menu';
        menu.setAttribute('role', 'listbox');
        menu.style.display = 'none';
        document.body.appendChild(menu);

        wrap._select = select;
        wrap._btn = btn;
        wrap._menu = menu;
        wrap._label = label;

        buildMenu(wrap);
        sync(wrap);
        watch(wrap);
        hookValue(wrap);

        btn.addEventListener('click', function () { openMenu(wrap); });
        btn.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (openWrap !== wrap) openMenu(wrap);
            }
        });
        menu.addEventListener('keydown', function (e) {
            var items = menuItems(wrap);
            var cur = items.indexOf(document.activeElement);
            if (e.key === 'Escape') { closeMenu(); btn.focus(); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(wrap, cur + 1, 1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(wrap, cur - 1, -1); }
            else if (e.key === 'Home') { e.preventDefault(); focusItem(wrap, 0, 1); }
            else if (e.key === 'End') { e.preventDefault(); focusItem(wrap, items.length - 1, -1); }
            else if (e.key === 'Tab') closeMenu();
        });
        select.addEventListener('change', function () { sync(wrap); });
    }

    // ---- boot -------------------------------------------------------------

    function init(root) {
        (root || document).querySelectorAll('select').forEach(enhance);
    }

    // Selects injected into the DOM later get enhanced too.
    function watchBody() {
        if (!document.body || !window.MutationObserver) return;
        new MutationObserver(function (muts) {
            muts.forEach(function (m) {
                Array.prototype.forEach.call(m.addedNodes, function (n) {
                    if (n.nodeType !== 1) return;
                    if (n.tagName === 'SELECT') enhance(n);
                    else if (n.querySelectorAll) n.querySelectorAll('select').forEach(enhance);
                });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { init(document); watchBody(); });
    } else {
        init(document);
        watchBody();
    }

    // Public: force a re-read of one select (or enhance one added manually).
    return {
        init: init,
        refresh: function (select) {
            var wrap = select && select.parentNode;
            if (wrap && wrap.classList && wrap.classList.contains('dp-select')) {
                buildMenu(wrap);
                sync(wrap);
            } else {
                enhance(select);
            }
        }
    };
})();

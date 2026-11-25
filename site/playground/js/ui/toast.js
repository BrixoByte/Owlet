// toast.js — short notifications (bottom-right). Used through OwletUI.toast().
// Usage: OwletUI.toast('Saved', 'success');
//        OwletUI.toast('File deleted', 'warn', { action: { label: 'Undo', onClick: fn } });
// type: 'info' | 'success' | 'warn' | 'error'
// options: { title, action: { label, onClick }, duration (ms; 0 = stays until closed) }

window.OwletUI = window.OwletUI || {};

(function () {
    var MAX_VISIBLE = 4;
    var DEFAULT_DURATION = 4000;
    var TYPE_ICON = { info: 'info', success: 'check', warn: 'alert', error: 'alert' };

    // Find or create the toast container (aria-live so screen readers announce it).
    function getRoot() {
        var root = document.querySelector('.toast-root');
        if (!root) {
            root = document.createElement('div');
            root.className = 'toast-root';
            root.setAttribute('role', 'status');
            root.setAttribute('aria-live', 'polite');
            document.body.appendChild(root);
        }
        return root;
    }

    // Remove the oldest toasts when there are more than MAX_VISIBLE.
    function trimOldest(root) {
        var items = root.querySelectorAll('.toast:not(.is-leaving)');
        while (items.length > MAX_VISIBLE) {
            dismiss(items[0]);
            items = root.querySelectorAll('.toast:not(.is-leaving)');
        }
    }

    // Animate a toast out, then remove it from the DOM.
    function dismiss(el) {
        if (!el || el.classList.contains('is-leaving')) return;
        el.classList.add('is-leaving');
        setTimeout(function () { el.remove(); }, 200);
    }

    // Build the icon + text + action + close button for one toast.
    function buildToast(message, type, options) {
        var el = document.createElement('div');
        el.className = 'toast toast--' + type;
        el.setAttribute('role', type === 'error' ? 'alert' : 'status');

        var icon = document.createElement('span');
        icon.className = 'toast-icon';
        icon.innerHTML = OwletUI.icon(TYPE_ICON[type] || 'info');
        el.appendChild(icon);

        var body = document.createElement('div');
        body.className = 'toast-body';
        if (options.title) {
            var title = document.createElement('strong');
            title.textContent = options.title;
            title.style.display = 'block';
            body.appendChild(title);
        }
        var text = document.createElement('div');
        text.textContent = message;
        body.appendChild(text);
        if (options.action) {
            var act = document.createElement('button');
            act.className = 'toast-action';
            act.textContent = options.action.label;
            act.addEventListener('click', function () {
                if (options.action.onClick) options.action.onClick();
                dismiss(el);
            });
            body.appendChild(act);
        }
        el.appendChild(body);

        var close = document.createElement('button');
        close.className = 'toast-close';
        close.setAttribute('aria-label', 'Dismiss notification');
        close.innerHTML = OwletUI.icon('x', 'icon-sm');
        close.addEventListener('click', function () { dismiss(el); });
        el.appendChild(close);
        return el;
    }

    // Add a progress bar that shrinks over the toast's lifetime.
    function addProgress(el, duration) {
        var bar = document.createElement('span');
        bar.className = 'toast-progress';
        bar.style.setProperty('--toast-duration', duration + 'ms');
        el.appendChild(bar);
    }

    // Show a toast. Returns a handle with dismiss() for long-running tasks.
    OwletUI.toast = function (message, type, options) {
        type = TYPE_ICON[type] ? type : 'info';
        options = options || {};
        var root = getRoot();
        var el = buildToast(String(message || ''), type, options);
        root.appendChild(el);
        trimOldest(root);

        var duration = options.duration === undefined ? DEFAULT_DURATION : options.duration;
        if (duration > 0) {
            addProgress(el, duration);
            setTimeout(function () { dismiss(el); }, duration);
        }
        return { dismiss: function () { dismiss(el); } };
    };
})();

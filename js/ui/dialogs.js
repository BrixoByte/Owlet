// dialogs.js — themed replacements for window.prompt / window.confirm.
// Both return Promises so callers stay async: prompt() resolves to the typed
// string or null (cancel), confirm() resolves to a boolean.

window.OwletUI = window.OwletUI || {};

OwletUI.dialogs = (function () {

    // Shared modal plumbing: overlay + box, Escape/backdrop = cancel.
    // buildContent(box, close) fills the box; close(value) resolves via done.
    function openModal(buildContent, done) {
        var overlay = document.createElement('div');
        overlay.className = 'dialog prompt-dialog';
        overlay.dataset.testid = 'dialog';
        var box = document.createElement('div');
        box.className = 'dialog-box dialog--sm prompt-box';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        function close(value) {
            document.removeEventListener('keydown', onKey, true);
            overlay.remove();
            done(value);
        }
        function onKey(e) {
            // Capture + stop so the app's global Escape handler can't close us.
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); }
        }
        document.addEventListener('keydown', onKey, true);
        overlay.addEventListener('mousedown', function (e) {
            if (e.target === overlay) close(null);
        });
        buildContent(box, close);
    }

    function btn(className, label) {
        var b = document.createElement('button');
        b.className = className;
        b.type = 'button';
        b.textContent = label;
        return b;
    }

    // prompt({ title, label, value, placeholder, okLabel, validate })
    // validate(value) -> error string to show, or '' to accept.
    function prompt(opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            openModal(function (box, close) {
                var head = document.createElement('header');
                head.className = 'dlg-head';
                head.innerHTML = '<div class="dlg-titles"><div class="dlg-title"></div></div>';
                head.querySelector('.dlg-title').textContent = opts.title || 'Enter value';
                box.appendChild(head);

                var body = document.createElement('div');
                body.className = 'dlg-body';

                if (opts.label) {
                    var lab = document.createElement('p');
                    lab.className = 'prompt-desc';
                    lab.textContent = opts.label;
                    body.appendChild(lab);
                }

                var input = document.createElement('input');
                input.type = 'text';
                input.className = 'prompt-input';
                input.value = opts.value || '';
                input.placeholder = opts.placeholder || '';
                input.spellcheck = false;
                input.autocomplete = 'off';
                body.appendChild(input);

                var err = document.createElement('p');
                err.className = 'prompt-error';
                err.hidden = true;
                body.appendChild(err);
                box.appendChild(body);

                var actions = document.createElement('footer');
                actions.className = 'dlg-foot';
                var cancel = btn('btn btn-ghost btn-sm', 'Cancel');
                var ok = btn('btn btn-primary btn-sm', opts.okLabel || 'OK');
                actions.appendChild(cancel);
                actions.appendChild(ok);
                box.appendChild(actions);

                function submit() {
                    var v = input.value;
                    if (opts.validate) {
                        var msg = opts.validate(v);
                        if (msg) {
                            err.textContent = msg;
                            err.hidden = false;
                            input.classList.add('is-invalid');
                            input.focus();
                            return;
                        }
                    }
                    close(v);
                }
                ok.addEventListener('click', submit);
                cancel.addEventListener('click', function () { close(null); });
                input.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') { e.preventDefault(); submit(); }
                });
                input.addEventListener('input', function () {
                    err.hidden = true;
                    input.classList.remove('is-invalid');
                });
                input.focus();
                input.select();
            }, resolve);
        });
    }

    // confirm({ title, message, okLabel, danger }) — danger makes OK red.
    function confirm(opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            openModal(function (box, close) {
                var head = document.createElement('header');
                head.className = 'dlg-head';
                head.innerHTML = '<div class="dlg-titles"><div class="dlg-title"></div></div>';
                head.querySelector('.dlg-title').textContent = opts.title || 'Are you sure?';
                box.appendChild(head);

                var body = document.createElement('div');
                body.className = 'dlg-body';
                if (opts.message) {
                    var msg = document.createElement('p');
                    msg.className = 'prompt-desc';
                    msg.textContent = opts.message;
                    body.appendChild(msg);
                }
                box.appendChild(body);

                var actions = document.createElement('footer');
                actions.className = 'dlg-foot';
                var cancel = btn('btn btn-ghost btn-sm', 'Cancel');
                var ok = btn('btn btn-sm ' + (opts.danger ? 'btn-danger' : 'btn-primary'), opts.okLabel || 'OK');
                actions.appendChild(cancel);
                actions.appendChild(ok);
                box.appendChild(actions);

                ok.addEventListener('click', function () { close(true); });
                cancel.addEventListener('click', function () { close(false); });
                box.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') { e.preventDefault(); close(true); }
                });
                ok.focus();
            }, function (v) { resolve(v === true); });
        });
    }

    return { prompt: prompt, confirm: confirm };
})();

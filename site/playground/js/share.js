// share.js — share the current project as a link, with no server involved.
//
// Public link  (#p=…): the whole project is deflate-compressed into the URL
//   hash — anyone who opens the link gets their own in-memory copy.
// Private link (#s=…): the same payload is AES-GCM encrypted. The random key
//   is shown separately and must be sent through a private channel; without
//   it the link cannot be opened.
//
// Import runs at boot by reading location.hash (after app.init, so state and
// storage are already up).

window.Owlet = window.Owlet || {};

Owlet.share = (function () {
    var PUBLIC_TAG = 'p';
    var PRIVATE_TAG = 's';

    function el(id) { return document.getElementById(id); }
    function status(msg) { if (Owlet.ui && Owlet.ui.status) Owlet.ui.status(msg); }

    // ---------- base64url helpers -----------------------------------------

    function b64url(bytes) {
        var bin = '';
        for (var i = 0; i < bytes.length; i += 0x8000) {
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function unb64url(s) {
        var bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
        var out = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    }

    // ---------- pack / unpack ----------------------------------------------
    // 'z:' = deflate-raw compressed, 'j:' = plain JSON (no CompressionStream).

    async function pack() {
        var json = JSON.stringify({ name: Owlet.state.projectName, files: Owlet.state.files });
        if (window.CompressionStream) {
            var stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
            var buf = await new Response(stream).arrayBuffer();
            return 'z:' + b64url(new Uint8Array(buf));
        }
        return 'j:' + b64url(new TextEncoder().encode(json));
    }

    async function unpack(payload) {
        var tag = payload.slice(0, 2);
        var data = unb64url(payload.slice(2));
        var text;
        if (tag === 'z:') {
            var stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
            text = new TextDecoder().decode(await new Response(stream).arrayBuffer());
        } else if (tag === 'j:') {
            text = new TextDecoder().decode(data);
        } else {
            throw new Error('Unrecognised share payload');
        }
        return JSON.parse(text);
    }

    // ---------- link builders ----------------------------------------------

    function linkFor(hash) {
        return location.origin + location.pathname + '#' + hash;
    }

    async function buildPublic() {
        return linkFor(PUBLIC_TAG + '=' + await pack());
    }

    // AES-GCM: iv+ciphertext go in the link; the raw key is sent separately.
    async function buildPrivate() {
        var plain = new TextEncoder().encode(await pack());
        var key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        var iv = crypto.getRandomValues(new Uint8Array(12));
        var ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plain));
        var raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
        return { link: linkFor(PRIVATE_TAG + '=' + b64url(iv) + '.' + b64url(ct)), key: b64url(raw) };
    }

    async function decryptPrivate(payload, keyB64) {
        var parts = payload.split('.');
        if (parts.length !== 2) throw new Error('Bad private link');
        var key = await crypto.subtle.importKey('raw', unb64url(keyB64.trim()), { name: 'AES-GCM' }, false, ['decrypt']);
        var buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64url(parts[0]) }, key, unb64url(parts[1]));
        return new TextDecoder().decode(buf);
    }

    // ---------- import (#p= / #s= in the URL) -------------------------------

    function openFirst() {
        var files = Owlet.state.listFiles();
        Owlet.state.openFile(files.indexOf('index.html') !== -1 ? 'index.html' : files[0]);
        if (Owlet.preview && Owlet.preview.update) Owlet.preview.update();
    }

    async function loadPayload(payload) {
        var data = await unpack(payload);
        Owlet.state.loadFiles(data.files || {}, data.name || 'shared');
        openFirst();
        status('Shared project loaded — press Ctrl+S to keep your own copy.');
    }

    async function importFromHash() {
        var h = location.hash || '';
        try {
            if (h.indexOf('#' + PUBLIC_TAG + '=') === 0) {
                await loadPayload(h.slice(3));
            } else if (h.indexOf('#' + PRIVATE_TAG + '=') === 0) {
                var key = prompt('This project link is private.\nPaste the share key:');
                if (!key) return;
                var plain = await decryptPrivate(h.slice(3), key);
                await loadPayload(plain);
            }
        } catch (e) {
            status('Share link could not be opened (wrong key or broken link).');
        }
    }

    // ---------- share dialog ------------------------------------------------

    // Show exactly one of the dialog's state blocks.
    // states: 'empty' | 'generating' | 'ready'
    function setState(state) {
        var map = { empty: 'share-empty', generating: 'share-generating', ready: 'share-ready' };
        Object.keys(map).forEach(function (k) {
            var node = el(map[k]);
            if (node) node.hidden = (k !== state);
        });
        if (state !== 'ready') {
            var err = el('share-error');
            if (err) err.hidden = true;
            var longNote = el('share-long-note');
            if (longNote) longNote.hidden = true;
        }
    }

    // Keep the Public/Private option cards' check rings in sync.
    function syncCards() {
        var kind = document.querySelector('input[name="share-kind"]:checked');
        document.querySelectorAll('[data-share-card]').forEach(function (card) {
            var on = kind && card.getAttribute('data-share-card') === kind.value;
            card.classList.toggle('is-selected', on);
            var radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = on;
        });
    }

    async function refresh() {
        var linkEl = el('share-link');
        var keyWrap = el('share-key-wrap');
        var keyEl = el('share-key');
        var note = el('share-note');
        var errBox = el('share-error');
        var errText = el('share-error-text');
        var kind = document.querySelector('input[name="share-kind"]:checked');
        if (!linkEl) return;
        syncCards();
        if (note) note.textContent = '';
        if (!Owlet.state.listFiles().length) {
            linkEl.value = '';
            setState('empty');
            return;
        }
        setState('generating');
        if (keyWrap) keyWrap.hidden = true;
        if (errBox) errBox.hidden = true;
        var longNote = el('share-long-note');
        if (longNote) longNote.hidden = true;
        try {
            if (kind && kind.value === 'private') {
                var p = await buildPrivate();
                linkEl.value = p.link;
                if (keyEl) keyEl.value = p.key;
                if (keyWrap) keyWrap.hidden = false;
            } else {
                linkEl.value = await buildPublic();
            }
            setState('ready');
            if (linkEl.value.length > 8000 && longNote) longNote.hidden = false;
        } catch (e) {
            linkEl.value = '';
            setState('ready');
            if (errText) errText.textContent = 'Could not build a link: ' + e.message;
            if (errBox) errBox.hidden = false;
        }
    }

    function bindCopy(btnId, inputId) {
        var btn = el(btnId);
        if (!btn) return;
        btn.addEventListener('click', function () {
            var input = el(inputId);
            if (!input || !input.value || input.value.indexOf('…') !== -1) return;
            input.select();
            var done = function () {
                status('Copied to clipboard.');
                // Brief "Copied" state on the button itself.
                var label = btn.innerHTML;
                btn.innerHTML = OwletUI.icon('check', 'icon-sm') + 'Copied';
                btn.disabled = true;
                setTimeout(function () { btn.innerHTML = label; btn.disabled = false; }, 1500);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(input.value).then(done, function () { document.execCommand('copy'); done(); });
            } else {
                document.execCommand('copy'); done();
            }
        });
    }

    function openDialog() {
        Owlet.app.toggleDialog('share-dialog', true);
        refresh();
    }

    function init() {
        var dlg = el('share-dialog');
        if (!dlg) return;
        dlg.addEventListener('change', function (e) {
            if (e.target && e.target.name === 'share-kind') refresh();
        });
        bindCopy('share-copy', 'share-link');
        bindCopy('share-copy-key', 'share-key');
        // Retry after a failed build.
        var retry = el('share-retry');
        if (retry) retry.addEventListener('click', refresh);
        // Empty state: close the dialog and open the real New file flow.
        var newFile = el('share-new-file');
        if (newFile) newFile.addEventListener('click', function () {
            Owlet.app.toggleDialog('share-dialog', false);
            var btn = document.getElementById('btn-new-file');
            if (btn) btn.click();
        });
        syncCards();
    }

    // Dialog wiring + hash import run after app.init (script order guarantees it).
    document.addEventListener('DOMContentLoaded', function () {
        init();
        importFromHash();
    });

    return { openDialog: openDialog, importFromHash: importFromHash };
})();

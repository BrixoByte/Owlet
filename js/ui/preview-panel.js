// preview-panel.js — the Live Preview toolbar and viewport.
// preview.js still renders the iframe (srcdoc). This module adds: the URL bar,
// device presets, rotate, zoom, drag-to-resize viewport with a size readout,
// the device frame, the light/dark surround, auto-refresh pause, a loading
// state, an error banner that links to file:line, and an inspector stub.

window.OwletUI = window.OwletUI || {};

OwletUI.previewPanel = (function () {
    var DEVICES = {
        responsive: { label: 'Responsive', w: 0, h: 0 },
        mobile:     { label: 'Mobile 390 × 844', w: 390, h: 844 },
        tablet:     { label: 'Tablet 768 × 1024', w: 768, h: 1024 },
        laptop:     { label: 'Laptop 1366 × 768', w: 1366, h: 768 },
        desktop:    { label: 'Desktop 1920 × 1080', w: 1920, h: 1080 },
        custom:     { label: 'Custom size', w: 0, h: 0 }
    };
    var ZOOMS = [50, 75, 100];
    var MIN_W = 240, MIN_H = 200;
    var prefs = { device: 'responsive', zoom: 100, auto: true, framed: false, light: false, rotated: false, w: 412, h: 915 };
    var loadingTimer = 0;
    var drag = null;

    // Read saved preview preferences over the defaults above.
    function loadPrefs() {
        var saved = OwletUI.prefs.get('preview', {});
        Object.keys(saved || {}).forEach(function (k) { prefs[k] = saved[k]; });
    }

    // Save the preview preferences.
    function savePrefs() {
        OwletUI.prefs.set('preview', prefs);
    }

    // Element helper.
    function el(id) { return document.getElementById(id); }

    // Build the device and zoom dropdown options (single source: DEVICES / ZOOMS).
    function fillSelects() {
        var device = el('preview-device');
        if (device) {
            device.innerHTML = '';
            Object.keys(DEVICES).forEach(function (key) {
                device.appendChild(option(key, DEVICES[key].label));
            });
            device.value = prefs.device;
        }
        var zoom = el('preview-zoom');
        if (zoom) {
            zoom.innerHTML = '';
            ZOOMS.forEach(function (z) { zoom.appendChild(option(String(z), z + '%')); });
            zoom.value = String(prefs.zoom);
        }
    }

    // A simple <option> element.
    function option(value, label) {
        var o = document.createElement('option');
        o.value = value;
        o.textContent = label;
        return o;
    }

    // Size of the viewport in CSS pixels for the current device (0 = fill).
    function targetSize() {
        if (prefs.device === 'custom') return { w: prefs.w, h: prefs.h };
        var d = DEVICES[prefs.device];
        return { w: d.w, h: d.h };
    }

    // Apply device size, rotation, zoom and frame to the viewport element.
    function applyViewport() {
        var vp = el('preview-viewport');
        if (!vp) return;
        var size = targetSize();
        if (!size.w) {
            vp.style.width = '100%';
            vp.style.height = '100%';
        } else {
            var w = prefs.rotated ? size.h : size.w;
            var h = prefs.rotated ? size.w : size.h;
            vp.style.width = w + 'px';
            vp.style.height = h + 'px';
        }
        vp.style.transform = 'scale(' + prefs.zoom / 100 + ')';
        vp.classList.toggle('is-framed', prefs.framed);
        var stage = el('preview-stage');
        if (stage) stage.classList.toggle('is-light', prefs.light);
        updateReadout();
    }

    // Footer text: current viewport size in pixels.
    function updateReadout() {
        var vp = el('preview-viewport');
        var out = el('preview-size');
        if (!vp || !out) return;
        out.textContent = Math.round(vp.offsetWidth) + ' × ' + Math.round(vp.offsetHeight);
    }

    // Change the device preset from the dropdown.
    function setDevice(key) {
        prefs.device = DEVICES[key] ? key : 'responsive';
        applyViewport();
        savePrefs();
    }

    // Swap width and height.
    function rotate() {
        prefs.rotated = !prefs.rotated;
        applyViewport();
        savePrefs();
    }

    // Set the zoom level (50, 75 or 100 percent).
    function setZoom(value) {
        prefs.zoom = Number(value) || 100;
        applyViewport();
        savePrefs();
    }

    // ---- drag to resize ------------------------------------------------------

    // Begin dragging a handle: remember the start size and pointer.
    function startResize(e) {
        var vp = el('preview-viewport');
        if (!vp) return;
        e.preventDefault();
        drag = { mode: e.currentTarget.getAttribute('data-handle'), x: e.clientX, y: e.clientY,
                 w: vp.offsetWidth, h: vp.offsetHeight, pointerId: e.pointerId };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.classList.add('is-active');
        vp.classList.add('is-dragging');
        document.body.classList.add(drag.mode === 'b' ? 'is-resizing-y' : 'is-resizing-x');
        readoutVisible(true);
    }

    // Follow the pointer; divide by zoom so the handle stays under the cursor.
    function moveResize(e) {
        if (!drag || e.pointerId !== drag.pointerId) return;
        var z = prefs.zoom / 100;
        var dx = (e.clientX - drag.x) / z;
        var dy = (e.clientY - drag.y) / z;
        var w = drag.mode !== 'b' ? Math.max(MIN_W, Math.round(drag.w + dx)) : drag.w;
        var h = drag.mode !== 'r' ? Math.max(MIN_H, Math.round(drag.h + dy)) : drag.h;
        prefs.device = 'custom';
        prefs.w = w;
        prefs.h = h;
        if (el('preview-device')) el('preview-device').value = 'custom';
        applyViewport();
        showReadoutText(w + ' × ' + h);
    }

    // Stop dragging and save the chosen size.
    function endResize(e) {
        if (!drag || (e && e.pointerId !== drag.pointerId)) return;
        document.querySelectorAll('.preview-handle.is-active').forEach(function (h) { h.classList.remove('is-active'); });
        var vp = el('preview-viewport');
        if (vp) vp.classList.remove('is-dragging');
        document.body.classList.remove('is-resizing-x', 'is-resizing-y');
        drag = null;
        readoutVisible(false);
        savePrefs();
    }

    // Show or hide the size bubble above the viewport.
    function readoutVisible(on) {
        var r = el('preview-readout');
        if (r) r.classList.toggle('is-visible', on);
    }

    // Set the text of the size bubble.
    function showReadoutText(text) {
        var r = el('preview-readout');
        if (r) r.textContent = text;
    }

    // ---- loading, auto-refresh, errors ------------------------------------------

    // Show the skeleton for a moment while the iframe rebuilds.
    function showLoading() {
        var box = el('preview-loading');
        if (!box) return;
        box.classList.add('is-visible');
        clearError();
        clearTimeout(loadingTimer);
        loadingTimer = setTimeout(hideLoading, 700);
        setStatus('Refreshing…');
    }

    // Hide the skeleton (also called when the iframe finishes loading).
    function hideLoading() {
        var box = el('preview-loading');
        if (box) box.classList.remove('is-visible');
        setStatus(prefs.auto ? 'Live' : 'Paused');
    }

    // Footer status text ("Live", "Paused", "No HTML file").
    function setStatus(text) {
        var s = el('preview-status');
        if (s) s.textContent = text;
    }

    // Wrap the logic's scheduler so auto-refresh can be paused in the UI.
    function wrapScheduler() {
        if (!Owlet.preview || !Owlet.preview.scheduleUpdate) return;
        var original = Owlet.preview.scheduleUpdate;
        Owlet.preview.scheduleUpdate = function () {
            if (!prefs.auto) { setStatus('Paused — press Refresh'); return; }
            showLoading();
            original();
        };
    }

    // Show the error banner for one console error from the preview.
    function showError(err) {
        var box = el('preview-error');
        if (!box) return;
        el('preview-error-msg').textContent = err.message;
        var link = el('preview-error-link');
        var known = err.file && Owlet.state.files[err.file] !== undefined;
        link.textContent = known ? err.file + ':' + err.line : (err.file || 'preview');
        link.onclick = known ? function () {
            OwletUI.emit('ui:file-open', { path: err.file, line: err.line, col: err.col });
        } : null;
        box.classList.add('is-visible');
        OwletUI.setPreviewError(err);
    }

    // Hide the error banner.
    function clearError() {
        var box = el('preview-error');
        if (box) box.classList.remove('is-visible');
        OwletUI.setPreviewError(null);
    }

    // Show the banner for project errors that console.js has mapped to file:line.
    function listenForErrors() {
        window.addEventListener('owlet:console-entry', function (e) {
            var entry = e.detail || {};
            if (entry.origin !== 'project' || entry.level !== 'error' || entry.kind === 'console') return;
            showError({ message: String(entry.message || '').split('\n')[0], file: entry.file || '', line: entry.line || 0, col: entry.column || 0 });
        });
    }

    // Path shown in the URL bar: the entry HTML file, like preview.js picks it.
    function updateUrlBar() {
        var files = Owlet.state.listFiles().filter(function (p) { return /\.html?$/i.test(p); });
        var entry = files.indexOf('index.html') !== -1 ? 'index.html' : files[0];
        var path = el('preview-path');
        if (path) path.textContent = entry ? '/' + entry : '/ (no HTML file)';
        if (!entry) setStatus('No HTML file');
    }

    // ---- wiring -------------------------------------------------------------------

    // Toolbar controls: device, zoom, rotate, toggles, inspector.
    function wireToolbar() {
        var device = el('preview-device');
        if (device) device.addEventListener('change', function () { setDevice(device.value); });
        var zoom = el('preview-zoom');
        if (zoom) zoom.addEventListener('change', function () { setZoom(zoom.value); });
        bindClick('btn-preview-rotate', rotate);
        bindChange('preview-auto', function (on) { prefs.auto = on; savePrefs(); hideLoading(); });
        bindChange('preview-frame-toggle', function (on) { prefs.framed = on; applyViewport(); savePrefs(); });
        bindClick('btn-preview-surface', function () { prefs.light = !prefs.light; applyViewport(); savePrefs(); });
        bindClick('btn-preview-inspect', toggleInspector);
        bindClick('btn-refresh-preview', showLoading);
        bindClick('btn-preview-error-close', clearError);
        var auto = el('preview-auto');
        if (auto) auto.checked = prefs.auto;
        var framed = el('preview-frame-toggle');
        if (framed) framed.checked = prefs.framed;
    }

    // Toggle the inspector stub panel (element picking comes later).
    function toggleInspector() {
        var stub = el('preview-inspector-stub');
        var btn = el('btn-preview-inspect');
        if (!stub) return;
        var on = !stub.classList.contains('is-visible');
        stub.classList.toggle('is-visible', on);
        if (btn) btn.setAttribute('aria-pressed', String(on));
    }

    // Attach a click handler when the element exists.
    function bindClick(id, fn) {
        var node = el(id);
        if (node) node.addEventListener('click', fn);
    }

    // Attach a change handler that passes the checkbox state.
    function bindChange(id, fn) {
        var node = el(id);
        if (node) node.addEventListener('change', function () { fn(node.checked); });
    }

    // Drag handles on the viewport edges and corner.
    function wireHandles() {
        document.querySelectorAll('#preview-viewport .preview-handle').forEach(function (h) {
            h.addEventListener('pointerdown', startResize);
        });
        document.addEventListener('pointermove', moveResize);
        document.addEventListener('pointerup', endResize);
        document.addEventListener('pointercancel', endResize);
    }

    // Iframe load hides the skeleton; resizing refreshes the readout.
    function wireFrame() {
        var frame = el('preview-frame');
        if (frame) frame.addEventListener('load', hideLoading);
        window.addEventListener('resize', updateReadout);
        Owlet.state.on('files:changed', updateUrlBar);
        Owlet.state.on('project:loaded', updateUrlBar);
    }

    // Start the preview panel.
    function init() {
        loadPrefs();
        fillSelects();
        applyViewport();
        wireToolbar();
        wireHandles();
        wireFrame();
        listenForErrors();
        wrapScheduler();
        updateUrlBar();
        setStatus(prefs.auto ? 'Live' : 'Paused');
    }

    return { init: init, setDevice: setDevice, rotate: rotate, setZoom: setZoom, showLoading: showLoading };
})();

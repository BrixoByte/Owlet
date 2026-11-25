// boot.js — starts the UI layer. Loaded AFTER app.js, so the logic modules
// (editor, tabs, file tree, console, preview, terminal) are already running
// when these listeners fire. Order matters: theme first, then the shell,
// then the panels that decorate it, then demo data.

window.OwletUI = window.OwletUI || {};

document.addEventListener('DOMContentLoaded', function () {
    OwletUI.theme.init();
    OwletUI.tooltip.init();
    OwletUI.layout.init();
    OwletUI.explorer.init();
    OwletUI.editorChrome.init();
    OwletUI.previewPanel.init();
    OwletUI.dock.init();
    OwletUI.statusBar.init();
    OwletUI.menubar.init();
    bindCommandBar();
    enableLayoutDebug();
    OwletUI.mock.load();
});

// Loading skeleton (index.html #boot-skeleton): stays at least 1.2 s so the
// reload never flashes, and is force-removed at 3 s if a CDN asset is slow.
var SKELETON_MIN_MS = 1200;
var SKELETON_MAX_MS = 3000;

function hideBootSkeleton() {
    var sk = document.getElementById('boot-skeleton');
    if (!sk) return;
    var start = Date.now();
    var finished = false;
    function finish() {
        if (finished) return;
        finished = true;
        var wait = Math.max(0, SKELETON_MIN_MS - (Date.now() - start));
        setTimeout(function () {
            sk.classList.add('is-done');
            sk.setAttribute('aria-busy', 'false');
            setTimeout(function () { sk.remove(); }, 400);
        }, wait);
    }
    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish);
    setTimeout(finish, SKELETON_MAX_MS);
}

hideBootSkeleton();

// Opt-in layout debugger: open the page with ?debuglayout to outline every region.
function enableLayoutDebug() {
    if (window.location.search.indexOf('debuglayout') === -1) return;
    document.documentElement.classList.add('debug-layout');
    var regions = [
        ['topbar', 'Title bar'], ['activity-rail', 'Rail'], ['sidebar', 'Explorer'],
        ['editor-pane', 'Editor'], ['preview-pane', 'Preview'], ['bottom-dock', 'Bottom panel']
    ];
    regions.forEach(function (r) {
        var node = document.getElementById(r[0]);
        if (!node) return;
        var label = document.createElement('span');
        label.className = 'debug-label';
        label.textContent = r[1] + ' (' + node.clientWidth + ' × ' + node.clientHeight + ')';
        node.appendChild(label);
    });
}

// Clicking the fake search field in the title bar opens the real command palette.
function bindCommandBar() {
    var bar = document.getElementById('command-bar');
    if (bar) bar.addEventListener('click', function () {
        if (Owlet.app && Owlet.app.openPalette) Owlet.app.openPalette();
    });
}

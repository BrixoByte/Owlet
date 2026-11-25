// sw.js — Owlet service worker (Phase 7).
// Strategy: cache-first for the app shell + CDN libraries (versioned cache name
// so updates bust cleanly), network-first for everything else.
// NOTE: service workers only work over http(s) or localhost — never file://.

var CACHE_NAME = 'owlet-v1';

// App-shell files we always want available offline.
var SHELL = [
    './',
    './index.html',
    './css/style.css',
    './js/state.js',
    './js/storage.js',
    './js/editor.js',
    './js/tabs.js',
    './js/filetree.js',
    './js/preview.js',
    './js/console.js',
    './js/lint.js',
    './js/python.js',
    './js/terminal.js',
    './js/sandbox.js',
    './js/compiler.js',
    './js/app.js',
    './manifest.json'
];

// Install: pre-cache the app shell.
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(SHELL);
        })
    );
    self.skipWaiting();
});

// Activate: drop old caches so a version bump cleans up.
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys.filter(function (k) { return k !== CACHE_NAME; })
                    .map(function (k) { return caches.delete(k); })
            );
        })
    );
    self.clients.claim();
});

// Fetch: cache-first for same-origin + CDN assets, network-first otherwise.
self.addEventListener('fetch', function (event) {
    var req = event.request;
    if (req.method !== 'GET') return;

    var url = new URL(req.url);
    var isSameOrigin = url.origin === self.location.origin;
    var isCdn = /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.test(url.host);

    if (isSameOrigin || isCdn) {
        // Cache-first: serve from cache, fall back to network, then cache it.
        event.respondWith(
            caches.match(req).then(function (cached) {
                return cached || fetch(req).then(function (res) {
                    if (res.ok) {
                        var clone = res.clone();
                        caches.open(CACHE_NAME).then(function (cache) {
                            cache.put(req, clone);
                        });
                    }
                    return res;
                });
            })
        );
    } else {
        // Everything else (sandbox APIs, compiler APIs): straight to network.
        event.respondWith(fetch(req));
    }
});

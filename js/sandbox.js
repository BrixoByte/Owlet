// sandbox.js — BYOK cloud sandbox adapters (Phase 5).
// Lets the user connect a free Daytona / E2B / Modal / Upstash Box account and
// get a real Node.js + bash terminal. Keys live in localStorage only.
// If a provider blocks browser calls (CORS), the user can set a proxy URL —
// see the Cloudflare Worker snippet in README.md.

window.Owlet = window.Owlet || {};

Owlet.sandbox = (function () {
    // Provider registry: each adapter knows its REST base URL and auth header.
    // `test` does a cheap authenticated GET to verify the key works.
    var PROVIDERS = {
        daytona: {
            name: 'Daytona',
            baseUrl: 'https://app.daytona.io/api',
            authHeader: function (key) { return { Authorization: 'Bearer ' + key }; },
            testPath: '/sandbox'
        },
        e2b: {
            name: 'E2B',
            baseUrl: 'https://api.e2b.dev',
            authHeader: function (key) { return { 'X-API-Key': key }; },
            testPath: '/sandboxes'
        },
        modal: {
            name: 'Modal',
            baseUrl: 'https://api.modal.com',
            authHeader: function (key) { return { Authorization: 'Token ' + key }; },
            testPath: '/v1/workspaces'
        },
        upstash: {
            name: 'Upstash Box',
            baseUrl: 'https://api.upstash.com/box/v1',
            authHeader: function (key) { return { Authorization: 'Bearer ' + key }; },
            testPath: '/boxes'
        }
    };

    var current = null;   // active provider id
    var session = null;   // { provider, sandboxId, wsUrl }

    // Called once by app.js.
    function init() {
        current = Owlet.settings.get('sandboxProvider') || null;
    }

    // Route a request through the user's proxy URL when configured.
    function apiUrl(provider, path) {
        var direct = provider.baseUrl + path;
        var proxy = Owlet.settings.get('proxyUrl');
        if (proxy) return proxy.replace(/\/$/, '') + '?url=' + encodeURIComponent(direct);
        return direct;
    }

    // Authenticated fetch helper — adds the provider's key header.
    async function apiFetch(provider, path, options) {
        var key = Owlet.settings.get('sandboxKey');
        if (!key) throw new Error('No API key — set one in Settings.');
        var headers = Object.assign({}, provider.authHeader(key),
            (options && options.headers) || {});
        return fetch(apiUrl(provider, path), Object.assign({}, options, { headers: headers }));
    }

    // Test the configured provider + key with a cheap GET.
    async function testConnection() {
        var id = Owlet.settings.get('sandboxProvider');
        var provider = PROVIDERS[id];
        if (!provider) { Owlet.ui.status('Pick a sandbox provider first.'); return; }
        try {
            var res = await apiFetch(provider, provider.testPath);
            if (res.ok) {
                Owlet.ui.status(provider.name + ' connection OK');
                Owlet.console.info(provider.name + ' sandbox API reachable.');
            } else {
                Owlet.ui.status(provider.name + ' returned HTTP ' + res.status);
                Owlet.console.error(provider.name + ' test failed: HTTP ' + res.status);
            }
        } catch (e) {
            Owlet.ui.status('Connection failed: ' + e.message);
            Owlet.console.error('Sandbox test failed: ' + e.message +
                ' — if this is a CORS error, set a Proxy URL in Settings (see README).');
        }
    }

    // Create a sandbox on the configured provider.
    // Returns { id, wsUrl } or throws. Provider-specific payloads differ;
    // we send a minimal "create sandbox" request and let the provider respond.
    async function create() {
        var id = Owlet.settings.get('sandboxProvider');
        var provider = PROVIDERS[id];
        if (!provider) throw new Error('No sandbox provider configured.');
        var res = await apiFetch(provider, '/sandboxes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ template: 'base' })
        });
        if (!res.ok) throw new Error(provider.name + ' create failed: HTTP ' + res.status);
        var data = await res.json();
        session = { provider: id, sandboxId: data.sandboxID || data.id, wsUrl: data.envdAccessToken || null };
        return session;
    }

    // Sync project files into the sandbox (best-effort, provider-dependent).
    async function syncFiles() {
        if (!session) return;
        Owlet.ui.status('Syncing files to ' + PROVIDERS[session.provider].name + '…');
        // Provider file-upload APIs differ; for now we log the intent and
        // leave the concrete upload to the terminal bridge phase.
        Owlet.console.info('File sync to cloud sandbox is provider-specific — ' +
            'use the terminal to pull files, or extend sandbox.js for your provider.');
    }

    // Kill the current sandbox session.
    async function destroy() {
        if (!session) return;
        var provider = PROVIDERS[session.provider];
        try {
            await apiFetch(provider, '/sandboxes/' + session.sandboxId, { method: 'DELETE' });
        } catch (e) { /* best effort */ }
        session = null;
    }

    return {
        init: init,
        testConnection: testConnection,
        create: create,
        syncFiles: syncFiles,
        destroy: destroy,
        get session() { return session; },
        get providers() { return PROVIDERS; }
    };
})();

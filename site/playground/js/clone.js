// clone.js — "Clone repository": download a public GitHub repo snapshot and
// open it as a Owlet project. Uses the GitHub API tarball endpoint, which is
// CORS-enabled:
//   GET https://api.github.com/repos/{owner}/{repo}/tarball
// The response is a gzipped tar: DecompressionStream('gzip') inflates it and
// a small ustar reader extracts each file in memory — no server, no auth
// (public repos only; unauthenticated API calls are rate-limited).

window.Owlet = window.Owlet || {};

Owlet.clone = (function () {
    function el(id) { return document.getElementById(id); }
    function status(msg) { if (Owlet.ui && Owlet.ui.status) Owlet.ui.status(msg); }
    function note(msg) { var n = el('clone-note'); if (n) n.textContent = msg; }

    // Accept "owner/repo", https://github.com/owner/repo(.git)[/tree/branch…]
    function parseRepo(input) {
        var text = String(input || '').trim();
        var m = text.match(/github\.com[:/]+([^/\s]+)\/([^/\s?#]+)/i)
              || text.match(/^([\w.-]+)\/([\w.-]+)$/);
        if (!m) return null;
        var owner = m[1];
        var repo = m[2].replace(/\.git$/, '');
        if (!/^[\w.-]+$/.test(owner) || !repo) return null;
        return { owner: owner, repo: repo };
    }

    // Minimal ustar reader: 512-byte header blocks + octal size field.
    // GitHub tarballs contain no pax headers, so anything that isn't a
    // regular file (type '0') is skipped.
    function untar(buf) {
        var u8 = new Uint8Array(buf);
        var files = {};
        var off = 0;
        function str(pos, len) {
            var s = '';
            for (var i = 0; i < len; i++) {
                var c = u8[pos + i];
                if (!c) break;
                s += String.fromCharCode(c);
            }
            return s;
        }
        while (off + 512 <= buf.byteLength) {
            var name = str(off, 100);
            if (!name) break;
            var size = parseInt(str(off + 124, 12).trim(), 8) || 0;
            var type = String.fromCharCode(u8[off + 156]);
            var prefix = str(off + 345, 155); // ustar name prefix
            if (prefix) name = prefix + '/' + name;
            off += 512;
            if (type === '0' || type === '') files[name] = u8.slice(off, off + size);
            off += Math.ceil(size / 512) * 512;
        }
        return files;
    }

    async function fetchRepo(owner, repo) {
        var res = await fetch('https://api.github.com/repos/' + owner + '/' + repo + '/tarball');
        if (!res.ok) {
            throw new Error(res.status === 404 ? 'Repo not found or private' : 'GitHub error ' + res.status);
        }
        var gz = await res.arrayBuffer();
        var tar = await new Response(
            new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))
        ).arrayBuffer();
        var raw = untar(tar);
        var dec = new TextDecoder();
        var files = {};
        Object.keys(raw).forEach(function (path) {
            // GitHub wraps everything in "<owner>-<repo>-<sha>/"; strip it.
            var rel = path.split('/').slice(1).join('/');
            if (!rel) return;
            if (raw[path].length > 512 * 1024) return; // skip huge/binary blobs
            files[rel] = dec.decode(raw[path]);
        });
        return files;
    }

    async function clone(input) {
        var parsed = parseRepo(input);
        if (!parsed) { note('Enter a repo like owner/name or a github.com URL.'); return; }
        note('Cloning ' + parsed.owner + '/' + parsed.repo + '…');
        status('Cloning ' + parsed.owner + '/' + parsed.repo + '…');
        try {
            var files = await fetchRepo(parsed.owner, parsed.repo);
            var count = Object.keys(files).length;
            if (!count) throw new Error('No text files found in that repo');
            Owlet.state.loadFiles(files, parsed.repo);
            var names = Owlet.state.listFiles();
            Owlet.state.openFile(names.indexOf('index.html') !== -1 ? 'index.html' : names[0]);
            if (Owlet.preview && Owlet.preview.update) Owlet.preview.update();
            note('Done — ' + count + ' files imported. Press Ctrl+S to save locally.');
            status('Cloned ' + parsed.repo + ' (' + count + ' files). Press Ctrl+S to save.');
        } catch (e) {
            var msg = e && e.message === 'Failed to fetch'
                ? 'Network blocked or repo unavailable'
                : (e && e.message) || 'Unknown error';
            note('Clone failed: ' + msg);
            status('Clone failed: ' + msg);
        }
    }

    function openDialog() {
        Owlet.app.toggleDialog('clone-dialog', true);
        var input = el('clone-url');
        if (input) { input.value = ''; input.focus(); }
        note('Public repos only — imports a snapshot of the default branch.');
    }

    document.addEventListener('DOMContentLoaded', function () {
        var go = el('clone-go');
        var input = el('clone-url');
        if (go) go.addEventListener('click', function () { clone(input && input.value); });
        if (input) input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') clone(input.value);
        });
    });

    return { openDialog: openDialog };
})();

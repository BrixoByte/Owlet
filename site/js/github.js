/* ==========================================================================
   github.js - live repository numbers and contributor avatars from the
   public GitHub REST API. Results are cached in localStorage for
   CONFIG.cacheHours. Every failure is silent: the static fallbacks from
   CONFIG (shown as dashes) stay on screen, and no "undefined" is ever shown.
   ========================================================================== */

// localStorage key for the cached API result.
var GH_CACHE_KEY = 'owlet-landing-github-v1';

// Read "owner" and "repo" from a GitHub repository URL.
function parseRepo(url) {
    var match = /github\.com\/([^\/]+)\/([^\/?#]+)/.exec(url || '');
    return match ? { owner: match[1], repo: match[2].replace(/\.git$/, '') } : null;
}

// Turn a number into a readable string, or a dash when it is not a number.
function formatStat(value) {
    return typeof value === 'number' && isFinite(value) ? value.toLocaleString('en-US') : '\u2014';
}

// Return the cached result if it is still fresh, else null.
function readGithubCache() {
    try {
        var data = JSON.parse(localStorage.getItem(GH_CACHE_KEY) || 'null');
        var maxAge = (window.OwletLanding.CONFIG.cacheHours || 1) * 60 * 60 * 1000;
        if (!data || typeof data.time !== 'number' || Date.now() - data.time > maxAge) return null;
        return data;
    } catch (e) {
        return null;
    }
}

// Save a fresh result with a timestamp. Storage may be blocked; that is fine.
function writeGithubCache(data) {
    try {
        localStorage.setItem(GH_CACHE_KEY, JSON.stringify({ time: Date.now(), stats: data.stats, contributors: data.contributors }));
    } catch (e) { /* ignore */ }
}

// GET a GitHub API URL and return parsed JSON; rejects on any non-OK response.
function fetchGithubJson(url) {
    return fetch(url, { headers: { Accept: 'application/vnd.github+json' } }).then(function (res) {
        if (!res.ok) throw new Error('GitHub responded ' + res.status);
        return res.json();
    });
}

// Ask the API for the repo and its first contributors. Resolves to { stats, contributors }.
function loadGithubData(repo) {
    var base = 'https://api.github.com/repos/' + repo.owner + '/' + repo.repo;
    return Promise.all([fetchGithubJson(base), fetchGithubJson(base + '/contributors?per_page=30')]).then(function (results) {
        var info = results[0] || {};
        var people = Array.isArray(results[1]) ? results[1] : [];
        return {
            stats: {
                stars: info.stargazers_count,
                forks: info.forks_count,
                issues: info.open_issues_count,
                contributors: people.length >= 30 ? null : people.length
            },
            contributors: people.slice(0, 30).map(function (p) {
                return { login: p.login, avatar: p.avatar_url, url: p.html_url };
            })
        };
    });
}

// Merge live numbers over the CONFIG fallbacks and write them into the page.
function renderGithub(data) {
    var fallback = window.OwletLanding.CONFIG.fallbackStats || {};
    var stats = data && data.stats ? data.stats : {};
    var pick = function (key) {
        return typeof stats[key] === 'number' ? stats[key] : (typeof fallback[key] === 'number' ? fallback[key] : null);
    };
    setText(document.getElementById('stat-stars'), formatStat(pick('stars')));
    setText(document.getElementById('stat-forks'), formatStat(pick('forks')));
    setText(document.getElementById('stat-issues'), formatStat(pick('issues')));
    var contributors = pick('contributors');
    if (stats.contributors === null && data.contributors && data.contributors.length) {
        setText(document.getElementById('stat-contributors'), data.contributors.length + '+');
    } else {
        setText(document.getElementById('stat-contributors'), formatStat(contributors));
    }
    setText(document.getElementById('nav-stars'), formatStat(pick('stars')));
    renderAvatars(data && data.contributors ? data.contributors : []);
}

// Replace the placeholder circles with real contributor avatars (none if empty).
function renderAvatars(people) {
    var wall = document.getElementById('avatar-wall');
    if (!wall || !people.length) return;
    qsa('.avatar-empty', wall).forEach(function (node) { node.remove(); });
    var slot = wall.querySelector('.avatar-slot');
    people.slice(0, 12).forEach(function (person) {
        var item = document.createElement('li');
        item.className = 'avatar';
        var link = document.createElement('a');
        link.href = person.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.title = person.login;
        var img = document.createElement('img');
        img.src = person.avatar;
        img.alt = person.login;
        img.width = 40;
        img.height = 40;
        img.loading = 'lazy';
        img.decoding = 'async';
        link.appendChild(img);
        item.appendChild(link);
        wall.insertBefore(item, slot);
    });
}

// Entry point: show fallbacks, then live data (cache first, then network if online).
function initGithub() {
    var repo = parseRepo(window.OwletLanding.CONFIG.repoUrl);
    renderGithub(null);
    if (!repo) return;
    var cached = readGithubCache();
    if (cached) { renderGithub(cached); return; }
    if (navigator.onLine === false) return;
    loadGithubData(repo).then(function (data) {
        writeGithubCache(data);
        renderGithub(data);
    }).catch(function () { /* offline or rate-limited: keep the fallbacks */ });
}

window.OwletLanding = window.OwletLanding || {};
window.OwletLanding.initGithub = initGithub;

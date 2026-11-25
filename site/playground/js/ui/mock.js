// mock.js — demo data pushed through the SAME UI contract the backend will use,
// so every panel looks real before Git, AI, sandbox and collaboration exist.
// Mock data is OFF by default. Turn it on in the browser console with:
//   localStorage.setItem('owlet:ui:mock', '1')
// Every value here is fake. Replace each call with real data when the backend lands.

window.OwletUI = window.OwletUI || {};

OwletUI.mock = (function () {
    var FLAG_KEY = 'owlet:ui:mock';
    var SESSION_KEY = 'owlet:ui:mockToast';

    // Mock is opt-in: only run when the flag was explicitly set to '1'.
    // Otherwise it plants fake files and git state the user never created.
    function enabled() {
        try { return localStorage.getItem(FLAG_KEY) === '1'; }
        catch (e) { return false; } // storage blocked: mock stays off
    }

    // Feed the Explorer git letters (paths only colour files that exist).
    // TODO: connect backend (git status)
    function feedTree() {
        OwletUI.setTree([
            { path: 'style.css', git: 'M' },
            { path: 'script.js', git: 'U' }
        ]);
    }

    // Feed the Source Control list.
    // TODO: connect backend (git status --porcelain)
    function feedGit() {
        OwletUI.setGitChanges([
            { path: 'style.css', status: 'M', staged: false },
            { path: 'script.js', status: 'U', staged: false },
            { path: 'notes/todo.md', status: 'A', staged: true }
        ]);
    }

    // Feed the Problems panel and the status-bar counters.
    // TODO: connect backend (lint + compiler diagnostics)
    function feedProblems() {
        OwletUI.setProblems([
            { path: 'index.html', line: 7, col: 5, severity: 'warn', message: 'Attribute value should be quoted', source: 'htmlhint' },
            { path: 'script.js', line: 1, col: 1, severity: 'info', message: 'Demo problem: console output is expected here', source: 'demo' }
        ]);
    }

    // Feed the branch, sync counters, sandbox and AI labels.
    // TODO: connect backend (git branch/ahead/behind, sandbox, AI provider)
    function feedStatus() {
        OwletUI.setStatus({ branch: 'main', ahead: 1, behind: 0, sandbox: 'off', ai: 'no key' });
    }

    // Feed collaborator avatars.
    // TODO: connect backend (collaboration presence)
    function feedCollaborators() {
        OwletUI.setCollaborators([
            { name: 'Ada Lovelace (demo)', initials: 'AL', color: '#e0a04b' },
            { name: 'Grace Hopper (demo)', initials: 'GH', color: '#5fb0ff' }
        ]);
    }

    // Show a one-time note so nobody mistakes the demo for real data.
    function noteOnce() {
        if (sessionStorage.getItem(SESSION_KEY)) return;
        sessionStorage.setItem(SESSION_KEY, '1');
        OwletUI.toast('Demo data is on. Git, AI and collaboration panels show sample content.', 'info', {
            title: 'Demo mode',
            duration: 5000
        });
    }

    // Load every fake feed through the contract, once at boot.
    function load() {
        if (!enabled()) return;
        OwletUI.snapshot.demo = true;
        feedTree();
        feedGit();
        feedProblems();
        feedStatus();
        feedCollaborators();
        OwletUI.setTerminalState('local', 'Local');
        noteOnce();
    }

    return { load: load, enabled: enabled };
})();

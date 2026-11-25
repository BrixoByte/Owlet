// theme.js — live theme switching, and the shared UI preferences store.
// Themes: 'dark' (default) | 'light' | 'system' (follows the OS).
// The accent is fixed to ember orange — it is a brand colour, not a preference.
// Everything is saved in localStorage under 'owlet:ui:prefs'.

window.OwletUI = window.OwletUI || {};

// Shared preferences store. layout.js uses it too.
OwletUI.prefs = (function () {
    var KEY = 'owlet:ui:prefs';

    // Read all saved UI preferences (empty object when none or broken).
    function readAll() {
        try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
        catch (e) { return {}; }
    }

    // Read one preference, or fallback when it was never saved.
    function get(key, fallback) {
        var all = readAll();
        return all[key] === undefined ? fallback : all[key];
    }

    // Save one preference (merged into the stored object).
    // Save one preference. Blocked or full storage keeps the choice for this session only.
    function set(key, value) {
        var all = readAll();
        all[key] = value;
        try { localStorage.setItem(KEY, JSON.stringify(all)); }
        catch (e) { /* storage blocked or full: nothing to persist */ }
    }

    return { get: get, set: set, readAll: readAll };
})();

// Theme switching.
OwletUI.theme = (function () {
    var THEMES = { dark: 'Dark', light: 'Light', hc: 'High contrast', system: 'System' };
    var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

    // Resolve 'system' to a concrete theme using the OS setting.
    function resolve(theme) {
        if (theme !== 'system') return theme;
        return media && media.matches ? 'light' : 'dark';
    }

    // Set the theme attribute on <html> and refresh the editor theme.
    function apply() {
        var choice = OwletUI.prefs.get('theme', 'system');
        document.documentElement.setAttribute('data-theme', resolve(choice));
        syncEditorTheme();
    }

    // Switch every group's CodeMirror to the 'owlet' theme (uses our tokens).
    function syncEditorTheme() {
        if (Owlet.groups && Owlet.groups.forEachEditor) {
            Owlet.groups.forEachEditor(function (cm) {
                cm.setOption('theme', 'owlet');
                cm.refresh();
            });
        }
    }

    // Save a theme choice and apply it immediately.
    function setTheme(theme) {
        if (!THEMES[theme]) return;
        OwletUI.prefs.set('theme', theme);
        apply();
        OwletUI.emit('ui:theme-change', { theme: theme });
    }

    // The topbar button flips between light and dark directly (no menu);
    // the full System/Dark/Light choice lives in the settings dialog.
    function toggleMode() {
        var current = resolve(OwletUI.prefs.get('theme', 'system'));
        setTheme(current === 'light' ? 'dark' : 'light');
    }

    // Follow OS changes while the theme is set to 'system'.
    function watchSystem() {
        if (!media || !media.addEventListener) return;
        media.addEventListener('change', function () {
            if (OwletUI.prefs.get('theme', 'system') === 'system') apply();
        });
    }

    // Wire the theme button and start following the OS setting.
    function init() {
        apply();
        watchSystem();
        var btn = document.getElementById('btn-theme');
        if (btn) btn.addEventListener('click', toggleMode);
    }

    return { init: init, apply: apply, setTheme: setTheme,
             syncEditorTheme: syncEditorTheme, themes: THEMES };
})();

/* ==========================================================================
   main.js - landing page entry point.
   Holds the single CONFIG object (edit this to change links, testimonials
   and hero images), theme toggle, nav, reveal, accordion, copy buttons and
   the hero/role/FAQ/CTA interactions. Other modules: github.js, showcase.js,
   diagram.js. Everything here is progressive: content is visible without JS.
   ========================================================================== */

/* ---------- CONFIG: fill these in before deploying ---------- */
var CONFIG = {
    // Repository used for GitHub links, stats and contributor avatars.
    repoUrl: 'https://github.com/BrixoByte/Owlet',
    // The Owlet app itself. Relative path works on file:// and GitHub Pages.
    demoUrl: '../index.html',
    license: 'MIT',
    discussionsUrl: 'https://github.com/BrixoByte/Owlet/discussions',
    issuesUrl: 'https://github.com/BrixoByte/Owlet/issues',
    contributingUrl: 'https://github.com/BrixoByte/Owlet/blob/main/CONTRIBUTING.md',
    // NOTE: CODE_OF_CONDUCT.md is not in the repo yet; add the file or change this link.
    codeOfConductUrl: 'https://github.com/BrixoByte/Owlet/blob/main/CODE_OF_CONDUCT.md',
    licenseUrl: 'https://github.com/BrixoByte/Owlet/blob/main/LICENSE',
    // The public roadmap and docs pages. Relative paths work on file:// and Pages.
    roadmapUrl: '../roadmap/index.html',
    docsUrl: '../docs/index.html',
    // Optional screenshots for the hero tiles. Leave empty to use the built-in mocks.
    // Each item: { src: 'assets/hero-1.png', alt: 'Describe the image' }
    heroImages: [],
    // Testimonials. Entries marked placeholder:true are hidden; with none real,
    // the community card is shown instead (no fake quotes).
    testimonials: [
        { quote: 'Your quote here', name: 'Your name', role: 'Your role', placeholder: true }
    ],
    contactLinks: [
        { label: 'GitHub Discussions', url: 'https://github.com/BrixoByte/Owlet/discussions' },
        { label: 'Open an issue', url: 'https://github.com/BrixoByte/Owlet/issues' }
    ],
    // Shown when the GitHub API is unreachable. null renders as a dash.
    fallbackStats: { stars: null, forks: null, issues: null, contributors: null },
    cacheHours: 1
};

/* ---------- small helpers ---------- */

// Shortcut for document.querySelector.
function qs(selector, root) { return (root || document).querySelector(selector); }

// Shortcut for document.querySelectorAll as a real array.
function qsa(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

// Set text only when the element exists, so missing nodes never throw.
function setText(node, text) { if (node) node.textContent = text; }

// Expose CONFIG to the other modules (github.js, showcase.js, diagram.js).
window.OwletLanding = { CONFIG: CONFIG };

/* ---------- progressive enhancement flag ---------- */

// Adds .js-enabled so scroll-reveal may hide items; without JS nothing hides.
function markJsEnabled() {
    document.documentElement.classList.add('js-enabled');
}

/* ---------- config-bound links ---------- */

// Point every element with data-config="key" at the matching CONFIG value.
function bindConfigLinks() {
    qsa('[data-config]').forEach(function (node) {
        var value = CONFIG[node.getAttribute('data-config')];
        if (typeof value === 'string') node.setAttribute('href', value);
    });
    var clone = document.getElementById('clone-cmd');
    if (clone && CONFIG.repoUrl) clone.textContent = 'git clone ' + CONFIG.repoUrl + '.git';
}

/* ---------- theme toggle ---------- */

// Read the saved theme, else follow the OS preference (dark is the default).
function getInitialTheme() {
    try {
        var saved = localStorage.getItem('owlet-landing-theme');
        if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) { /* storage blocked: fall through */ }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// Apply a theme to <html> and remember it.
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = qs('#theme-toggle');
    if (btn) {
        btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
        btn.setAttribute('title', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    }
    try { localStorage.setItem('owlet-landing-theme', theme); } catch (e) { /* ignore */ }
}

// Wire the sun/moon button in the nav.
function initTheme() {
    applyTheme(document.documentElement.getAttribute('data-theme') || getInitialTheme());
    var btn = qs('#theme-toggle');
    if (btn) {
        btn.addEventListener('click', function () {
            var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            applyTheme(next);
        });
    }
}

/* ---------- nav ---------- */

// Add a blur background to the nav after the first scroll.
function initNavScroll() {
    var nav = qs('#site-nav');
    if (!nav) return;
    var update = function () { nav.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', update, { passive: true });
    update();
}

// Hamburger on phones: open/close the menu, close on Escape or link click.
function initNavMenu() {
    var toggle = qs('#nav-toggle');
    var menu = qs('#nav-menu');
    if (!toggle || !menu) return;
    var setOpen = function (open) {
        menu.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', function () { setOpen(!menu.classList.contains('is-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
}

// Highlight the nav link whose section is in view.
function initActiveLink() {
    if (!('IntersectionObserver' in window)) return;
    var links = qsa('.nav-link[href^="#"]');
    var sections = links.map(function (l) { return qs(l.getAttribute('href')); }).filter(Boolean);
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            links.forEach(function (l) {
                var on = l.getAttribute('href') === '#' + entry.target.id;
                l.classList.toggle('is-active', on);
                if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
            });
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { io.observe(s); });
}

/* ---------- scroll reveal ---------- */

// Mark an element as visible (removes its hidden start state).
function showRevealed(node) { node.classList.add('is-visible'); }

// Reveal items as they enter the viewport. Without IntersectionObserver every
// item is shown at once, so nothing can get stuck hidden.
function initReveal() {
    var items = qsa('[data-reveal]');
    items.forEach(function (node) {
        // Stagger siblings: each one gets a slightly longer delay.
        var index = node.parentElement ? Array.prototype.indexOf.call(node.parentElement.children, node) : 0;
        node.style.setProperty('--reveal-i', String(index % 6));
    });
    if (!('IntersectionObserver' in window)) { items.forEach(showRevealed); return; }
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            showRevealed(entry.target);
            io.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (node) { io.observe(node); });
}

/* ---------- accordion (FAQ) ---------- */

// Open or close one accordion item; keeps aria-expanded in sync.
function setAccordionItem(item, open) {
    var trigger = qs('.accordion-trigger', item);
    item.classList.toggle('is-open', open);
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
}

// Wire every FAQ row. The first item starts open; the rest start collapsed.
function initAccordion() {
    qsa('.accordion-item').forEach(function (item, i) {
        var trigger = qs('.accordion-trigger', item);
        if (!trigger) return;
        setAccordionItem(item, i === 0);
        trigger.addEventListener('click', function () {
            setAccordionItem(item, !item.classList.contains('is-open'));
        });
    });
}

/* ---------- copy buttons ---------- */

// Copy the text of a code block and show "Copied" for a moment.
function copyText(text, button) {
    var done = function () {
        button.textContent = 'Copied';
        setTimeout(function () { button.textContent = 'Copy'; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { button.textContent = 'Select and copy'; });
    } else {
        button.textContent = 'Select and copy';
    }
}

// Wire every copy button inside a code block.
function initCopyButtons() {
    qsa('.code-block .copy-btn').forEach(function (button) {
        button.addEventListener('click', function () {
            var code = qs('code', button.parentElement);
            copyText(code ? code.textContent : '', button);
        });
    });
}

/* ---------- footer ---------- */

// Keep the copyright year current.
function initYear() {
    setText(qs('#year'), String(new Date().getFullYear()));
}

/* ---------- reduced motion ---------- */

// True when the visitor asked the OS for less motion.
function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/* ---------- hero demo (typing + live preview loop) ---------- */

// Types the code in #demo-code, reveals preview parts as their line finishes,
// then restarts. Reduced motion shows the finished state with no loop.
function initDemo() {
    var code = qs('#demo-code');
    var toggle = qs('#demo-toggle');
    if (!code) return;
    var text = code.textContent;
    var parts = qsa('.demo-preview [data-after]');
    var lines = text.split('\n');
    // ends[k] = offset where line k finishes; a preview part shows once typing passes it.
    var ends = [];
    var acc = 0;
    lines.forEach(function (line) { acc += line.length; ends.push(acc); acc += 1; });
    var typed = 0;
    var running = true;
    var timer = 0;

    // Draw the typed prefix and show every preview part whose line is done.
    var render = function () {
        code.textContent = text.slice(0, typed);
        parts.forEach(function (node) {
            var k = parseInt(node.getAttribute('data-after'), 10);
            node.classList.toggle('is-shown', typed >= ends[k]);
        });
    };

    // Type one character, or wait and restart at the end.
    var step = function () {
        if (!running) return;
        if (typed < text.length) {
            typed += 1;
            render();
            timer = setTimeout(step, text.charAt(typed - 1) === '\n' ? 180 : 32);
        } else {
            timer = setTimeout(function () { typed = 0; render(); step(); }, 2600);
        }
    };

    // Swap the pause/play button label and icon.
    var setPaused = function (paused) {
        if (!toggle) return;
        running = !paused;
        toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
        toggle.querySelector('span').textContent = paused ? 'Play' : 'Pause';
        toggle.querySelector('use').setAttribute('href', paused ? '#i-play' : '#i-pause');
        clearTimeout(timer);
        if (!paused) step();
    };

    if (prefersReducedMotion()) {
        typed = text.length;
        render();
        if (toggle) toggle.hidden = true;
        return;
    }
    if (toggle) toggle.addEventListener('click', function () { setPaused(running); });
    render();
    step();
}

/* ---------- hero tiles: optional real screenshots ---------- */

// Replace the mock contents of each floating tile with a CONFIG.heroImages entry.
function initHeroImages() {
    var images = CONFIG.heroImages || [];
    if (!images.length) return;
    qsa('.float-tile').forEach(function (tile, i) {
        var item = images[i];
        if (!item || !item.src) return;
        tile.innerHTML = '';
        var img = document.createElement('img');
        img.className = 'tile-hero-img';
        img.src = item.src;
        img.alt = item.alt || '';
        img.width = 640;
        img.height = 400;
        img.decoding = 'async';
        tile.appendChild(img);
    });
}

// Give each hero tile a different scroll speed (transform only, via a CSS variable).
function initParallax() {
    if (prefersReducedMotion()) return;
    var tiles = qsa('.float-tile[data-float]');
    var queued = false;
    var update = function () {
        queued = false;
        var y = Math.min(window.scrollY, 1200);
        tiles.forEach(function (tile) {
            var k = parseInt(tile.getAttribute('data-float'), 10);
            var speed = 0.04 + (k % 3) * 0.03;
            tile.style.setProperty('--py', (-y * speed).toFixed(1) + 'px');
        });
    };
    window.addEventListener('scroll', function () {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(update);
    }, { passive: true });
}

/* ---------- role + task selector ---------- */

// "I am a [role] and I need to [task]" - the underlined words open real
// listbox dropdowns. Picking an option re-renders the steps and the whole
// OwletMock scene (js/scenes.js), and the hash remembers the choice.
function initSelector() {
    var data = window.OwletLanding && window.OwletLanding.scenes;
    var mockApi = window.OwletLanding && window.OwletLanding.mock;
    var sceneWrap = document.getElementById('selector-scene');
    var mockMount = document.getElementById('selector-mock');
    if (!data || !mockApi || !sceneWrap || !mockMount) return;

    var roles = data.roles || [];
    var pickRole = document.getElementById('pick-role');
    var pickTask = document.getElementById('pick-task');
    var roleMenu = document.getElementById('role-menu');
    var taskMenu = document.getElementById('task-menu');
    var roleValue = document.getElementById('role-value');
    var taskValue = document.getElementById('task-value');
    var heading = document.getElementById('sel-heading');
    var stepsList = document.getElementById('sel-steps');

    var state = { role: roles[0] ? roles[0].id : null, task: null };

    // Current role/task objects.
    var roleOf = function () { return roles.filter(function (r) { return r.id === state.role; })[0] || roles[0]; };
    var taskOf = function () {
        var role = roleOf();
        if (!role) return null;
        return role.tasks.filter(function (t) { return t.id === state.task; })[0] || role.tasks[0];
    };

    // Build one <li role="option">.
    var makeOption = function (id, label, selected) {
        var li = document.createElement('li');
        li.className = 'pill-option';
        li.setAttribute('role', 'option');
        li.setAttribute('data-id', id);
        li.setAttribute('aria-selected', selected ? 'true' : 'false');
        li.tabIndex = -1;
        li.textContent = label;
        return li;
    };

    // Refill a menu with options; returns the option nodes.
    var fillMenu = function (menu, items, selectedId) {
        menu.textContent = '';
        items.forEach(function (item) {
            menu.appendChild(makeOption(item.id, item.label, item.id === selectedId));
        });
        return qsa('[role="option"]', menu);
    };

    // One dropdown pair (button + listbox) with click and keyboard support.
    var wirePick = function (button, menu, onPick) {
        var options = function () { return qsa('[role="option"]', menu); };
        var setOpen = function (open) {
            menu.hidden = !open;
            button.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                var sel = options().filter(function (o) { return o.getAttribute('aria-selected') === 'true'; })[0] || options()[0];
                if (sel) sel.focus();
            }
        };
        button.addEventListener('click', function () { setOpen(menu.hidden); });
        menu.addEventListener('click', function (e) {
            var opt = e.target.closest('[role="option"]');
            if (!opt) return;
            setOpen(false);
            button.focus();
            onPick(opt.getAttribute('data-id'));
        });
        menu.addEventListener('keydown', function (e) {
            var opts = options();
            var idx = opts.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') { e.preventDefault(); (opts[(idx + 1) % opts.length] || opts[0]).focus(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); (opts[(idx - 1 + opts.length) % opts.length] || opts[opts.length - 1]).focus(); }
            else if (e.key === 'Home') { e.preventDefault(); opts[0].focus(); }
            else if (e.key === 'End') { e.preventDefault(); opts[opts.length - 1].focus(); }
            else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                var picked = document.activeElement.getAttribute('data-id');
                setOpen(false);
                button.focus();
                onPick(picked);
            }
            else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); button.focus(); }
        });
        document.addEventListener('click', function (e) {
            if (!menu.hidden && !e.target.closest('.pick')) setOpen(false);
        });
        return { setOpen: setOpen };
    };

    // Render the current scene: labels, heading, steps and the mock.
    var render = function (animate) {
        var role = roleOf();
        var task = taskOf();
        if (!role || !task) return;
        state.task = task.id;
        setText(roleValue, role.label);
        setText(taskValue, task.label);
        setText(heading, task.label.charAt(0).toUpperCase() + task.label.slice(1));
        stepsList.textContent = '';
        (task.steps || []).forEach(function (text) {
            var li = document.createElement('li');
            // Steps may contain `code` markers in backticks.
            String(text).split(/`([^`]+)`/).forEach(function (part, i) {
                if (i % 2 === 0) {
                    li.appendChild(document.createTextNode(part));
                } else {
                    var code = document.createElement('code');
                    code.textContent = part;
                    li.appendChild(code);
                }
            });
            stepsList.appendChild(li);
        });
        var applyScene = function () {
            mockApi.render(mockMount, task.scene);
            sceneWrap.classList.remove('is-swapping');
        };
        if (animate && !prefersReducedMotion()) {
            sceneWrap.classList.add('is-swapping');
            setTimeout(applyScene, 200);
        } else {
            applyScene();
        }
        try {
            var hash = '#role=' + role.id + '&task=' + task.id;
            if (window.location.hash !== hash) history.replaceState(null, '', hash);
        } catch (e) { /* file:// or privacy mode: skip */ }
    };

    // Read #role=..&task=.. from the URL once at boot.
    var readHash = function () {
        var match = /role=([a-z-]+)&task=([a-z-]+)/.exec(window.location.hash || '');
        if (!match) return;
        if (roles.some(function (r) { return r.id === match[1]; })) state.role = match[1];
        var role = roleOf();
        if (role && role.tasks.some(function (t) { return t.id === match[2]; })) state.task = match[2];
    };

    wirePick(pickRole, roleMenu, function (id) {
        state.role = id;
        state.task = null;
        fillMenu(taskMenu, roleOf().tasks, (taskOf() || {}).id);
        render(true);
    });
    wirePick(pickTask, taskMenu, function (id) {
        state.task = id;
        render(true);
    });

    readHash();
    fillMenu(roleMenu, roles, roleOf().id);
    fillMenu(taskMenu, roleOf().tasks, (taskOf() || {}).id);
    render(false);
}

/* ---------- testimonials (real quotes only) ---------- */

// Rotate through CONFIG.testimonials that are not placeholders. With none, the
// community card in the HTML stays as the invitation (no fake quotes).
function initTestimonials() {
    var real = (CONFIG.testimonials || []).filter(function (t) { return t && !t.placeholder && t.quote; });
    var holder = document.getElementById('quote-text');
    if (!real.length || !holder) return;
    var meta = document.getElementById('quote-meta');
    var controls = document.getElementById('quote-controls');
    var index = 0;

    // Show the quote at the current index with its author line.
    var render = function () {
        var item = real[index];
        holder.textContent = '';
        var p = document.createElement('p');
        p.textContent = '\u201C' + item.quote + '\u201D';
        holder.appendChild(p);
        setText(meta, item.name + ' \u00B7 ' + item.role);
    };
    render();
    if (real.length > 1 && controls) {
        controls.hidden = false;
        document.getElementById('quote-prev').addEventListener('click', function () {
            index = (index - 1 + real.length) % real.length;
            render();
        });
        document.getElementById('quote-next').addEventListener('click', function () {
            index = (index + 1) % real.length;
            render();
        });
    }
}

/* ---------- final CTA: pass the idea to Owlet in the URL ---------- */

// Submit opens Owlet with ?idea=... (the app may ignore it). Nothing goes to a server.
function initIdeaForm() {
    var form = document.getElementById('idea-form');
    var input = document.getElementById('idea-input');
    if (!form || !input) return;
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var idea = input.value.trim();
        window.location.href = CONFIG.demoUrl + (idea ? '?idea=' + encodeURIComponent(idea) : '');
    });
}

/* ---------- boot ---------- */

// Run each module once the DOM is ready. Modules that need the DOM check for their own nodes.
function boot() {
    markJsEnabled();
    bindConfigLinks();
    initTheme();
    initNavScroll();
    initNavMenu();
    initActiveLink();
    initHeroImages();
    initParallax();
    initDemo();
    initSelector();
    initTestimonials();
    initIdeaForm();
    initReveal();
    initAccordion();
    initCopyButtons();
    initYear();
    if (window.OwletLanding.initShowcase) window.OwletLanding.initShowcase();
    if (window.OwletLanding.initGithub) window.OwletLanding.initGithub();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

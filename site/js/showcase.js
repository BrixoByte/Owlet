/* ==========================================================================
   showcase.js - the day timeline. On wide screens (and without reduced
   motion) the section is sticky and the slide index follows NATIVE scroll
   progress; nothing hijacks the scroll. Everywhere else the slides stack
   vertically and stay fully visible. Dock, dropdown and Replay are extras.
   Helpers qs, qsa and prefersReducedMotion come from main.js.
   ========================================================================== */

// Keep a number inside [min, max].
function clampIndex(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

// Wire the day timeline: scroll-linked stage, audience dropdown, dock and Replay.
function initShowcase() {
    var track = document.getElementById('showcase-track');
    if (!track) return;
    var slides = qsa('.slide', track);
    var menu = document.getElementById('slide-menu');
    var pill = document.getElementById('slide-pill');
    var pillLabel = document.getElementById('slide-pill-label');
    var replay = document.getElementById('slide-replay');
    var docks = qsa('[data-feature-btn]');
    var ticks = qsa('[data-tick]');
    var options = menu ? qsa('[role="option"]', menu) : [];
    var wide = window.matchMedia('(min-width: 1024px)');
    var active = 0;
    var sticky = false;
    var queued = false;

    // Sticky only on wide screens and only when motion is allowed.
    var canStick = function () { return wide.matches && !prefersReducedMotion(); };

    // Only the active slide is reachable in sticky mode; the rest are inert.
    var syncInert = function () {
        slides.forEach(function (slide, i) { slide.inert = sticky && i !== active; });
    };

    // Feature button highlight (the dot under the icon).
    var setFeature = function (name) {
        docks.forEach(function (btn) {
            var on = btn.getAttribute('data-feature-btn') === name;
            btn.classList.toggle('is-active', on);
            if (on) btn.setAttribute('aria-current', 'true'); else btn.removeAttribute('aria-current');
        });
    };

    // Render a OwletMock into every slide that asks for one (data-slide-scene).
    var mountMocks = function () {
        var data = window.OwletLanding && window.OwletLanding.scenes;
        var api = window.OwletLanding && window.OwletLanding.mock;
        if (!data || !api || !data.showcase) return;
        qsa('.slide-mock', track).forEach(function (mount) {
            var index = parseInt(mount.getAttribute('data-slide-scene'), 10);
            if (data.showcase[index]) api.render(mount, data.showcase[index]);
        });
    };

    // Replay the mock that lives inside a slide, if there is one.
    var replaySlide = function (slide) {
        var api = window.OwletLanding && window.OwletLanding.mock;
        if (api && slide) api.replayIn(slide);
    };

    // Make one slide the active one and sync the label, options and ticks.
    var setActive = function (index, replay) {
        active = clampIndex(index, 0, slides.length - 1);
        slides.forEach(function (slide, i) {
            slide.classList.toggle('is-active', i === active);
            slide.classList.toggle('is-past', i < active);
            slide.classList.toggle('is-next', i > active);
        });
        setText(pillLabel, slides[active].getAttribute('data-audience'));
        options.forEach(function (opt, i) { opt.setAttribute('aria-selected', i === active ? 'true' : 'false'); });
        ticks.forEach(function (tick, i) { tick.classList.toggle('is-reached', i <= active); });
        setFeature(slides[active].getAttribute('data-feature'));
        syncInert();
        if (replay && sticky) replaySlide(slides[active]);
    };

    // Read how far the track has scrolled through the sticky stage (0 to 1).
    var progressOf = function () {
        var rect = track.getBoundingClientRect();
        var total = track.offsetHeight - window.innerHeight;
        if (total <= 0) return 0;
        return clampIndex(-rect.top / total, 0, 1);
    };

    // Scroll-linked update: move the ruler dot and change slide at each quarter.
    var update = function () {
        queued = false;
        if (!sticky) return;
        var p = progressOf();
        track.style.setProperty('--p', p.toFixed(4));
        var index = Math.floor(p * slides.length);
        if (index !== active) setActive(index, true);
    };

    // Throttle scroll work to one frame.
    var onScroll = function () {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(update);
    };

    // Switch between sticky and stacked layouts when the screen or motion setting changes.
    var applyMode = function () {
        var next = canStick();
        if (next === sticky) return;
        sticky = next;
        track.classList.toggle('is-sticky', sticky);
        syncInert();
        update();
    };

    // Scroll to the part of the track that belongs to a slide (or to the slide itself when stacked).
    var goTo = function (index) {
        index = clampIndex(index, 0, slides.length - 1);
        var behavior = prefersReducedMotion() ? 'auto' : 'smooth';
        if (sticky) {
            var total = track.offsetHeight - window.innerHeight;
            var top = track.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: top + ((index + 0.5) / slides.length) * total, behavior: behavior });
        } else {
            slides[index].scrollIntoView({ behavior: behavior, block: 'center' });
        }
        setActive(index, true);
    };

    // Open or close the audience listbox; focus moves into it when opened.
    var setMenuOpen = function (open) {
        if (!menu || !pill) return;
        menu.hidden = !open;
        pill.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) (options[active] || options[0]).focus();
    };

    // Choose an audience from the listbox and move to that slide.
    var chooseOption = function (index) {
        setMenuOpen(false);
        goTo(index);
        if (pill) pill.focus();
    };

    if (pill) pill.addEventListener('click', function () { setMenuOpen(menu.hidden); });
    options.forEach(function (opt, i) {
        opt.addEventListener('click', function () { chooseOption(i); });
    });
    if (menu) {
        menu.addEventListener('keydown', function (e) {
            var idx = options.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') { e.preventDefault(); options[(idx + 1) % options.length].focus(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); options[(idx - 1 + options.length) % options.length].focus(); }
            else if (e.key === 'Home') { e.preventDefault(); options[0].focus(); }
            else if (e.key === 'End') { e.preventDefault(); options[options.length - 1].focus(); }
            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chooseOption(idx); }
            else if (e.key === 'Escape') { e.preventDefault(); setMenuOpen(false); pill.focus(); }
        });
    }
    document.addEventListener('click', function (e) {
        if (menu && !menu.hidden && !e.target.closest('.showcase-pill')) setMenuOpen(false);
    });

    // Dock: a working feature jumps to its slide; coming-soon features do nothing.
    docks.forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (btn.getAttribute('aria-disabled') === 'true') return;
            goTo(parseInt(btn.getAttribute('data-slide'), 10));
            setFeature(btn.getAttribute('data-feature-btn'));
        });
    });

    // Replay: restart the scripted animation inside the active slide's mock.
    if (replay) {
        replay.addEventListener('click', function () { replaySlide(slides[active]); });
    }

    mountMocks();
    setActive(0);
    applyMode();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', applyMode);
    if (wide.addEventListener) wide.addEventListener('change', applyMode);
}

window.OwletLanding = window.OwletLanding || {};
window.OwletLanding.initShowcase = initShowcase;

/* ==========================================================================
   design.js — Group 5: for designers and anyone touching CSS. Token names
   verified against landing/css/tokens.css (the shared token file the docs
   also load); component rules follow css/components.css conventions.
   ========================================================================== */
'use strict';
window.OwletDocs = window.OwletDocs || { groups: [] };

window.OwletDocs.groups.push({
    id: 'design',
    title: 'Design guide',
    file: 'design.js',
    pages: [
        {
            id: 'design/principles',
            title: 'Design principles',
            description: 'Warm, playful and honest — Owlet looks like a real tool a beginner can trust, not a demo.',
            blocks: [
                { t: 'h2', x: 'The look' },
                { t: 'list', items: [
                    [{ b: 'Neutral charcoal' }, ' — the dark theme is #0b0c10 canvas and the light theme is #e6e9f0, matching the Owlet app.'],
                    [{ b: 'One accent, used sparingly' }, ' — Ember orange marks action and focus. It never fills large areas.'],
                    [{ b: 'One typeface, mono for code' }, ' — Inter carries every surface including headings, matching the app; JetBrains Mono does code.'],
                    [{ b: 'Flat with depth where it helps' }, ' — borders separate structure; shadows only on floating elements (menus, dialogs, toasts).'],
                    [{ b: 'Playful pastels' }, ' — sage, peach, lavender and sand cards give the marketing surfaces personality without making the IDE noisy.']
                ] },
                { t: 'h2', x: 'Content rules' },
                { t: 'list', items: [
                    ['Beginner-first copy: short sentences, no jargon without a definition.'],
                    ['Honest status: unfinished features are badged, never implied to work.'],
                    ['Empty states say what the panel will do and how to get there.'],
                    ['Every error message suggests a next step.']
                ] }
            ]
        },
        {
            id: 'design/tokens',
            title: 'Design tokens',
            description: 'Every colour, font, space and radius is a CSS variable in tokens.css — the same file the app, docs and landing page all load.',
            blocks: [
                { t: 'h2', x: 'Colour tokens (live values)' },
                { t: 'p', x: 'These are read straight from the stylesheet of this page — flip the theme in the top bar and the swatches update.' },
                { t: 'token-table', items: [
                    { name: '--canvas' }, { name: '--surface-1' }, { name: '--surface-2' }, { name: '--surface-3' },
                    { name: '--text-1' }, { name: '--text-2' }, { name: '--text-3' },
                    { name: '--accent' }, { name: '--accent-hover' }, { name: '--accent-ink' },
                    { name: '--accent-soft' }, { name: '--on-accent' }, { name: '--focus-ring' },
                    { name: '--status-ok' }, { name: '--status-soon' },
                    { name: '--code-bg' }, { name: '--code-text' },
                    { name: '--paper' }, { name: '--pastel-sage' }, { name: '--pastel-peach' },
                    { name: '--pastel-lavender' }, { name: '--pastel-sand' }, { name: '--pastel-ink' }
                ] },
                { t: 'h2', x: 'Type, space, radius, motion' },
                { t: 'table', head: ['Group', 'Tokens'], rows: [
                    ['Fonts', [{ c: '--font-sans' }, ' (Inter — also aliased to ', { c: '--font-serif' }, '), ', { c: '--font-mono' }, ' (JetBrains Mono)']],
                    ['Font sizes', [{ c: '--fs-xs' }, ' … ', { c: '--fs-xl' }, ' (0.75–1.5 rem)']],
                    ['Spacing', [{ c: '--space-1' }, ' … ', { c: '--space-9' }, ' (4–96 px), ', { c: '--section-y' }, ', ', { c: '--gutter' }]],
                    ['Radius', [{ c: '--radius-xs' }, ' … ', { c: '--radius-xl' }, ' (8–28 px), ', { c: '--radius-pill' }]],
                    ['Shadows', [{ c: '--shadow-1' }, ', ', { c: '--shadow-2' }, ', ', { c: '--shadow-3' }]],
                    ['Motion', [{ c: '--ease-out' }, ', ', { c: '--dur-fast' }, ' (150 ms), ', { c: '--dur-base' }, ' (300 ms), ', { c: '--dur-slow' }, ' (500 ms)']],
                    ['Layers', [{ c: '--z-nav' }, ' (50), ', { c: '--z-dock' }, ' (40)']]
                ] },
                { t: 'callout', kind: 'tip', title: 'The contract of a token', x: 'Components read tokens; they never hardcode a colour. Changing a token re-themes everything that respects the rule — that is the whole point.' }
            ]
        },
        {
            id: 'design/components',
            title: 'Components',
            description: 'The reusable pieces and the rules for building new ones: token-only colours, focus rings, and both themes always.',
            blocks: [
                { t: 'h2', x: 'Existing building blocks' },
                { t: 'table', head: ['Component', 'Where', 'Notes'], rows: [
                    ['Buttons', [{ c: '.btn' }, ', ', { c: '.btn-primary' }, ', ', { c: '.btn-icon' }], 'Primary uses --accent; icon buttons are borderless squares.'],
                    ['Badges', [{ c: '.badge--ok' }, ', ', { c: '--progress' }, ', ', { c: '--planned' }, ', ', { c: '--experimental' }], 'Dotted ring = planned; filled dot = live.'],
                    ['Callouts', [{ c: '.callout--note' }, ', ', { c: '--tip' }, ', ', { c: '--warning' }, ', ', { c: '--danger' }, ', ', { c: '--planned' }], 'Left border colour carries the meaning.'],
                    ['Cards', [{ c: '.mini-card' }, ', ', { c: '.card-grid' }], 'Used for related pages and feature picks.'],
                    ['Code blocks', [{ c: '.codeblock' }], 'Header row holds language label, tabs, wrap and copy.'],
                    ['Tables', [{ c: '.table-wrap' }], 'Horizontal scroll on narrow screens, sticky header styling.'],
                    ['Steps', [{ c: '.steps' }], 'Numbered with a connecting line for multi-step flows.']
                ] },
                { t: 'h2', x: 'Rules for new components' },
                { t: 'list', items: [
                    ['Colours only from tokens — add a token if nothing fits, never a literal hex in component CSS.'],
                    ['A visible ', { c: ':focus-visible' }, ' ring using ', { c: '--focus-ring' }, ' — keyboard users must see where they are.'],
                    ['Test both themes. Light theme is a re-map of the same tokens, so if your component flips correctly you did it right.'],
                    ['Respect ', { c: 'prefers-reduced-motion' }, ' — the global rule zeroes transitions, so do not reintroduce them.'],
                    ['Keep markup semantic: a button is ', { c: '<button>' }, ', a link is ', { c: '<a>' }, ', a region gets a label.']
                ] }
            ]
        },
        {
            id: 'design/accessibility',
            title: 'Accessibility',
            description: 'The WCAG AA checklist Owlet aims for: contrast, focus, labels, keyboard paths and reduced motion.',
            blocks: [
                { t: 'h2', x: 'Baseline rules' },
                { t: 'list', items: [
                    [{ b: 'Contrast' }, ' — body text at least 4.5:1 on its background; large headings 3:1. The token table on the tokens page shows live ratios.'],
                    [{ b: 'Focus' }, ' — every interactive element shows a ', { c: '--focus-ring' }, ' outline on ', { c: ':focus-visible' }, '.'],
                    [{ b: 'Labels' }, ' — icon-only buttons carry ', { c: 'aria-label' }, '; panels carry ', { c: 'aria-label' }, ' or a heading.'],
                    [{ b: 'Keyboard' }, ' — every function reachable without a mouse; dialogs trap focus and return it on close.'],
                    [{ b: 'Motion' }, ' — ', { c: 'prefers-reduced-motion: reduce' }, ' zeroes animation and smooth scrolling.'],
                    [{ b: 'Colour-independent meaning' }, ' — status is icon + text, never colour alone.'],
                    [{ b: 'Live regions' }, ' — status messages and route changes announce via ', { c: 'aria-live' }, '.']
                ] },
                { t: 'h2', x: 'Known gaps (honest list)' },
                { t: 'list', items: [
                    ['The terminal (xterm.js) renders to canvas — screen readers get limited output.'],
                    ['CodeMirror’s own a11y is weaker than a native textarea; heavy screen-reader users may struggle.'],
                    ['Mobile layout below 720 px drops some toolbar controls.']
                ] },
                { t: 'callout', kind: 'tip', title: 'Testing quickly', x: 'Tab through a page end to end, then repeat with only a screen reader (NVDA or VoiceOver). If either journey breaks, it is a bug — file it.' }
            ]
        },
        {
            id: 'design/propose',
            title: 'Proposing UI changes',
            description: 'How design contributions work in a code-only project: token change → component change → markup change.',
            blocks: [
                { t: 'h2', x: 'The three levels of change' },
                { t: 'steps', items: [
                    { title: 'Token-level', text: ['Adjust a value in ', { c: 'tokens.css' }, ' — e.g. a warmer accent or tighter radius. Smallest diff, widest reach.'] },
                    { title: 'Component-level', text: 'Restyle one component across its selectors, still reading tokens only.' },
                    { title: 'Structural', text: 'Change markup and CSS together — needs an issue discussion first so the contract (CONTRACT.md) stays intact.' }
                ] },
                { t: 'h2', x: 'Proposal checklist' },
                { t: 'list', items: [
                    ['A mock or a screenshot of both themes — a proposal without light theme is half-finished.'],
                    ['The token changes listed explicitly (name → new value).'],
                    ['Accessibility note: contrast check and focus behaviour.'],
                    ['Mobile width considered (the app collapses below 720 px).'],
                    ['Where it breaks the existing look — be honest about trade-offs.']
                ] },
                { t: 'h2', x: 'Where to file it' },
                { t: 'p', x: ['Open an issue on ', { a: 'GitHub', href: 'https://github.com/BrixoByte/Owlet/issues' }, ' labelled as a design/UI proposal. Include the mock, the token list and which components it touches. Small changes can skip straight to a PR.'] }
            ]
        }
    ]
});

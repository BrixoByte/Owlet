# Owlet — Master Plan

> Name: **Owlet** (renamed from DevPad on 2026-11-24 — rename executed across the repo)
> Status: active plan

---

## 1. Vision

A free, open-source, browser-based IDE focused on **HTML, CSS, and JavaScript** — built as a learning platform as much as a tool.

Core principles:

- **Free forever, MIT-licensed** — the project, its source, and its logo remain open. Never convert this repo into a closed or paid product.
- **Beginner-first** — a new developer can start with HTML/CSS/JS, and when something breaks, read the IDE's own source to understand why.
- **Self-demonstrating** — the entire IDE is plain HTML/CSS/JS. "An IDE small enough to read in a weekend" is the marketing hook.
- **Zero-install** — runs in the browser, offline-first, installable as a PWA.
- **Sponsored by BrixoByte** — the project exists to demonstrate BrixoByte's engineering quality; credited as "Made by BrixoByte", not branded into the name.

---

## 2. Business model (boundaries)

### This project (Owlet) — always free
- MIT license, open development, GitHub Pages hosting
- Optional BYOK integrations stay free: users plug in their own API keys for cloud sandboxes (`js/sandbox.js`) and compiler APIs (`js/compiler.js`)
- No paywalls, no feature gating, no telemetry traps

### Future separate products — never conflated with Owlet
- **Paid sandbox/tunnel service** (idea stage): BrixoByte-hosted API providing sandboxed dev environments / server tunnels. Separate brand, separate infra, pay-as-you-go pricing + an affordable monthly beginner plan. Owlet users may connect it like any BYOK provider, but it must never be required.
- **Future standalone IDE** (idea stage): a Cursor-style AI-native IDE is a different product, built separately, with its own name, license, and pricing. Not an upgrade of this repo.

### Rule
Owlet's open-source promise is permanent. Monetization happens only through *separate* services/products that Owlet users can optionally adopt.

---

## 3. Naming

**Chosen name: Owlet** — independent of BrixoByte branding; baby-owl metaphor fits the beginner-first positioning and gives a built-in mascot direction. BrixoByte is credited as maker (LICENSE copyright, README, landing footer), not embedded in the product name.

### Rejected earlier candidates (collisions found)
- DevPad — existing editors use it (previous name; replaced)
- WebForge — existing web IDE
- CodeNest — existing cloud IDE / projects
- TinkerPad — multiple existing projects + tinkerpad.ai
- PageSmith — pagesmith.ai

### Still pending after the rename
- [ ] Domain registration (`owlet.dev` / variant — check availability)
- [ ] npm package name reservation (future-proofing)
- [ ] Trademark check (USPTO/search)
- [ ] Social handles
- [ ] **GitHub repo rename** `BrixoByte/DevPad` → `BrixoByte/Owlet` (code already points at the new URLs; GitHub auto-redirects the old ones)
- [ ] Local folder rename `DevPad` → `Owlet` (OS-level, do outside the IDE)

### Rename implementation — done 2026-11-24
- [x] `index.html` title, meta tags, app header, welcome screen
- [x] `manifest.json` name/short_name, `sw.js` cache names
- [x] `landing/`, `docs/`, `roadmap/` copy + titles + OG/canonical URLs
- [x] `README.md`, `CONTRIBUTING.md`, `docs-data/` texts (+ formerly-DevPad note in README)
- [x] `window.DevPad`/`DevPadUI` namespaces → `Owlet`/`OwletUI` (all `js/` modules)
- [x] localStorage keys `devpad*` → `owlet*` with a one-time migration shim in all four bootstrap scripts (index, docs, landing, roadmap)
- [x] File renames: `docs-data/using-devpad.js` → `using-owlet.js`, `landing/assets/devpad-mark.svg` → `owlet-mark.svg`
- [x] Share-link format unchanged (`#p=`/`#s=` payloads are name-agnostic)

---

## 4. Product status

See `remain.md` for the full audit. Summary:

**Done:** multi-file workspace, split panes, tabs, live preview (data-URI), console, linting (ESLint/HTMLHint/csstree), Python via Pyodide, xterm terminal (local + pluggable engine), BYOK sandboxes (Daytona/E2B/Modal/Upstash), BYOK compiler API (16 languages), PWA, share links (public + encrypted), GitHub clone, ZIP export, themes, command palette, mobile layout, custom dropdowns, landing site, docs site, roadmap site.

**Remaining technical work (ordered):**
1. README screenshot — `assets/screenshot.png` missing, image link broken
2. Landing copy fix — Terminal/Python still marked "coming soon" though shipped
3. Per-pane status rail (line/col, language, lint status)
4. Theme picker thumbnails; typography refresh (headings font per `ui.md`)
5. `prefers-reduced-motion` pass + axe accessibility audit (WCAG AA)
6. Empty-state template gallery; project identity zone in nav bar
7. Verify sandbox terminal bridge end-to-end per provider
8. Clean up dead `buildDocument('blob')` path in `js/preview.js`
9. Tauri desktop wrapper (Phase 9 — biggest remaining feature)
10. Optional share backend (Phase 10 — deferred; only if needed)

---

## 5. Roadmap phases (next)

### Phase A — Polish & trust (now)
Finish items 1–5 above. Goal: a first-time visitor sees a finished product; a screen-reader/keyboard user can use it; README renders correctly.

### Phase B — Identity (rename done 2026-11-24)
The code/docs rename is complete (§3). Remaining: finish the GitHub repo + folder rename, then ship a branded boot animation + project identity zone (already in polish list) so the rebrand lands with visual identity, not just a find-replace. Owl logomark integrated 2026-11-24 (`assets/brand/`): hatching-owlet PNG icons as theme-aware favicons, topbar brand on all four sites, apple-touch (180), PWA icons (192/512), README logo. Still open: og-image.png for social cards, maskable variant if Android crops too tight.

### Phase C — Learning hooks (the differentiator)
Make "learn by reading the IDE" real:
- [ ] Annotated source tour — a docs page walking through `js/` module by module ("how the preview sandbox works", "how linting is wired")
- [ ] Guided template: "build this IDE inside this IDE" starter project
- [ ] In-app "View source →" links that open Owlet's own files in Owlet
- [ ] Tutorials section on docs site (HTML/CSS/JS paths)

### Phase D — Desktop (optional)
Tauri wrapper spike: native FS, real PTY, single binary. Only after Phase A polish is done.

### Phase E — Ecosystem (later, separate products)
- BrixoByte sandbox API (paid, pay-as-you-go + beginner monthly tier) — Owlet gets it as one more BYOK provider adapter
- Standalone AI IDE — separate repo, separate brand

---

## 6. Success criteria

- Repo is discoverable: unique name, working README screenshot, live demo link
- A beginner can: open the app → write HTML/CSS/JS → see it run → break something → open Owlet's own source and understand the fix
- Zero features locked behind accounts or payments
- BrixoByte credited visibly (landing footer, README, about dialog) without owning the product name

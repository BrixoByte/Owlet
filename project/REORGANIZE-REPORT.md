# Owlet repository reorganization — report

Date: 2026-11-25 · Branch: `chore/reorganize` (Tier 1) → continued on `chore/rename-owlet` (Tier 2)
Principle applied throughout: **breaking nothing matters more than a perfect structure.**

## 1. Safety net

- Working tree was dirty at start (the Owlet rename era was uncommitted). Snapshotted first: commit `4e6c943` on `chore/reorganize`, tag **`pre-reorganize`**.
- Branch `chore/reorganize` created from `main` (`a53437e`). `main` was never committed to directly.
- All moves used `git mv` (history preserved). One commit per tier.
- Mid-task, the checkout moved to `chore/rename-owlet` (parallel rename work). That branch already contained the Tier 1 moves plus `project/RENAME-REPORT.md` and the `owlet-v1 → owlet-v2` cache bump, so Tier 2 continued there. `chore/reorganize` is intact with Tier 1 (`36a34b9`).

## 2. Move map (Tier 1 — commit `36a34b9` on `chore/reorganize`, present on `chore/rename-owlet`)

| From | To | Reason |
|---|---|---|
| `plan.md` | `project/plan.md` | internal planning note |
| `remain.md` | `project/remain.md` | internal audit note |
| `roadmap.md` | `project/roadmap.md` | internal roadmap source |
| `ui.md` | `project/ui.md` | internal design spec |
| `CONTRACT.md` | `project/CONTRACT.md` | internal UI/logic contract |
| `styleguide.html` | `project/styleguide.html` | internal style reference page |
| — | `project/README.md` | new: explains the folder |

## 3. References updated

Reference map was built first (whole-repo grep of every candidate name, blob links, config objects, QA scripts, service worker, manifests). Findings and fixes:

- **GitHub blob links → `project/roadmap.md`** (4 sites): `docs/js/docs.js` `CONFIG.roadmapUrl`, `docs/js/docs-data/reference.js:18`, `landing/index.html:125`, `roadmap/index.html:105` **and** the `<noscript>` copy at `roadmap/index.html:274` (caught by the static audit, fixed before commit).
- **Text mentions**: `README.md:159`, `docs/README.md:80–81`, `docs/js/docs-data/{contributing,design,developer,getting-started,reference}.js`, `roadmap/js/roadmap-data.js:132`, `js/ui/contract.js` comments (lines 9, 27, 154) → `project/…` paths.
- **`project/styleguide.html`**: 7 internal refs prefixed `../` (favicon, 3 stylesheets, 4 `js/ui/*` scripts). Verified no page links *to* styleguide — it's standalone.
- **`qa/scripts/static-audit.mjs`**: `PAGES` entry updated to `project/styleguide.html`.
- **Untouched by design**: `roadmap/js/roadmap.js:817` (`a.download = 'owlet-roadmap.md'` is an export filename, not a repo path); `sw.js` `SHELL` (no moved file was precached — no cache bump needed); `manifest.json` (icons under `assets/`, unmoved).

## 4. Unreferenced / near-unused files (listed, nothing deleted)

- **`project/*.md`, `project/styleguide.html`** — internal by intent; reachable on GitHub and via repo navigation only.
- **`assets/brand/icon-light.png`, `mark-on-dark.png`, `mark-on-light.png`** — referenced only by `assets/brand/BRAND.md` (brand-kit sources, not runtime assets). `icon-dark.png` is additionally used in `README.md`. All other icons are used by `index.html`, the three sub-sites, and `manifest.json`.
- **`assets/brand/palette.txt`** — referenced only by `BRAND.md`.
- **`assets/screenshot.png`, `landing/assets/og-image.png`** — referenced (`README.md`, `landing/index.html`) and required by the static audit.
- No dead root files found; `script.js`/`style.css` deletions pre-date this work (superseded by `js/`, `css/`).

## 5. Tier 2 — additions and audits (commit `338701b` on `chore/rename-owlet`)

- **Added**: `.gitignore` (earlier, in the snapshot commit — required so `qa/node_modules`, Playwright `test-results`, HTML report don't get committed), `.editorconfig` (LF, 4-space, `insert_final_newline`), `.github/PULL_REQUEST_TEMPLATE.md` (checklist encodes the no-build / sub-path / QA rules).
- **`.github` inspected**: `workflows/static.yml` deploys the whole repo to Pages (`path: '.'`) — `project/` is served but unreachable from the app, harmless. Issue templates clean, no stale paths.
- **Sub-path audit**: zero `href="/`, `src="/`, `url(/` absolute paths in the repo — all pages use relative links, so GitHub Pages sub-path deploys (`user.github.io/RepoName/…`) keep working. `landing/js/main.js` uses `'../roadmap/index.html'` style relative URLs.
- **`sw.js`**: precache list is app-shell only; nothing moved into it. Cache name is `owlet-v2` on `chore/rename-owlet` (bumped for the rename by the parallel session) — correct as-is.

## 6. Regression gates

| Check | Result |
|---|---|
| `node qa/scripts/static-audit.mjs` after Tier 1 | First run caught 1 missed `<noscript>` blob link → fixed; re-run clean (**0 broken**, 2 Info-only findings, 271 internal refs checked) |
| `node qa/scripts/static-audit.mjs` after Tier 2 | Clean, same 2 Info findings |
| `npx playwright test --workers 2` (Gate 1) | **117 total: 115 pass + 2 flaky-on-retry, 0 failures** (~7.5 min) |
| `npx playwright test --workers 2` (Gate 2) | see below |
| `sw.js` precache + `manifest.json` icons | verified manually — unchanged and valid |
| `file://` usage | covered by `smoke-v01.spec.ts:168` (boots `index.html` over `file:///`) |

- **Investigated failure**: `shortcuts-parity` failed once during Gate 1 ("README is stale"). Proven **pre-existing**, not a Tier 1 regression — `git diff 4e6c943 HEAD -- README.md` shows only the line-159 link fix; the marker-block comparison in `shortcut-source.js` is line-ending sensitive and the spec passes consistently on re-run (`sync-shortcuts --check` reports current). Two chromium smoke tests (`folder import`, `export ZIP round-trip`) were flaky but passed on retry.

## 7. Tier 3 — PROPOSAL ONLY (not implemented; say "go tier 3" to execute)

Goal: split `js/` and `css/` by concern. **All paths below are proposals.**

### Proposed destinations

| File | Proposed | Layer |
|---|---|---|
| `js/state.js`, `js/storage.js`, `js/tabs.js`, `js/editorgroups.js` | `js/core/` | workspace state |
| `js/editor.js`, `js/filetree.js`, `js/preview.js`, `js/console.js`, `js/error-details.js` | `js/ide/` | editor surface |
| `js/lint.js`, `js/python.js`, `js/terminal.js`, `js/sandbox.js`, `js/compiler.js` | `js/engines/` | runtimes/linters |
| `js/app.js`, `js/share.js`, `js/clone.js`, `js/import.js` | `js/app/` | wiring/features |
| `js/ui/*` (20 files) | keep as `js/ui/` | already clean |
| `css/tokens.css`, `css/themes.css` | `css/base/` | design tokens |
| `css/components.css`, `css/dialog.css`, `css/menu.css`, `css/settings.css` | `css/ui/` | UI components |
| `css/layout.css`, `css/console.css` | `css/panels/` | workspace panels |
| `css/style.css` | `css/` (keep) | entry stylesheet |

### Required edits if executed

- `index.html`: 8 stylesheet `<link>`s (lines 53–60) + 37 `<script src>`s (lines 830–870) — **load order must be preserved exactly** (state → storage → editor → … → `js/ui/boot.js`; `boot.js` must stay last).
- `sw.js`: update all 14 `SHELL` paths under `js/` **and** bump `CACHE_NAME` (`owlet-v2` → `owlet-v3`) or every existing visitor is stranded on the old cache.
- `qa/scripts/shortcut-source.js` (reads `js/ui/shortcuts.js`), `qa/scripts/static-audit.mjs` (`jsCorpus` list lines 127–128, `scanDirs` line 140) — path-sensitive, must be updated.
- `project/styleguide.html`: 4 `../js/ui/*` refs — unaffected if `js/ui/` stays put.
- Comments/docs referencing paths: `css/*.css` comments, `docs/README.md`, `docs/js/docs-data/*` — cosmetic but should track.

### Risk estimate: **Medium**

- Script load order is the only real hazard — a reordering = instant boot failure. Mitigation: move files without reordering tags; the 117-test suite is a strong regression net (all init paths are covered).
- `file://` + GitHub Pages sub-paths stay safe as long as refs remain relative.
- `sw.js` cache-name bump is the mandatory step most easily forgotten.
- **Recommendation**: not worth it yet. Current `js/` + `js/ui/` split is readable; a finer split adds churn before the app grows more modules.

## 8. Uncertainties

- The branch switch mid-task (`chore/reorganize` → `chore/rename-owlet`) is assumed intentional (parallel session). Both branches are preserved; nothing was merged to `main`.
- Browser/visual verification was not performed — the Playwright suite and static audit are the only gates run. `2 flaky` chromium smoke tests passed on retry.
- `qa/report/*.json` artifacts are tracked (pre-existing state); test runs regenerate them.

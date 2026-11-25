# Owlet — Progress & Remaining Work

Status snapshot: what is done, what is partially done, and what is still left.
Checked against `roadmap.md`, `ui.md`, and the actual codebase.

---

## ✅ Done — Core IDE (roadmap.md Phases 0–8)

### Phase 0 — Repo hygiene
- [x] Clean `README.md` with proper structure + Live Demo link
- [x] `CONTRIBUTING.md`, `LICENSE` (MIT), GitHub Pages hosting
- [x] CI workflow in `.github/workflows`
- [ ] **Screenshot still missing** — `README.md` references `assets/screenshot.png` but no `assets/` folder exists at the repo root (only `landing/assets/`)

### Phase 1 — Multi-file workspace
- [x] File tree sidebar — create/rename/delete files & folders (`js/filetree.js`)
- [x] Tab bar with unsaved indicators (`js/tabs.js`)
- [x] Storage layer — localStorage + File System Access API for real folders (`js/storage.js`)
- [x] Split editor panes with shared docs (`js/editorgroups.js`, `js/editor.js`)
- [x] Multi-file preview — relative paths resolved (data-URI inlined resources) (`js/preview.js`)

### Phase 2 — Console, linting, suggestions
- [x] Console panel — `console.log`/warn/error captured from preview (`js/console.js`)
- [x] Error display with file/line mapping (`js/error-details.js`)
- [x] Auto-suggest while typing (CodeMirror hint addons)
- [x] Real-time linting — ESLint (JS), HTMLHint (HTML), csstree (CSS) (`js/lint.js`)

### Phase 3 — Python
- [x] Pyodide (real CPython) — lazy-loaded, streams output to console (`js/python.js`)
- [x] Python editor mode + Python REPL in terminal

### Phase 4 — Terminal
- [x] xterm.js bottom drawer, `` Ctrl+` `` toggle (`js/terminal.js`)
- [x] Local mode — virtual commands, JS REPL, Python REPL
- [x] Pluggable engine interface for cloud attach

### Phase 5 — Cloud sandboxes (BYOK)
- [x] Provider adapters: Daytona, E2B, Modal, Upstash Box (`js/sandbox.js`)
- [x] API key in localStorage, optional CORS proxy URL setting

### Phase 6 — Compiler API (BYOK)
- [x] Judge0-style endpoint for 16 languages — C, C++, Java, Python, JS, TS, Go, Rust, Ruby, PHP, C#, Swift, Kotlin, SQL, Bash (`js/compiler.js`)

### Phase 7 — PWA
- [x] Service worker (`sw.js`) + `manifest.json` — installable, offline after first load

### Phase 8 — UI polish (partially, see remaining list below)
- [x] Resizable panel dividers + layout presets (`js/ui/layout.js`)
- [x] Device-frame preview, responsive sizes, rotation (`js/ui/preview-panel.js`)
- [x] Command palette (`Ctrl+P`)
- [x] Theme system — dark / light / high-contrast (`js/ui/theme.js`, `css/themes.css`)
- [x] Toasts, status bar, tooltips, dialogs (`js/ui/toast.js` etc.)
- [x] Custom dropdowns + checkboxes replacing browser defaults (`js/ui/selects.js`)
- [x] Themed scrollbars (app + injected into preview)
- [x] Mobile layout / bottom-nav views (`layout.js` `setMobileView`)
- [x] Run button loading animation before preview reveal

---

## ✅ Done — Beyond the original roadmap

- [x] **Landing page** (`landing/`) — full marketing site: hero demo, role tabs, scroll showcase, capabilities diagram, FAQ, GitHub stats, open-source section
- [x] **Docs site** (`docs/`) — multi-page documentation with sidebar nav, search (`Ctrl+K`), TOC, prev/next, dark/light theme (`docs/js/docs.js`, `docs-data/`)
- [x] **Roadmap page** (`roadmap/`) — public visual roadmap
- [x] **Share links** (`js/share.js`) — public (`#p=`) compressed links + private (`#s=`) AES-GCM encrypted links, no server
- [x] **GitHub clone** (`js/clone.js`) — download public repo tarball, extract in-browser
- [x] **ZIP export** (JSZip)
- [x] **Styleguide** (`styleguide.html`)

---

## 🔨 Remaining

### Roadmap leftovers
- [ ] **Phase 9 — Tauri desktop app** — Rust wrapper for native FS, real PTY terminal, global shortcuts. Not started.
- [ ] **Phase 10 — Optional backend** — share API (DO droplet or CF Workers+KV). Deferred by design; only if needed.
- [ ] **README screenshot** — add `assets/screenshot.png` (or a GIF) so the README image resolves.

### ui.md polish not yet implemented
- [ ] **In-editor status rail** — line/col, language badge, lint status inside each editor pane (status bar exists globally; per-pane rail missing)
- [ ] **Inline run snippets** — hoverable play icon to run selected JS
- [ ] **Preview rulers/grid overlay** — layout-debugging overlay
- [ ] **Preview background options** — transparent / checkerboard / gradient
- [ ] **Live-reload feedback** — toast/badge with refresh timing (ms)
- [ ] **Theme picker thumbnails** — swatches in the theme dropdown
- [ ] **Typography refresh** — `ui.md` suggests Plus Jakarta Sans for headings (currently Inter everywhere)
- [ ] **Project identity zone** — project name + save-state pill + last-edited in nav bar
- [ ] **Entry animation** — branded boot animation instead of generic load
- [ ] **Empty-state template gallery** — starter templates when workspace is blank (basic empty template exists; gallery does not)
- [ ] **Achievement badges** — optional gamification (low priority)
- [ ] **WCAG AA audit** — contrast check with tooling (axe), `prefers-reduced-motion` pass, focus-state review
- [ ] **Localization readiness** — `aria-label` coverage audit (landing footer already reserves a disabled language picker)

### Known code debt
- [ ] **`landing/` capability list is stale** — landing page marks Terminal and Python "coming soon" but both exist in the app. Update the copy/dock flags.
- [ ] **Verify sandbox terminal bridge end-to-end** — adapters exist (`js/sandbox.js`), but the full cloud-attach flow hasn't been live-tested against each provider.
- [ ] **Preview blob mode dead code** — `buildDocument('blob')` path remains after the switch to data-URI documents; either keep for future use or clean up.

---

## Suggested next order

1. README screenshot (5-minute visible win)
2. Landing page copy fix (Terminal/Python "coming soon" → available)
3. Per-pane status rail + theme picker thumbnails (visible polish)
4. `prefers-reduced-motion` + axe accessibility pass
5. Phase 9 Tauri spike (biggest remaining feature)

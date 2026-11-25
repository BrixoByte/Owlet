# Owlet Master Roadmap

A phase-by-phase plan to evolve Owlet from a single-file HTML/CSS/JS playground into a
lightweight, offline-first, VS Code-style web IDE — while staying 100% vanilla,
beginner-readable, and free (MIT).

## Guiding Principles

- **Vanilla only** — plain HTML/CSS/JS, CDN `<script>` tags, no npm, no build step.
- **Beginner-readable** — a new developer should be able to read the whole codebase and learn from it.
- **Offline-first** — everything that can run in the browser runs in the browser. Zero server cost.
- **No vendor lock-in** — cloud features are optional and use the user's own free API key (BYOK).
- **$0 to run** — static hosting (GitHub Pages), client-side execution, free-tier sandboxes.

## Final Architecture (Target)

| Layer | Technology | Cost | Offline? |
|---|---|---|---|
| UI & layout | Pure HTML5 + CSS Grid + CSS variables | Free | Yes |
| Editor engine | CodeMirror (already integrated) | Free | Yes |
| HTML/CSS/JS preview | Sandboxed `<iframe>` + Blob URLs | Free | Yes |
| Python execution | Pyodide (WebAssembly, via CDN) | Free | Yes (after first load + cache) |
| Multi-language execution (C++, Java, Go…) | Cloud compiler API via BYOK or free CF Worker proxy | Free tier | No |
| Node.js / npm / real terminal | Cloud sandbox via BYOK (Daytona / E2B / Modal / Upstash Box) | User's free credits | No |
| Local file access | File System Access API (native browser) | Free | Yes |
| Terminal UI | xterm.js (CDN) | Free | Yes |
| Persistence | localStorage + IndexedDB | Free | Yes |
| Desktop app | Tauri v2 (Rust backend, same HTML/CSS/JS frontend) | Free | Yes |

---

## Phase 0 — Repo Hygiene & Live Demo

Small fixes that make the project presentable before any feature work.

- **Fix `README.md`** — broken clone URL (`DevAhtasham` → `BrixoByte`, missing line break), `� Acknowledgments` encoding glitch, flat markdown → proper headings/bullets/fenced code blocks.
- **Enable GitHub Pages** — host `index.html` for free; add a "Live Demo" link at the top of the README.
- **Add a screenshot/GIF** — single biggest trust builder for a UI-focused project.
- **Check dead links** — `CONTRIBUTING.md`, `LICENSE`, Wiki references must resolve or be removed.
- **Deliverable:** clean repo + live URL visitors can try instantly.

## Phase 1 — True Multi-File Workspace

Turn Owlet from "3 fixed textareas" into a real mini-IDE. Highest-impact change.

- **File tree sidebar** — create/rename/delete files & folders (HTML, CSS, JS, and later `.py`).
- **Tab bar** — open files as tabs, unsaved-dot indicator, close/switch via keyboard.
- **Storage layer** — abstract project storage behind one module:
  - `localStorage`/`IndexedDB` for in-browser projects (always available).
  - File System Access API (`showDirectoryPicker`) to open a real local folder, edit it, and save with `Ctrl+S` — VS Code behavior, Chromium only, graceful fallback elsewhere.
- **Multi-file preview** — resolve relative paths (`./style.css`, `./app.js`, images) into Blob URLs so a real multi-file project renders correctly in the iframe.
- **Deliverable:** open a folder from disk, edit multiple files, live-preview the whole project.

## Phase 2 — Console, Linting & Suggestions

Beginners learn from errors; today errors are invisible.

- **Console panel** — bottom drawer (VS Code-style) capturing `console.log`, warnings, and errors from the preview iframe (`window.onerror` + `console` proxy injection).
- **Error display** — runtime errors shown with file/line info; badge count on the console tab.
- **Auto-suggest while typing** — `inputRead` listener on each editor triggers `showHint({ completeSingle: false })` on word chars / `<`, `.`, `:` — VS Code-style popup instead of Ctrl+Space only (hint addons already loaded).
- **Real-time linting — all free browser builds via CDN, wired to CodeMirror's lint addon:**
  - **JS:** ESLint browser build (`eslint.linter.js`) — real rules-based squiggles.
  - **HTML:** HTMLHint — unclosed tags, invalid attributes.
  - **CSS:** csstree — syntax validation.
  - **Python (with Phase 3):** Pyodide-side `ast`/`pyflakes` syntax check.
- **Editor decision: CodeMirror stays** — lightweight + beginner-readable + CDN-only are the goals; no heavy editor swap.
- **Deliverable:** `console.log`, lint squiggles, and live suggestions all visible inside Owlet — zero server.

## Phase 3 — Python Support (Offline, Free)

Pyodide = real CPython + NumPy/Pandas compiled to WASM, runs fully client-side.

- **Python editor mode** — `.py` files open a Python-flavored CodeMirror pane.
- **Run button** — execute via `pyodide.runPythonAsync`, stream stdout/stderr into the console panel.
- **Lazy loading** — Pyodide (~10–15 MB) downloads from CDN only on first Python run, then caches.
- **Deliverable:** write Python in Owlet, run it with zero server, works offline after first load.

## Phase 4 — Terminal Panel (One UI, Pluggable Engines)

- **xterm.js terminal drawer** — VS Code-style bottom terminal, toggle with `` Ctrl+` ``.
- **Design principle:** build the terminal UI once; swap the "engine" behind it. The user always sees the same terminal — only what interprets the commands changes.
- **Local Mode (default — offline, no key, no sandbox):**
  - **Virtual commands** — `help`, `clear`, `ls`, `open <file>`, `run`, `theme` — operating on Owlet's file tree.
  - **JS REPL** — evaluate any JavaScript expression (Chrome DevTools console–like), optionally against the preview context.
  - **Python REPL** — wired to Phase 3's Pyodide; `print("hi")` just works.
- **Cloud Mode (after Phase 5 connects):** same terminal becomes a real Linux shell — `npm install`, `node app.js`, `ls -la` for real.
- **Switching:** command like `connect sandbox` / `disconnect`, or a toggle in the terminal header.
- **Deliverable:** a fully working offline terminal (no key needed for beginners), architected so a cloud shell plugs in later without UI changes.

## Phase 5 — Cloud Sandboxes via BYOK (Node.js, npm, real shell)

The power-user layer. Owlet itself stays free; each user optionally connects their own free sandbox account — the Phase 4 terminal then switches from Local Mode to Cloud Mode.

- **Providers to support (all have free signup tiers):**
  - **Daytona** — ~$200 signup credits, full Linux sandbox, npm/bash/file system.
  - **E2B** — ~$100 credits, microVMs, JS SDK.
  - **Modal** — ~$30/month recurring credits.
  - **Upstash Box** — free tier, persistent boxes.
- **Settings → Cloud Sandbox** — user pastes their API key; stored in `localStorage` only (never on our server — there is no server).
- **CORS proxy (optional)** — a ~20-line Cloudflare Worker (100k req/day free) forwards the user's own key, for providers that block browser calls.
- **Terminal bridge** — sandbox shell attaches to the Phase 4 xterm.js panel; `npm install`, `node app.js` work for real.
- **Deliverable:** one click → real Node.js + bash terminal inside Owlet, $0 cost to the project.

## Phase 6 — Optional: Other Languages via Compiler API

- **BYOK compiler APIs** — OnlineCompiler.io / Judge0 style services for C++, Java, Rust, Go (30+ languages, one POST request).
- **Note:** the old free Piston public endpoint is whitelist-only since Feb 2026 — don't hardcode it; keep the provider configurable.
- **Deliverable:** "Run" works for non-web languages when the user adds a key; offline mode still fully functional without it.

## Phase 7 — PWA & True Offline

- **Service worker** — cache the app shell + CDN assets (CodeMirror, xterm, Pyodide) so Owlet opens with no internet.
- **Web app manifest** — "Install Owlet" prompt, icon, standalone window.
- **Deliverable:** installable, airplane-mode-capable IDE.

## Phase 8 — UI Polish

Execute `ui.md` (already written): resizable divider, device-frame previews, toasts/progress bar,
accessibility pass (WCAG AA, focus states, `prefers-reduced-motion`), responsive breakpoints,
command palette (`Ctrl+P`).

## Phase 9 — Desktop App via Tauri

Same HTML/CSS/JS frontend, wrapped in Rust.

- **Real powers unlocked:** native file system everywhere (not just Chromium), real PTY terminal (PowerShell/Bash locally — no sandbox needed), global shortcuts, menu bar, ~20–30 MB installer vs Electron's 150 MB+.
- **Prereq:** Rust toolchain; backend commands (fs, pty) written in Rust — UI code unchanged.
- **Deliverable:** Owlet `.exe` / `.dmg` / `.AppImage` — VS Code-standard capability at a fraction of the weight.

## Phase 10 — Optional Backend (Only If Sharing Grows)

Deferred — only if shareable project links become a must-have.

- **$5–6 DigitalOcean droplet** as an API gateway: project save/share, rate limiting, caching.
  - Light API use → 200–500 concurrent users. Heavy compile jobs → keep them client-side/BYOK.
- **Free alternative:** Cloudflare Workers + KV/D1 free tier for simple share links.

---

## Scale & Cost Reality Check

- **Client-side features (Phases 1–4):** unlimited concurrent users — each user's own CPU/RAM does the work.
- **BYOK sandboxes (Phase 5):** each user's own free-tier quota; project pays nothing.
- **Only real cost ever needed:** optional $5–6 droplet in Phase 10, and only for sharing — not execution.

## Suggested Build Order

1. Phase 0 (repo cleanup + Pages) — half a day, immediate visible win.
2. Phase 1 (file tree + multi-file preview) — the core IDE upgrade.
3. Phase 2 (console panel) — learning value, small scope.
4. Phase 3 (Pyodide) — big "wow" feature, still vanilla.
5. Phase 4 (terminal) → Phase 5 (BYOK sandbox) → Phase 6 (compiler APIs).
6. Phase 7 (PWA) → Phase 8 (UI polish) → Phase 9 (Tauri) → Phase 10 (backend, if needed).

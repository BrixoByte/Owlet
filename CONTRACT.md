# Owlet UI Contract

The UI layer (`js/ui/*`, `css/*`) talks to the logic layer (`js/*.js`) only through
the bridge in `js/ui/contract.js`. Plug a real backend in by changing the bridge,
not the design.

## Direction of traffic

- **UI to logic:** `OwletUI.emit('ui:<name>', detail)` dispatches a `CustomEvent`
  on `window`. `contract.js` listens and calls the matching `Owlet.*` function,
  or logs a stub.
- **Logic to UI:** call the functions on `window.OwletUI`. They store data in
  `OwletUI.snapshot` and dispatch `owletui:changed` with `{ topic }`. Panels
  re-render on that event.

## UI to logic events

| Event | Detail | Status |
|---|---|---|
| `ui:file-open` | `{ path, line?, col? }` | Connected: opens tab, moves cursor |
| `ui:preview-refresh` | `{}` | Connected: `Owlet.preview.update()` |
| `ui:run` | `{}` | Connected: clicks `#btn-run` |
| `ui:setting-change` | `{ key: 'fontSize'\|'tabSize'\|'lineNumbers'\|'wordWrap', value }` | Connected: saved in `owlet:settings`, applied |
| `ui:theme-change` | `{ theme, accent }` | Informational |
| `ui:file-create` / `ui:file-rename` / `ui:file-delete` / `ui:folder-create` | path fields | Stub (File actions still use `filetree.js`) |
| `ui:terminal-input` / `ui:terminal-profile` / `ui:terminal-kill` | | Stub. TODO: connect backend |
| `ui:git-stage` / `ui:git-unstage` / `ui:git-discard` / `ui:git-commit` / `ui:git-checkout` / `ui:git-sync` | | Stub. TODO: connect backend |
| `ui:ai-send` / `ui:ai-stop` | | Stub. TODO: connect backend |
| `ui:collab-share` / `ui:sandbox-connect` | | Stub. TODO: connect backend |

## Logic to UI functions (`window.OwletUI`)

| Function | Purpose |
|---|---|
| `setTree(entries)` | `[{ path, git: 'M'\|'A'\|'U'\|'D' }]`. Colours and letters the Explorer rows. Structure still comes from `Owlet.state`. |
| `setGitChanges(list)` | `[{ path, status, staged }]`. Source Control list and rail badge. |
| `setProblems(list)` | `[{ path, line, col, severity: 'error'\|'warn'\|'info', message, source }]`. Problems panel and status counts. |
| `addConsoleLine(type, text)` | `type`: `log`\|`info`\|`warn`\|`error`. Uses `Owlet.console.log`. |
| `setStatus(partial)` | `{ branch, ahead, behind, sandbox, ai }`. Only passed keys change. |
| `setTerminalState(state, label)` | `state`: `local`\|`connecting`\|`connected`\|`disconnected`. |
| `setPreviewError(err \| null)` | `{ message, file, line, col }`. Shows or clears the preview banner. |
| `setCollaborators(list)` | `[{ name, initials, color }]`. Top-bar avatars. |
| `streamAiToken(text, done?)` | Accumulates streamed AI text in `snapshot.ai.streaming`. |
| `toast(message, type, options)` | `type`: `info`\|`success`\|`warn`\|`error`. `options`: `{ title, action: { label, onClick }, duration }`. Returns `{ dismiss() }`. |
| `getSnapshot()` | Read-only copy of the UI state. |

Other helpers: `OwletUI.icon(name)` returns SVG markup. `OwletUI.menu.open(anchor, items)`
opens a keyboard-accessible menu. `OwletUI.prefs.get/set` read and write UI preferences.

## Mock data

`js/ui/mock.js` feeds fake data through the functions above. It is on by default.
Turn it off in the browser console with `localStorage.setItem('owlet:ui:mock', '0')`.
Every mock call is marked `// TODO: connect backend`.

## Where the logic is wrapped (not edited)

- `Owlet.preview.scheduleUpdate` is wrapped by `preview-panel.js` so auto-refresh can pause.
- The Explorer, tabs and console are decorated through `MutationObserver`s, so the logic re-renders freely.
- The bottom dock sets `.active` on panels to match the active tab. Terminal and console logic still toggle their own classes.

## Known limitations

- Console objects are not collapsible trees (`console.js` writes strings).
- Terminal ANSI palette follows the theme only when a terminal is created.
- Preview light/dark toggle changes the surround, not the page's own colours.
- Settings dialog is unchanged (no search or reset-per-setting yet).

# Repo Rename Report — DevPad → Owlet (GitHub)

Date: 2026-11-25
Branch: `chore/rename-owlet`
Tag: `pre-rename` (commit `36a34b9`, tagged before any rename work)
Old repo: `https://github.com/BrixoByte/DevPad`
New repo: `https://github.com/BrixoByte/Owlet`
New Pages URL: `https://brixobyte.github.io/Owlet/`

## What changed in this repo

The product-level rename (namespaces, copy, manifest, storage keys) shipped earlier
on 2026-11-24, so the code already pointed at the `Owlet` URLs everywhere. The audit
found **zero** remaining `BrixoByte/DevPad` or `brixobyte.github.io/DevPad`
references outside generated test artifacts (`qa/report/*.json` local file paths)
and this note. All paths are relative (`./`, `../`), so the repo is base-path-agnostic.

Changed files (2 commits on `chore/rename-owlet`):

| File | Change | Reason |
|---|---|---|
| `sw.js` | `CACHE_NAME` `owlet-v1` → `owlet-v2` | Allowed cache-version bump; old cache is deleted on `activate` |
| `project/plan.md` | Checked off the repo-rename item | Documentation |

No other source edits were required: `manifest.json` uses relative
`start_url`/`scope` with no repo path in `id`, the service worker pre-caches a
relative shell list, and no badges, sitemap, or issue-template URLs referenced the
old name.

## Intentionally kept (do not rename)

| Identifier | Where | Reason |
|---|---|---|
| `devpad*` localStorage keys | `index.html`, `docs/index.html`, `landing/index.html`, `roadmap/index.html` (migration shims) | One-time migration of existing users' projects/settings; removing them erases pre-rename user data |
| `Formerly known as DevPad` | `README.md` | Historical branding note |
| DevPad-era references | `project/plan.md` | Plan/history document |
| `devpad` allowance | `qa/scripts/static-audit.mjs` (`brandingAllowed` regex) | Lets migration shims pass the branding audit |
| `DevPad` path strings | `qa/report/*.json` | Generated Playwright artifacts; they contain local filesystem paths, not public URLs |

## Git / GitHub commands executed

```bash
git tag pre-rename
git switch -c chore/rename-owlet
# (edit) sw.js CACHE_NAME -> owlet-v2
git commit -m "chore(sw): bump cache name owlet-v1 -> owlet-v2 for repo rename"

# Checkpoint A — GitHub rename (authenticated gh CLI, account DevAhtasham, https)
gh repo rename Owlet --repo BrixoByte/DevPad --yes

git remote set-url origin https://github.com/BrixoByte/Owlet.git
git fetch origin
git push -u origin chore/rename-owlet
git push origin pre-rename
```

A repo-local git identity (`Ahtasham Shahid <developerxilent@gmail.com>`, taken
from existing commit history) was set because none was configured.

## GitHub-side state after rename (verified via `gh api`)

- Repo: `BrixoByte/Owlet`, default branch `main`
- About/Homepage: auto-updated to `https://brixobyte.github.io/Owlet/`
- Pages: serves from `main` `/`, `html_url` = `https://brixobyte.github.io/Owlet/`

## Verification results

- Static audit (`npm run audit` in `/qa`): 0 broken internal links, 44 external URLs on 6 hosts, 2 Info-level notes only (docs note + shortcut parity gap — neither related to rename)
- Full suite (`npm test`, workers 2): **115 passed, 2 flaky, 0 failed** (117 total; flaky tests passed on retry)
- `git remote -v` → both remotes `https://github.com/BrixoByte/Owlet.git`
- `git fetch origin` clean; branch + `pre-rename` tag pushed

## Not done / optional

- **Local folder rename** `F:\Developer\Web Apps\DevPad` → `Owlet`: optional, cosmetic. Safe steps (outside the IDE): close IDE → rename folder in Explorer → reopen; the `.git` dir and remotes need no changes. Update any IDE workspace/shortcut paths afterward.
- **Old Pages URL** `https://brixobyte.github.io/DevPad/` now 404s — GitHub repo redirects do **not** cover Pages. External bookmarks pointing there must be updated.
- Merge of `chore/rename-owlet` → `main` and post-deploy live smoke checks remain pending user approval.

## Live-site check results (2026-11-25, before merge)

- `https://github.com/BrixoByte/DevPad` → 301 redirect to `/BrixoByte/Owlet` (repo redirect works)
- `https://brixobyte.github.io/DevPad/` → 404 (expected; Pages has no repo redirects)
- `https://brixobyte.github.io/Owlet/` → 200
- `sw.js`, `landing/`, `docs/`, `roadmap/` on the new Pages URL → 404 **for a pre-existing reason**: `origin/main` (`a53437e`) still holds the original DevPad-era files. The current app lives on `chore/reorganize` and was never merged. Merging `chore/rename-owlet` (or `chore/reorganize`) to `main` will deploy the real Owlet site.

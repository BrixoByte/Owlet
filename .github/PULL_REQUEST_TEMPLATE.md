**What**
A short description of the change.

**Why**
What problem it solves or which issue it closes.

**Checklist**
- [ ] No build step added — the app still runs as plain files over `file://` and HTTP(S)
- [ ] No absolute `href="/` or `src="/` paths added (must work under GitHub Pages sub-paths)
- [ ] `node qa/scripts/static-audit.mjs` shows no new findings
- [ ] `cd qa && npx playwright test` passes (117 tests)
- [ ] If behaviour changed, the matching page in `docs/js/docs-data/` was updated
- [ ] If a shortcut changed, `cd qa && npm run shortcuts:readme` was run

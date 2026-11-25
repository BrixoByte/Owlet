# Owlet QA suite

Dev-only. The app itself stays npm-free; nothing here is loaded by the site.

## One-time setup

```powershell
cd qa
npm install
npx playwright install chromium firefox webkit
```

## Run everything

```powershell
npm run audit          # static checks (no browser, no install needed)
npm test               # full Playwright suite on chromium, firefox, webkit
npm run report         # open report/html
```

Outputs: `report/html`, `report/results.json`, `report/junit.xml`, `report/test-results` (traces, screenshots, videos), `report/static-audit.json`.

## Layout

- `scripts/static-audit.mjs` — link/anchor, GitHub-link, shortcut parity, branding and repo-file checks. Zero dependencies.
- `playwright.config.ts` — projects, reporters, retries (2), `webServer` (python http.server on 127.0.0.1:4173 from the repo root).
- `fixtures/collector.ts` — attaches console errors/warnings, pageerror, requestfailed, HTTP >= 400, unexpected external hosts to each test.
- `specs/` — one spec per phase. `@smoke` tag marks the quick subset.

## Add a test

1. Create `specs/<area>.spec.ts`, import `test, expect` from `../fixtures/collector`.
2. Locate by role/label/text first. Use `data-testid` only if it already exists in the app.
3. Assert a visible outcome (`toBeVisible`, `toHaveText`, file contents), never just that a click happened.
4. Use web-first assertions (`expect(locator)...`) instead of `waitForTimeout`.

## Not yet run

Only the Phase 2 smoke spec exists. Browser tests have not been executed in this environment because Playwright is not installed in `qa/` yet (see the install step above).

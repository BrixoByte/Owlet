# Owlet Docs

The Owlet documentation site. Vanilla HTML/CSS/JS — no build step, no
framework, no fetch() of local files, so it works identically from `file://`
and GitHub Pages.

## Run it

- **Locally**: open `index.html` directly in a browser, or serve the repo root
  (`python -m http.server 8000` → `http://localhost:8000/docs/`).
- **Deploy**: it lives inside the main repo, so publishing the repo root on
  GitHub Pages (`Settings → Pages → deploy from branch → / (root)`) puts the
  docs at `https://brixobyte.github.io/Owlet/docs/` automatically. Nothing
  else to configure.

## Structure

```
docs/
  index.html            shell: top bar, sidebar, article, TOC, search dialog
  css/docs.css          docs-only styles (loads ../landing/css/tokens.css first)
  js/docs.js            CONFIG, hash router, block renderer, sidebar, TOC, theme
  js/search.js          client-side search (index built from the same data)
  js/docs-data/*.js     content — one file per sidebar group
```

## How to add a page

1. Open the `js/docs-data/*.js` file for the group you want (or create a new
   one following the same pattern and add its `<script>` tag to `index.html`
   before `js/docs.js`).
2. Add an object to `pages:`:

```js
{
    id: 'using-owlet/my-page',          // route: #/using-owlet/my-page
    title: 'My page',
    description: 'Shown under the title and used as meta description.',
    badge: 'planned',                    // optional: ok | progress | planned | experimental
    blocks: [
        { t: 'h2', x: 'Section' },
        { t: 'p', x: 'Paragraph text.' }
    ]
}
```

3. Reload — the sidebar, TOC, search index, and prev/next links all pick it up
   automatically. There is no manifest to update beyond the page object itself.

## Block types

| `t` | Purpose |
|---|---|
| `h2`, `h3` | Headings; auto-slugged for TOC + anchor links |
| `p` | Paragraph |
| `list` | `items: [inline]`; `style: 'ol'` for numbered |
| `steps` | `items: [{title, text}]` with a connecting line |
| `code` | `lang` + `code`, or `tabs: [{label, lang, code}]`; `remember` persists tab choice |
| `callout` | `kind: note|tip|warning|danger|planned`, `title`, `x` |
| `table` | `head: []`, `rows: [[]]` (cells are inline values) |
| `figure` | `src`, `alt`, `caption`, `ratio`; shows a placeholder if the image is missing |
| `badge-list` | `items: [{kind, text}]` |
| `cards` | `items: [{title, text, href?}]` |
| `filetree` | `lines: [{text, note}]`, `gutter` for note column |
| `shortcut-table` | `filter: true`; reads `OwletDocs.SHORTCUTS` |
| `token-table` | `items: [{name: '--token'}]`; live values + contrast |

**Inline values** (any `x`, `text`, list item, or table cell) are strings or
arrays of segments: `'text'`, `{ c: 'code' }`, `{ b: 'bold' }`, `{ i: 'italic' }`,
`{ a: 'link text', href: '…' }`, `{ kbd: 'Ctrl+S' }`, `{ br: true }`,
`{ badge: { kind: 'ok' } }`.

Content renders via `createElement`/`textContent` only — never `innerHTML` —
so docs text cannot inject markup. Keep it that way when editing `docs.js`.

## Authoring rules

- **Honesty**: unfinished features get `badge: 'planned'` or `'experimental'`
  and a callout saying so. Never document a feature as working unless it does.
- **Sources**: claims come from the code (`js/*.js`), `CONTRACT.md`, and
  `roadmap.md` — not from the README alone.
- **Style**: short sentences, beginner-first, define jargon on first use.

## CONFIG

Edit at the top of `js/docs.js`: `repoUrl`, `docsPath`, `appUrl`,
`landingUrl`, `roadmapUrl`, `issuesUrl`, `version`, `lastUpdated`, `siteTitle`.

## Checking your data

```
node --check js/docs-data/your-file.js   # syntax
node tools/check-data.js                 # structure: routes, block types, inline segments
```

## Known limitations

- Search is a simple substring index over titles + body text (no stemming or
  ranking beyond title-vs-body weight). Fine at this size.
- Heading anchors use `#/route:slug`; links are copyable via the `#` hover icon.
- Images: figure blocks currently show the gradient placeholder until real
  screenshots land in `docs/img/`.
- The service worker from the app does not cover `/docs` — docs is a
  separate, much smaller surface and works from `file://` regardless.

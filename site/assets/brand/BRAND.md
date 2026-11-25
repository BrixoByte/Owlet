# Owlet brand assets

The hatching-owlet mark: orange owlet emerging from an egg, flanked by `{ }`
braces — "code" + "beginners hatch into developers". All assets are PNG.

## Two forms

- **Tile icon** (`icon-*`) — owl inside a rounded tile. Use for favicons,
  app icons, `apple-touch-icon`, PWA manifest, README badge.
- **Transparent mark** (`mark-*`) — owl artwork only, no tile. Use for inline
  brand spots (navbars, footers) where the page background shows through.

## Files

| File | Size | Use |
| --- | --- | --- |
| `icon-dark.png` | 1882&times;1882 | Tile master, dark bg — primary brand mark |
| `icon-light.png` | 1882&times;1882 | Tile master, light bg |
| `icon-dark-32.png` | 32&times;32 | Favicon, dark browser themes |
| `icon-light-32.png` | 32&times;32 | Favicon, light browser themes |
| `icon-180.png` | 180&times;180 | `apple-touch-icon` |
| `icon-192.png` | 192&times;192 | PWA manifest |
| `icon-512.png` | 512&times;512 | PWA manifest / splash |
| `mark-on-dark.png` | ~1150&times;1200 | Transparent mark master — light art, for dark backgrounds |
| `mark-on-light.png` | ~1140&times;1130 | Transparent mark master — dark art, for light backgrounds |
| `mark-on-dark-80.png` | 76&times;80 | Topbar mark under `data-theme="dark"` |
| `mark-on-light-80.png` | 80&times;80 | Topbar mark under `data-theme="light"` |
| `palette.txt` | — | Brand palette |
| `preview.html` | — | Open in a browser to view all assets |

## Usage

Icons (tile):

```html
<link rel="icon" type="image/png" href="assets/brand/icon-dark-32.png"
      media="(prefers-color-scheme: dark)">
<link rel="icon" type="image/png" href="assets/brand/icon-light-32.png"
      media="(prefers-color-scheme: light)">
<link rel="apple-touch-icon" href="assets/brand/icon-180.png">
```

Inline brand marks (transparent, theme-swapped via `data-theme`):

```html
<img class="brand-mark brand-mark--dark"  src="assets/brand/mark-on-dark-80.png"  alt="">
<img class="brand-mark brand-mark--light" src="assets/brand/mark-on-light-80.png" alt="">
```

```css
.brand-mark--light { display: none; }
[data-theme="light"] .brand-mark--dark  { display: none; }
[data-theme="light"] .brand-mark--light { display: inline-block; }
```

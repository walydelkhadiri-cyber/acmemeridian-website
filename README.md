# acmemeridian.com

The public website for **Acme Meridian LLC** — a Wyoming software company.

Plain HTML, CSS and JavaScript. **No build step, no npm, no dependencies.** Edit a
file, commit, push — GitHub Pages serves it.

## Structure

```
index.html          the whole one-page site
styles.css          design system + every component
app.js              meridian canvas, reveals, 3D card, menu, copy-to-clipboard
privacy/ terms/ legal/   legal pages (clean URLs via folders)
assets/             icons, OG cover, fonts, the card as SVG
downloads/          the business card PDFs and the vCard
tools/              generators — only needed when regenerating assets
CNAME               acmemeridian.com
```

## Local preview

```bash
python3 -m http.server 4321 --directory .
```

Then open <http://localhost:4321>. A plain file:// open will not work — the pages use
absolute paths (`/styles.css`).

## Design system

Colours, type and spacing are CSS custom properties at the top of `styles.css`.
The text ladder (`--t1` … `--t5`) is derived from the business card's print opacities,
warmed up so every level clears WCAG AA against `#0b0b0b`.

Typefaces: **Optima** for the wordmark (with Cinzel as the web fallback — macOS and iOS
visitors get real Optima), **Cormorant Garamond** for display, **Inter** for everything
else. All self-hosted as variable `.woff2`; nothing is fetched from a CDN.

## Regenerating assets

Both scripts need macOS (they drive headless Chrome) and Pillow.

```bash
python3 tools/build_card.py    # card PDFs + vCard + the card SVGs used on the site
python3 tools/build_icons.py   # favicons, app icons, OG cover
```

`build_card.py` reads glyph positions straight out of the original card PDF, so the
layout stays identical to the printed card. Change `NEW_EMAIL` / `NEW_WEB` at the top of
the file to update the contact details everywhere at once.

## Deployment

Pushing to `main` publishes. GitHub Pages serves the repository root; `.nojekyll` stops
Jekyll from touching the files.

## Before launch

`legal/index.html` has two placeholders marked `[to be completed before launch]`:
the Wyoming Secretary of State filing ID, and the registered agent's name and address.

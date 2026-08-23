# acmemeridian.com

The public website for **Acme Meridian LLC** — a Wyoming software company.

Plain HTML, CSS and JavaScript. **No build step, no npm, no dependencies.** Edit a
file, commit, push — GitHub Pages serves it.

## Structure

```
index.html          the home page — one WebGL camera move, driven by scroll
meridian.css        the home page's design system and chapter layout
assets/world.js     the scene: procedural concrete, the rig, the post chain
assets/screens.js   the artwork painted onto the device screens
assets/screens/     drop-in replacements for that artwork (see its README)
styles.css          design system for the legal pages
app.js              reveals, menu, copy-to-clipboard — legal pages only
privacy/ terms/ legal/   legal pages (clean URLs via folders)
assets/             icons, OG cover, fonts, the card as SVG
downloads/          the business card PDFs and the vCard
tools/              generators — only needed when regenerating assets
CNAME               acmemeridian.com
```

`styles.css` and `meridian.css` are deliberately separate: the legal pages load
`styles.css`, so the home page could not take that filename without breaking them.

## The home page

One camera move down an architectural void. Scroll position drives a
`CatmullRomCurve3`; everything the site says is placed along that line — the mark,
a luminous ring, the three devices on plinths, the method as one rail marked five
times, contact. Chapters are HTML pinned over the frame, so the copy stays
selectable and indexable.

Nothing is tone-mapped by three.js. The scene renders linear into a float target
and a hand-written chain does bright-pass → a four-level blur pyramid → one
composite (chromatic aberration, bloom, ACES, split tone, vignette, grain). That
grade is why it reads as film rather than as WebGL.

**Without WebGL** the page is a plain stacked document that reads top to bottom.
`meridian.css` authors both; `world.js` adds `.gl` to `<html>` and takes it back
off if anything throws before the first frame lands. Never let the pinned layout
apply without a renderer behind it — the result is a black screen with nothing on it.

`?t=0.34` pins the move at one point on the line, for capturing stills.
`window.MERIDIAN` exposes the scene, camera, composite material and rig.

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

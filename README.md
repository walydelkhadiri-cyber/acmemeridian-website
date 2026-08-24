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
`window.MERIDIAN` exposes the scene, camera, composite material, rig and `WARP` —
setting `WARP.dur` high and `WARP.t` by hand freezes the departure at a chosen
point, which is the only way to look at a one-second flight properly.

## Start a project

`/start/` is a real page, not a modal: it survives a direct link, a refresh and a
blocked module. Three things have to hold together for it to feel like one move.

**The departure.** `a[data-warp]` on the home page hands the rig to `WARP` in
`world.js`. The camera leaves the scroll curve, accelerates down the line it is
already looking at, the lens widens and the grade is pushed until the frame blows
out; the navigation happens inside that white, where there is nothing left to see.
A `sessionStorage` flag tells the far side which entrance to play. Two safety nets:
the loop can stop (hidden tab, lost context), so a 1.5 s timeout navigates
regardless, and reduced-motion or a modified click skips the whole thing and
follows the link.

**The arrival.** `assets/start.js` opens on the same white and pulls out of it —
exposure ramps down, the camera comes back off the mark. Its chamber is a separate,
much smaller scene than the corridor, with a two-level blur instead of four: it is
one held frame, not a move. Below 520 px there is no chamber at all; a phone gets a
black page and no WebGL bill. The form is written first and imports three.js
dynamically, so nothing in the backdrop can take the brief down with it.

**The send.** `POST` to the `brief` Edge Function. Three paths, all landing
somewhere: JS sends JSON and answers in place; without JS the form's own `action`
POSTs natively and the function replies with a redirect back to `?sent=1`, which
shows the same screen; and if the request never lands, the brief is handed back as
a composed `mailto:` rather than lost.

## The backend

Supabase project `slkyivycuxbjigwqpyzd`, region eu-west-3. Everything is in
`supabase/` and deploys from here.

**`briefs`** holds every submission. RLS is on with **no policies at all**, so the
anon key in `assets/config.js` can read and write nothing in it — that key is public
by design and must stay harmless. The only way in or out is an Edge Function using
the service role key, which never leaves the server.

**`brief`** (public) is the intake. It re-runs every rule the browser enforces,
because client-side validation is a courtesy and not a control, and adds what only a
server can do: an origin allow-list, length caps, a honeypot that answers `200` so a
bot learns nothing, and a rate limit of three briefs per source per fifteen minutes.
The rate limit counts against a salted SHA-256 of the IP; the address itself is never
stored.

**`admin`** (signed in) reads and triages. It verifies the caller's JWT with
`auth.getUser`, then checks `app_metadata.role === 'admin'` — a verified token only
proves somebody is *a* user, and `app_metadata` is the one claim a user cannot write
for themselves. Public sign-up is off as well, but authorization should never depend
on a setting somewhere else still being right.

## /admin/

Sign in with an email and password. Auth is Supabase Auth over plain `fetch` rather
than the JS client: the whole surface used is three POSTs, and vendoring 40 KB to
make them would be the wrong trade on a site with no dependencies anywhere else. The
refresh token lives in `localStorage` so a daily check-in is not a daily login; the
access token is held in memory only and renewed a minute before it expires.

To create the account, or to change its password later:

```bash
./tools/create_admin.sh
```

It prompts with the terminal echo off, so the password never reaches your shell
history or the process list. Supabase stores only a bcrypt hash of it.

**Email notifications are not switched on.** The `brief` function already composes
and sends the message; it simply skips that step while `RESEND_API_KEY` is unset, and
logs that it did. To turn it on, set the secret and nothing else changes:

```bash
supabase secrets set RESEND_API_KEY=... --project-ref slkyivycuxbjigwqpyzd
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

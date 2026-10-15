# acmemeridian.com

The public website for **Acme Meridian LLC** — a Wyoming software company.

Plain HTML, CSS and JavaScript. **No build step, no npm.** The few libraries are
vendored in `assets/vendor/`. Edit a file, commit, push — GitHub Pages serves it.

## Structure

```
index.html          the home page — "Meridian Night": one scroll story, eight scenes
start/              the project brief — four questions, one per screen
assets/silk.js      the Three.js silk (shared by the home card and the brief card)
assets/vendor/      three.js, GSAP + ScrollTrigger, Lenis — vendored, no CDN
assets/fonts/       Mona Sans, self-hosted (night.css), plus the legal pages' fonts
admin/ + admin.js   the private brief inbox (Supabase auth)
styles.css          design system for the legal pages
app.js              reveals, menu, copy-to-clipboard — legal pages only
meridian.css        the admin page's styles (and the previous home page's)
privacy/ terms/ legal/   legal pages (clean URLs via folders)
downloads/          the business card PDFs and the vCard
tools/              generators — only needed when regenerating assets
CNAME               acmemeridian.com
```

The previous home page (the WebGL corridor, `world.js`, `screens.js`) is kept at
the git tag `v2-corridor`.

## The home page

The palette is the logo's: a `#151515` square and a white monogram, with the
cobalt of the silk as the only accent. No serif, no italic accent words — every
headline is one typeface, one colour.

**Scroll writes numbers, the frame reads them.** Lenis, ScrollTrigger and the
WebGL frame all run inside `gsap.ticker` (one clock, `lagSmoothing(0)`). Scenes
stay in place with CSS `position: sticky`; ScrollTrigger only scrubs values.

**One canvas, clipped.** A single fixed canvas sits behind the DOM. Each frame its
`clip-path: inset(… round r)` follows a DOM rectangle, so the silk fills the hero,
folds itself into a card (the AM monogram traces itself on it), and comes back
inside the final call-to-action card.

Scenes: hero → manifesto → six services on a horizontal track (≥ 992 px) while the
page turns light → "We build / We run" → five steps → four commitments fanned →
FAQ → final card. Below 992 px the track stacks vertically and each section carries
its own background. `prefers-reduced-motion` gets the whole page with no Lenis and
no scrubbing. Each service card links to `/start/?s=<service>`.

## Start a project

Hick's law: one question per screen, never more than six answers, and a tap is the
answer. What (Build: website / app / SaaS / custom software — Run: website or
social media management, or "not sure"), a few sentences about it, a budget range
(skipped for the two Run services, which are monthly), then name and email. The
brief fills a silk card beside the question as it goes; on a phone that card only
appears once sent, as the recap. Keys 1–6 answer, ⌘/Ctrl+Enter leaves the text
field, the browser's back button goes back one question. `?s=app` etc. answers the
first question for the visitor.

**The send.** `POST` to the `brief` Edge Function with the same field names as
before (`title` is the service). Three paths, all landing somewhere: JS sends JSON
and answers in place; without JS every question shows on one page and the form's
own `action` POSTs natively, the function redirecting back to `?sent=1`; and if
the request never lands, the brief is handed back as a composed `mailto:`.

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

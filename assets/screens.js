/* =============================================================================
   Screen artwork.

   Painted on a 2D canvas so it goes through the same post-processing grade as
   the concrete around it — a CSS3D overlay could not.

   These are drawn at roughly seven times the size they are seen at, which
   decides everything about how they are built. Detail finer than about 20
   canvas pixels dissolves into noise, so precision here does not mean smaller
   type: it means *more structure and more real content*. Toolbars, breadcrumbs,
   status bars, counts, IDs, units, timestamps. A screen with four rows on it
   reads as a wireframe at any resolution; a screen with fourteen reads as
   software that someone actually uses.

   Nothing is placeholder. Every label, number and file name is written out,
   because grey bars are what a mockup looks like and the whole point of this
   chapter is that we ship the finished thing.

   Drop-in override: list a URL under a key in assets/screens/manifest.json and
   it is used instead of the painted version.
   ========================================================================== */

const SANS = '"Inter V", -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
const SERIF = '"Cormorant V", "Cormorant Garamond", Georgia, serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const w = (a) => `rgba(255,255,255,${a})`;

/* ------------------------------------------------------------- primitives */

function rr(c, x, y, wd, ht, r) {
  r = Math.min(r, wd / 2, ht / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + wd, y, x + wd, y + ht, r);
  c.arcTo(x + wd, y + ht, x, y + ht, r);
  c.arcTo(x, y + ht, x, y, r);
  c.arcTo(x, y, x + wd, y, r);
  c.closePath();
}
const fill = (c, x, y, wd, ht, r, col) => { rr(c, x, y, wd, ht, r); c.fillStyle = col; c.fill(); };
const stroke = (c, x, y, wd, ht, r, col, lw) => {
  rr(c, x, y, wd, ht, r); c.strokeStyle = col; c.lineWidth = lw || 1.5; c.stroke();
};
const line = (c, x, y, wd, a) => fill(c, x, y, wd, 1, 0, w(a));

function font(o) {
  const fam = o.mono ? MONO : o.serif ? SERIF : SANS;
  return `${o.weight || 300} ${o.size || 24}px ${fam}`;
}

function t(c, s, x, y, o) {
  o = o || {};
  c.font = font(o);
  c.letterSpacing = (o.ls || 0) + 'px';
  c.textAlign = o.align || 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = o.col || w(0.92);
  c.fillText(o.caps ? s.toUpperCase() : s, x, y);
  c.letterSpacing = '0px';
  c.textAlign = 'left';
}
function measure(c, s, o) {
  o = o || {};
  c.font = font(o);
  c.letterSpacing = (o.ls || 0) + 'px';
  const wd = c.measureText(o.caps ? s.toUpperCase() : s).width;
  c.letterSpacing = '0px';
  return wd;
}

/* a pill — the single most useful unit of density: it carries a word and a
   state at once, and reads as an interface element even when unreadable */
function chip(c, x, y, s, o) {
  o = o || {};
  const size = o.size || 21, pad = o.pad || size * 0.85;
  const wd = measure(c, s, { size }) + pad * 2, ht = o.h || size * 2.1;
  if (o.solid) fill(c, x, y, wd, ht, ht / 2, w(o.solid));
  else stroke(c, x, y, wd, ht, ht / 2, w(o.bd || 0.16), o.lw || 1.6);
  t(c, s, x + pad, y + ht * 0.68, { size, col: o.col || w(0.62) });
  return wd;
}

function initials(c, x, y, r, s, a) {
  c.beginPath(); c.arc(x + r, y + r, r, 0, 7);
  c.fillStyle = w(a === undefined ? 0.12 : a); c.fill();
  t(c, s, x + r, y + r + r * 0.34, { size: r * 0.86, col: w(0.7), align: 'center' });
}

function spark(c, x, y, wd, ht, vals, a) {
  const lo = Math.min(...vals), hi = Math.max(...vals), sp = hi - lo || 1;
  c.beginPath();
  vals.forEach((v, i) => {
    const px = x + (wd / (vals.length - 1)) * i, py = y + ht - ((v - lo) / sp) * ht;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  });
  c.strokeStyle = w(a || 0.5); c.lineWidth = Math.max(1.5, ht * 0.045);
  c.lineJoin = 'round'; c.stroke();
}

/* A product photograph: a lit ground and the object on it.
   A circle, a square and a triangle is a *croquis* — you cannot tell a lamp
   from a notebook, which defeats the purpose of a catalogue. So each of the
   eight objects in the grid is drawn as itself. Silhouettes rather than
   outlines, because at this reduction a 1px contour disappears and a filled
   shape survives. */
const OBJ = {
  /* a shaded desk lamp: weighted base, stem, dome */
  lamp(c, cx, base, S, F, E) {
    F(); rr(c, cx - 0.30 * S, base - 0.06 * S, 0.60 * S, 0.06 * S, 0.03 * S); c.fill();
    F(); rr(c, cx - 0.025 * S, base - 0.60 * S, 0.05 * S, 0.56 * S, 0); c.fill();
    F(); c.beginPath();
    c.ellipse(cx, base - 0.58 * S, 0.34 * S, 0.30 * S, 0, Math.PI, 0);
    c.closePath(); c.fill();
    E(); c.beginPath();
    c.moveTo(cx - 0.34 * S, base - 0.58 * S); c.lineTo(cx + 0.34 * S, base - 0.58 * S);
    c.stroke();
  },
  /* an open stacking tray, seen from a little above */
  tray(c, cx, base, S, F, E) {
    F(); c.beginPath();
    c.moveTo(cx - 0.40 * S, base - 0.24 * S); c.lineTo(cx - 0.28 * S, base - 0.40 * S);
    c.lineTo(cx + 0.52 * S, base - 0.40 * S); c.lineTo(cx + 0.40 * S, base - 0.24 * S);
    c.closePath(); c.fill();
    F(); rr(c, cx - 0.40 * S, base - 0.24 * S, 0.80 * S, 0.22 * S, 0.02 * S); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath();
    c.moveTo(cx - 0.32 * S, base - 0.26 * S); c.lineTo(cx - 0.23 * S, base - 0.37 * S);
    c.lineTo(cx + 0.45 * S, base - 0.37 * S); c.lineTo(cx + 0.34 * S, base - 0.26 * S);
    c.closePath(); c.fill();
  },
  /* a bound notebook, cover up, elastic closure */
  book(c, cx, base, S, F, E) {
    F(); rr(c, cx - 0.26 * S, base - 0.70 * S, 0.52 * S, 0.70 * S, 0.02 * S); c.fill();
    F(); rr(c, cx - 0.26 * S, base - 0.70 * S, 0.055 * S, 0.70 * S, 0.02 * S); c.fill();
    E(); c.beginPath();
    c.moveTo(cx + 0.14 * S, base - 0.70 * S); c.lineTo(cx + 0.14 * S, base);
    c.moveTo(cx + 0.26 * S, base - 0.66 * S); c.lineTo(cx + 0.26 * S, base - 0.04 * S);
    c.stroke();
  },
  /* a turned steel counterweight */
  weight(c, cx, base, S, F, E) {
    F(); rr(c, cx - 0.21 * S, base - 0.48 * S, 0.42 * S, 0.48 * S, 0); c.fill();
    F(); c.beginPath(); c.ellipse(cx, base, 0.21 * S, 0.06 * S, 0, 0, 7); c.fill();
    c.fillStyle = w(0.16); c.beginPath();
    c.ellipse(cx, base - 0.48 * S, 0.21 * S, 0.06 * S, 0, 0, 7); c.fill();
  },
  /* a 30cm rule, propped, with its graduations */
  rule(c, cx, base, S, F, E) {
    c.save();
    c.translate(cx, base - 0.28 * S); c.rotate(-0.42);
    F(); rr(c, -0.48 * S, -0.05 * S, 0.96 * S, 0.10 * S, 0.01 * S); c.fill();
    E();
    for (let i = 0; i <= 12; i++) {
      const x = -0.44 * S + i * 0.0733 * S;
      c.beginPath();
      c.moveTo(x, -0.05 * S); c.lineTo(x, -0.05 * S + (i % 2 ? 0.035 : 0.06) * S);
      c.stroke();
    }
    c.restore();
  },
  /* three ink bottles, capped */
  ink(c, cx, base, S, F, E) {
    [-1, 0, 1].forEach((k, i) => {
      const x = cx + k * 0.28 * S, h = (0.26 + i * 0.03) * S;
      F(); rr(c, x - 0.105 * S, base - h, 0.21 * S, h, 0.03 * S); c.fill();
      F(); rr(c, x - 0.045 * S, base - h - 0.09 * S, 0.09 * S, 0.09 * S, 0); c.fill();
      F(); rr(c, x - 0.07 * S, base - h - 0.16 * S, 0.14 * S, 0.07 * S, 0.02 * S); c.fill();
    });
  },
  /* an open oak box in three-quarter view */
  box(c, cx, base, S, F, E) {
    F(); c.beginPath();
    c.moveTo(cx - 0.32 * S, base - 0.42 * S); c.lineTo(cx - 0.18 * S, base - 0.56 * S);
    c.lineTo(cx + 0.46 * S, base - 0.56 * S); c.lineTo(cx + 0.32 * S, base - 0.42 * S);
    c.closePath(); c.fill();
    F(); c.beginPath();
    c.moveTo(cx + 0.32 * S, base - 0.42 * S); c.lineTo(cx + 0.46 * S, base - 0.56 * S);
    c.lineTo(cx + 0.46 * S, base - 0.14 * S); c.lineTo(cx + 0.32 * S, base);
    c.closePath(); c.fill();
    F(); rr(c, cx - 0.32 * S, base - 0.42 * S, 0.64 * S, 0.42 * S, 0.01 * S); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath();
    c.moveTo(cx - 0.25 * S, base - 0.44 * S); c.lineTo(cx - 0.13 * S, base - 0.54 * S);
    c.lineTo(cx + 0.40 * S, base - 0.54 * S); c.lineTo(cx + 0.28 * S, base - 0.44 * S);
    c.closePath(); c.fill();
  },
  /* a low, wide task light */
  task(c, cx, base, S, F, E) {
    F(); rr(c, cx - 0.22 * S, base - 0.05 * S, 0.44 * S, 0.05 * S, 0.02 * S); c.fill();
    F(); rr(c, cx - 0.02 * S, base - 0.26 * S, 0.04 * S, 0.22 * S, 0); c.fill();
    F(); c.beginPath();
    c.ellipse(cx, base - 0.24 * S, 0.32 * S, 0.20 * S, 0, Math.PI, 0);
    c.closePath(); c.fill();
    E(); c.beginPath();
    c.moveTo(cx - 0.32 * S, base - 0.24 * S); c.lineTo(cx + 0.32 * S, base - 0.24 * S);
    c.stroke();
  },
};

function shot(c, x, y, wd, ht, kind) {
  fill(c, x, y, wd, ht, wd * 0.03, '#101014');
  const g = c.createRadialGradient(
    x + wd * 0.5, y + ht * 0.30, 0, x + wd * 0.5, y + ht * 0.30, wd * 0.82);
  g.addColorStop(0, 'rgba(255,255,255,0.135)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.035)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  rr(c, x, y, wd, ht, wd * 0.03); c.fillStyle = g; c.fill();
  c.save();
  rr(c, x, y, wd, ht, wd * 0.03); c.clip();
  const cx = x + wd / 2, base = y + ht * 0.80, S = ht;
  c.fillStyle = w(0.05);
  c.beginPath(); c.ellipse(cx, base + ht * 0.015, wd * 0.26, ht * 0.028, 0, 0, 7); c.fill();
  const F = () => { c.fillStyle = w(0.115); };
  const E = () => { c.strokeStyle = w(0.2); c.lineWidth = Math.max(1, ht * 0.006); };
  OBJ[kind](c, cx, base, S, F, E);
  c.restore();
}

function canvas2d(W, H, bg) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = bg || '#08080a'; c.fillRect(0, 0, W, H);
  return { cv, c };
}

function ico_line(c, x1, y1, x2, y2, a, u) {
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
  c.strokeStyle = w(a); c.lineWidth = 1.5 * (u || 1); c.stroke();
}

function trafficLights(c, x, y, r) {
  ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
    c.beginPath(); c.arc(x + i * r * 3.8, y, r, 0, 7);
    c.fillStyle = col; c.fill();
  });
}

/* =================================================================== 2048 × 1280
   01 · WEB PLATFORMS — a storefront, mid-session.
   The old version of this screen was our own home page: a headline and two
   buttons, which is 80% empty space and reads as a wireframe at any size. A
   catalogue proves the claim on the tab instead — commerce that loads, ranks
   and converts — and it fills the frame with real merchandise, real prices and
   real stock, the way the thing looks in use.
   ============================================================================ */
function web(W, H) {
  const { cv, c } = canvas2d(W, H, '#08080a');
  const u = W / 2048;

  /* --- browser chrome ------------------------------------------------------
     A real toolbar, not three dots and a grey pill: sidebar toggle, history
     arrows, a URL field carrying its reader, translate and reload controls,
     then share, new tab and the tab overview — and a tab strip with favicons
     underneath. This is the part of the frame a viewer knows by heart, so any
     piece that is missing is the piece they notice. */
  const TB = 88 * u, TS = 154 * u;
  fill(c, 0, 0, W, TS, 0, '#141417');
  fill(c, 0, TB, W, TS - TB, 0, '#131316');
  trafficLights(c, 46 * u, 44 * u, 9 * u);

  const ico = (a, lw) => { c.strokeStyle = w(a); c.lineWidth = (lw || 2.2) * u; c.lineCap = 'round'; c.lineJoin = 'round'; };
  const chev = (x, y, s, dir, a) => {
    ico(a); c.beginPath();
    c.moveTo(x + dir * s * 0.5, y - s); c.lineTo(x - dir * s * 0.5, y); c.lineTo(x + dir * s * 0.5, y + s);
    c.stroke();
  };
  /* sidebar toggle + its chevron */
  ico(0.6); stroke(c, 176 * u, 30 * u, 40 * u, 30 * u, 5 * u, w(0.6), 2.2 * u);
  c.beginPath(); c.moveTo(190 * u, 30 * u); c.lineTo(190 * u, 60 * u); c.stroke();
  chev(238 * u, 49 * u, 6 * u, -1, 0.45);
  /* history */
  chev(300 * u, 45 * u, 9 * u, 1, 0.62);
  ico(0.14, 1.6); c.beginPath(); c.moveTo(332 * u, 28 * u); c.lineTo(332 * u, 62 * u); c.stroke();
  chev(364 * u, 45 * u, 9 * u, -1, 0.24);

  /* the URL field */
  const UW = 720 * u, UX = (W - UW) / 2;
  fill(c, UX, 22 * u, UW, 46 * u, 10 * u, '#232327');
  ico(0.42, 2);                                    /* reader / page settings */
  [0, 6, 12].forEach((d, i) => {
    c.beginPath();
    c.moveTo(UX + 26 * u, (39 + d) * u); c.lineTo(UX + (i === 1 ? 48 : 42) * u, (39 + d) * u);
    c.stroke();
  });
  t(c, 'fieldnote.store', W / 2, 52 * u, { size: 21 * u, col: w(0.85), align: 'center' });
  t(c, 'Aa', UX + UW - 92 * u, 52 * u, { size: 20 * u, weight: 500, col: w(0.42) });
  ico(0.55, 2.2);                                  /* reload */
  c.beginPath(); c.arc(UX + UW - 42 * u, 45 * u, 11 * u, 0.5, 5.7); c.stroke();
  c.beginPath();
  c.moveTo(UX + UW - 42 * u + 11 * u, 34 * u); c.lineTo(UX + UW - 42 * u + 11 * u, 43 * u);
  c.lineTo(UX + UW - 42 * u + 2 * u, 43 * u); c.stroke();

  /* share · new tab · tab overview */
  ico(0.55, 2.2);
  c.beginPath();                                   /* share */
  c.moveTo(1772 * u, 40 * u); c.lineTo(1772 * u, 60 * u);
  c.moveTo(1772 * u, 28 * u); c.lineTo(1772 * u, 40 * u);
  c.moveTo(1764 * u, 36 * u); c.lineTo(1772 * u, 28 * u); c.lineTo(1780 * u, 36 * u);
  c.stroke();
  c.beginPath();
  c.moveTo(1758 * u, 42 * u); c.lineTo(1758 * u, 62 * u); c.lineTo(1786 * u, 62 * u);
  c.lineTo(1786 * u, 42 * u); c.stroke();
  c.beginPath();                                   /* new tab */
  c.moveTo(1856 * u, 33 * u); c.lineTo(1856 * u, 57 * u);
  c.moveTo(1844 * u, 45 * u); c.lineTo(1868 * u, 45 * u); c.stroke();
  stroke(c, 1922 * u, 32 * u, 26 * u, 26 * u, 5 * u, w(0.55), 2.2 * u);   /* tab overview */
  stroke(c, 1932 * u, 38 * u, 26 * u, 26 * u, 5 * u, w(0.28), 2.2 * u);

  /* the tab strip: three tabs is a working session, one is a screenshot */
  const tabs = [
    ['Fieldnote — Objects for the desk', 'F', 1],
    ['Analytics · Last 30 days', 'A', 0],
    ['Stripe Dashboard', 'S', 0],
  ];
  const tw = 470 * u;
  tabs.forEach(([label, mark, on], i) => {
    const x = 40 * u + i * (tw + 6 * u);
    if (on) fill(c, x, TB + 6 * u, tw, TS - TB - 12 * u, 8 * u, '#2a2a2f');
    else if (i) { ico(0.1, 1.6); c.beginPath(); c.moveTo(x, TB + 20 * u); c.lineTo(x, TS - 20 * u); c.stroke(); }
    fill(c, x + 18 * u, TB + 20 * u, 22 * u, 22 * u, 5 * u, w(on ? 0.8 : 0.28));
    t(c, mark, x + 29 * u, TB + 36 * u,
      { size: 15 * u, weight: 600, col: '#141417', align: 'center' });
    t(c, label, x + 52 * u, TB + 38 * u, { size: 19 * u, col: w(on ? 0.86 : 0.36) });
    if (on) { chev(x + tw - 22 * u, TB + 31 * u, 6 * u, 1, 0.5); chev(x + tw - 30 * u, TB + 31 * u, 6 * u, -1, 0.5); }
  });
  c.lineCap = 'butt'; c.lineJoin = 'miter';

  /* --- site header --------------------------------------------------------- */
  t(c, 'FIELDNOTE', 90 * u, 220 * u, { size: 30 * u, ls: 7 * u, col: w(0.95), serif: true });
  ['New in', 'Desk', 'Paper', 'Light', 'Archive'].forEach((s, i) => {
    t(c, s, (470 + i * 148) * u, 220 * u, { size: 23 * u, col: w(i === 1 ? 0.9 : 0.5) });
  });
  stroke(c, 1300 * u, 192 * u, 420 * u, 44 * u, 22 * u, w(0.13), 1.6 * u);
  t(c, 'Search 148 objects', 1332 * u, 221 * u, { size: 21 * u, col: w(0.3) });
  t(c, 'Account', 1770 * u, 220 * u, { size: 22 * u, col: w(0.55) });
  t(c, 'Bag (3)', 1900 * u, 220 * u, { size: 22 * u, col: w(0.9) });
  line(c, 90 * u, 256 * u, W - 180 * u, 0.1);

  /* --- breadcrumb + result count + sort ------------------------------------ */
  t(c, 'Home  ›  Desk  ›  All objects', 90 * u, 310 * u, { size: 20 * u, col: w(0.36) });
  t(c, '148 objects', 90 * u, 362 * u, { size: 34 * u, col: w(0.94), serif: true });
  let sx = 1490 * u;
  ['Newest', 'Price', 'In stock'].forEach((s, i) => {
    sx += chip(c, sx, 334 * u, s, { size: 20 * u, solid: i === 0 ? 0.9 : 0,
      col: i === 0 ? '#0b0b0d' : w(0.55) }) + 14 * u;
  });

  /* --- filter rail: counts are what make a filter look real ---------------- */
  /* each group sums to 148, because a filter rail whose numbers do not add up
     is the one detail that gives a fake screenshot away */
  const filters = [
    ['CATEGORY', [['Lighting', 31, 0], ['Storage', 24, 0], ['Writing', 58, 0], ['Textiles', 35, 0]]],
    ['MATERIAL', [['Brass', 42, 0], ['Oak', 39, 0], ['Linen', 28, 0], ['Steel', 39, 0]]],
    ['PRICE', [['Under £50', 38, 0], ['£50 – £150', 64, 0], ['Over £150', 46, 0]]],
  ];
  let fy = 412 * u;
  filters.forEach(([title, rows]) => {
    t(c, title, 90 * u, fy, { size: 18 * u, ls: 3.4 * u, col: w(0.34) });
    line(c, 90 * u, fy + 18 * u, 300 * u, 0.08);
    rows.forEach(([label, n, on], i) => {
      const y = fy + (58 + i * 46) * u;
      stroke(c, 90 * u, y - 20 * u, 22 * u, 22 * u, 4 * u, w(on ? 0.85 : 0.18), 2 * u);
      if (on) { fill(c, 95 * u, y - 15 * u, 12 * u, 12 * u, 2 * u, w(0.85)); }
      t(c, label, 128 * u, y, { size: 21 * u, col: w(on ? 0.88 : 0.5) });
      t(c, String(n), 390 * u, y, { size: 19 * u, col: w(0.28), align: 'right' });
    });
    fy += (76 + rows.length * 46) * u;
  });

  /* --- the grid ------------------------------------------------------------ */
  const items = [
    ['Ledger lamp', '£185', 'Brass · 3 left', 'lamp'],
    ['Cassette tray', '£64', 'Oak · in stock', 'tray'],
    ['Field notebook', '£18', 'Linen · in stock', 'book'],
    ['Counterweight', '£240', 'Steel · 1 left', 'weight'],
    ['Desk rule, 30 cm', '£32', 'Brass · in stock', 'rule'],
    ['Pigment ink, 50 ml', '£14', 'Six colours', 'ink'],
    ['Stacking box', '£96', 'Oak · in stock', 'box'],
    ['Task light, low', '£210', 'Brass · 5 left', 'task'],
  ];
  const gx = 470 * u, gw = (W - 470 * u - 90 * u), cols = 4;
  const cw = (gw - 34 * u * (cols - 1)) / cols, chh = 268 * u;
  items.forEach(([name, price, meta, kind], i) => {
    const x = gx + (i % cols) * (cw + 34 * u);
    const y = 408 * u + Math.floor(i / cols) * (chh + 104 * u);
    shot(c, x, y, cw, chh, kind);
    t(c, name, x, y + chh + 40 * u, { size: 24 * u, col: w(0.9) });
    t(c, price, x + cw, y + chh + 40 * u, { size: 24 * u, col: w(0.9), align: 'right' });
    t(c, meta, x, y + chh + 72 * u, { size: 20 * u, col: w(0.38) });
  });

  /* --- the proof line ------------------------------------------------------ */
  line(c, 90 * u, H - 134 * u, W - 180 * u, 0.09);
  let px = 90 * u;
  [['LCP', '0.9 s'], ['CLS', '0.00'], ['Lighthouse', '100'], ['Checkout', '2 steps']]
    .forEach(([k, v]) => {
      t(c, k, px, H - 62 * u, { size: 19 * u, ls: 3 * u, col: w(0.32), caps: true });
      px += measure(c, k.toUpperCase(), { size: 19 * u, ls: 3 * u }) + 22 * u;
      t(c, v, px, H - 62 * u, { size: 21 * u, col: w(0.78) });
      px += measure(c, v, { size: 21 * u }) + 76 * u;
    });
  t(c, '1 – 8 of 148', W - 90 * u, H - 62 * u, { size: 20 * u, col: w(0.34), align: 'right' });
  return cv;
}

/* =================================================================== 2048 × 1280
   02 · CUSTOM SOFTWARE — an editor, mid-edit.
   Syntax highlighting done in greys rather than colours: the site is
   monochrome and the post grade would eat hues anyway, but the *structure*
   of highlighting — keywords heavy, comments faint, calls bright — is what
   makes a wall of text read as code instead of as lorem ipsum.
   ============================================================================ */

const TOK = /(\/\/.*|\/\*[\s\S]*?\*\/)|('[^']*')|\b(import|from|export|async|function|await|const|let|for|of|in|if|return|continue|new|type|typeof)\b|(\d+)|\b([A-Z][A-Za-z0-9_]*)\b|([A-Za-z_$][A-Za-z0-9_$]*)(?=\()/g;
const TOK_COL = { c: 0.24, s: 0.6, k: 0.86, n: 0.64, y: 0.74, f: 0.88, p: 0.52 };

function tokenize(src) {
  const out = [];
  let last = 0, m;
  TOK.lastIndex = 0;
  while ((m = TOK.exec(src)) !== null) {
    if (m.index > last) out.push([src.slice(last, m.index), 'p']);
    out.push([m[0], m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 'n' : m[5] ? 'y' : 'f']);
    last = m.index + m[0].length;
    if (m[0] === '') TOK.lastIndex++;
  }
  if (last < src.length) out.push([src.slice(last), 'p']);
  return out;
}

function code(W, H) {
  const { cv, c } = canvas2d(W, H, '#08080a');
  const u = W / 2048;
  const SB = 380 * u, ED = 1660 * u, BAR = 70 * u, ST = H - 62 * u;

  /* --- window chrome -------------------------------------------------------
     This one is a native editor, not a browser, so it gets a window title bar
     rather than a toolbar. But three dots on their own is a half-drawn window:
     a real one carries the command centre in the middle and the layout
     toggles on the right, so it gets those too. */
  fill(c, 0, 0, W, BAR, 0, '#141417');
  trafficLights(c, 46 * u, 35 * u, 9 * u);

  const cw2 = 620 * u, cx2 = (W - cw2) / 2;
  fill(c, cx2, 16 * u, cw2, 38 * u, 8 * u, '#1d1d21');
  c.strokeStyle = w(0.4); c.lineWidth = 2 * u; c.lineCap = 'round';
  c.beginPath(); c.arc(cx2 + 28 * u, 33 * u, 7 * u, 0, 7); c.stroke();
  c.beginPath();
  c.moveTo(cx2 + 33 * u, 38 * u); c.lineTo(cx2 + 39 * u, 44 * u); c.stroke();
  t(c, 'reconcile.ts — ledger-service', W / 2 + 14 * u, 41 * u,
    { size: 20 * u, col: w(0.5), align: 'center' });

  /* the three layout toggles: primary sidebar, panel, secondary sidebar */
  [[1858, 'l'], [1912, 'b'], [1966, 'r']].forEach(([x, side]) => {
    stroke(c, x * u, 21 * u, 38 * u, 28 * u, 4 * u, w(0.34), 2 * u);
    c.fillStyle = w(0.34);
    if (side === 'l') c.fillRect(x * u + 2 * u, 23 * u, 10 * u, 24 * u);
    else if (side === 'r') c.fillRect(x * u + 26 * u, 23 * u, 10 * u, 24 * u);
    else c.fillRect(x * u + 2 * u, 39 * u, 34 * u, 8 * u);
  });
  c.lineCap = 'butt';

  /* --- file tree ----------------------------------------------------------- */
  fill(c, 0, BAR, SB, ST - BAR, 0, '#0b0b0d');
  t(c, 'EXPLORER', 34 * u, 116 * u, { size: 17 * u, ls: 3.4 * u, col: w(0.3) });
  const tree = [
    [0, 'ledger-service', 1, 0], [1, 'src', 1, 0], [2, 'db', 1, 0],
    [3, 'ledger.ts', 0, 0], [3, 'migrations', 1, 0], [2, 'reconcile', 1, 0],
    [3, 'index.ts', 0, 0], [3, 'reconcile.ts', 0, 1], [3, 'reconcile.test.ts', 0, 0],
    [3, 'types.ts', 0, 0], [2, 'http', 1, 0], [3, 'routes.ts', 0, 0],
    [3, 'auth.ts', 0, 0], [1, 'test', 1, 0], [2, 'fixtures.ts', 0, 0],
    [1, 'package.json', 0, 0], [1, 'tsconfig.json', 0, 0], [1, 'Dockerfile', 0, 0],
    [1, 'README.md', 0, 0],
  ];
  tree.forEach(([depth, name, dir, on], i) => {
    const y = (160 + i * 38) * u, x = (34 + depth * 26) * u;
    if (on) fill(c, 0, y - 26 * u, SB, 36 * u, 0, w(0.06));
    if (dir) {
      c.beginPath();
      c.moveTo(x + 4 * u, y - 16 * u); c.lineTo(x + 13 * u, y - 9 * u);
      c.lineTo(x + 4 * u, y - 2 * u); c.closePath();
      c.fillStyle = w(0.34); c.fill();
    } else {
      stroke(c, x + 3 * u, y - 20 * u, 13 * u, 17 * u, 2 * u, w(0.26), 1.4 * u);
    }
    t(c, name, x + 26 * u, y, { size: 20 * u, col: w(on ? 0.92 : dir ? 0.62 : 0.46) });
  });

  /* --- open tabs ----------------------------------------------------------- */
  let tx = SB;
  [['reconcile.ts', 1, 0], ['types.ts', 0, 0], ['ledger.ts', 0, 0],
   ['reconcile.test.ts', 0, 1]].forEach(([name, on, dirty]) => {
    const wd = measure(c, name, { size: 20 * u }) + 74 * u;
    if (on) {
      fill(c, tx, BAR, wd, 58 * u, 0, '#08080a');
      fill(c, tx, BAR, wd, 2.5 * u, 0, w(0.8));
    } else {
      fill(c, tx, BAR, wd, 58 * u, 0, '#0d0d10');
    }
    t(c, name, tx + 26 * u, BAR + 37 * u, { size: 20 * u, col: w(on ? 0.9 : 0.4) });
    if (dirty) {
      c.beginPath(); c.arc(tx + wd - 26 * u, BAR + 30 * u, 5 * u, 0, 7);
      c.fillStyle = w(0.5); c.fill();
    }
    tx += wd;
  });
  fill(c, tx, BAR, W - tx, 58 * u, 0, '#0d0d10');

  /* --- the source ---------------------------------------------------------- */
  const SRC = [
    ["import { differenceInDays } from 'date-fns';", 0],
    ["import { ledger } from '../db/ledger';", 0],
    ["import type { Period, Entry, Break } from './types';", 0],
    ['', 0],
    ['const TOLERANCE = 2; // minor units — a rounded VAT line is not a break', 1],
    ['', 0],
    ['/** Match bank lines against ledger entries for one period. */', 0],
    ['export async function reconcile(period: Period) {', 0],
    ['  const [bank, book] = await Promise.all([', 0],
    ['    ledger.bankLines(period),', 0],
    ['    ledger.entries(period),', 0],
    ['  ]);', 0],
    ['', 0],
    ['  const index = new Map<string, Entry>();', 0],
    ['  for (const e of book) index.set(e.reference, e);', 0],
    ['', 0],
    ['  const breaks: Break[] = [];', 0],
    ['  for (const line of bank) {', 0],
    ['    const match = index.get(line.reference);', 0],
    ["    if (!match) { breaks.push({ kind: 'unmatched', line }); continue; }", 2],
    ['    const delta = Math.abs(match.amount - line.amount);', 0],
    ["    if (delta > TOLERANCE) breaks.push({ kind: 'amount', line, delta });", 2],
    ['    index.delete(line.reference);', 0],
    ['  }', 0],
    ['  return { period, breaks, orphans: [...index.values()] };', 0],
    ['}', 0],
  ];
  const CY = 190 * u, LH = 29.5 * u, CX = 516 * u;
  fill(c, SB, BAR + 58 * u, ED - SB, ST - BAR - 58 * u, 0, '#08080a');
  fill(c, SB, CY + 20 * LH - 21 * u, ED - SB, LH, 0, w(0.035)); /* caret line */
  SRC.forEach((row, i) => {
    const y = CY + i * LH;
    if (row[1]) fill(c, 484 * u, y - 20 * u, 4 * u, 22 * u, 0, w(row[1] === 1 ? 0.42 : 0.24));
    t(c, String(i + 1), 462 * u, y, { size: 19 * u, col: w(i === 20 ? 0.5 : 0.2), mono: true, align: 'right' });
    let x = CX;
    tokenize(row[0]).forEach(([s, k]) => {
      t(c, s, x, y, { size: 22 * u, col: w(TOK_COL[k]), mono: true });
      x += measure(c, s, { size: 22 * u, mono: true });
    });
  });
  /* caret */
  fill(c, CX + measure(c, '    const delta = Math.abs', { size: 22 * u, mono: true }),
    CY + 20 * LH - 19 * u, 2 * u, 24 * u, 0, w(0.75));

  /* --- minimap ------------------------------------------------------------- */
  SRC.forEach((row, i) => {
    const len = row[0].replace(/^\s+/, '').length;
    if (!len) return;
    const ind = (row[0].length - row[0].replace(/^\s+/, '').length) * 1.6 * u;
    fill(c, 1580 * u + ind, (196 + i * 11) * u, Math.min(56 * u, len * 1.05 * u), 5 * u, 0, w(0.14));
  });

  /* --- outline ------------------------------------------------------------- */
  fill(c, ED, BAR, W - ED, ST - BAR, 0, '#0b0b0d');
  t(c, 'OUTLINE', ED + 34 * u, 116 * u, { size: 17 * u, ls: 3.4 * u, col: w(0.3) });
  [['TOLERANCE', 'const'], ['reconcile', 'function'], ['bank', 'const'],
   ['book', 'const'], ['index', 'const'], ['breaks', 'const'],
   ['line', 'for'], ['match', 'const'], ['delta', 'const']]
    .forEach(([name, kind], i) => {
      const y = (162 + i * 40) * u;
      t(c, name, ED + 34 * u, y, { size: 20 * u, col: w(0.62), mono: true });
      t(c, kind, W - 34 * u, y, { size: 17 * u, col: w(0.24), align: 'right' });
    });
  line(c, ED + 34 * u, 542 * u, W - ED - 68 * u, 0.08);
  t(c, 'TIMELINE', ED + 34 * u, 586 * u, { size: 17 * u, ls: 3.4 * u, col: w(0.3) });
  [['a3f19c2', 'Tolerate rounded VAT lines', '12 min ago'],
   ['77d0e14', 'Return orphans on the report', '2 hours ago'],
   ['1b8caa9', 'Index entries by reference', 'yesterday'],
   ['c40f256', 'Add reconcile.test.ts', 'yesterday'],
   ['e91b307', 'Split ledger queries', '2 days ago']].forEach(([sha, msg, when], i) => {
    const y = (630 + i * 62) * u;
    c.beginPath(); c.arc(ED + 40 * u, y - 20 * u, 4 * u, 0, 7);
    c.fillStyle = w(0.4); c.fill();
    if (i < 4) { ico_line(c, ED + 40 * u, y - 14 * u, ED + 40 * u, y + 36 * u, 0.1, u); }
    t(c, msg, ED + 58 * u, y - 14 * u, { size: 18 * u, col: w(0.6) });
    t(c, sha, ED + 58 * u, y + 14 * u, { size: 16 * u, col: w(0.3), mono: true });
    t(c, when, W - 34 * u, y + 14 * u, { size: 16 * u, col: w(0.24), align: 'right' });
  });
  line(c, ED + 34 * u, 962 * u, W - ED - 68 * u, 0.08);
  t(c, 'PROBLEMS', ED + 34 * u, 1006 * u, { size: 17 * u, ls: 3.4 * u, col: w(0.3) });
  t(c, 'No problems in this workspace.', ED + 34 * u, 1048 * u, { size: 19 * u, col: w(0.4) });

  /* --- terminal ------------------------------------------------------------ */
  const TT = 960 * u;
  fill(c, SB, TT, ED - SB, ST - TT, 0, '#0b0b0d');
  line(c, SB, TT, ED - SB, 0.12);
  ['TERMINAL', 'OUTPUT', 'DEBUG'].forEach((s, i) => {
    t(c, s, SB + (34 + i * 150) * u, TT + 40 * u,
      { size: 17 * u, ls: 3.2 * u, col: w(i === 0 ? 0.6 : 0.24) });
  });
  [['$ pnpm test -- reconcile', 0.72],
   [' PASS  src/reconcile/reconcile.test.ts (1.94 s)', 0.5],
   ['   ✓ matches on reference and amount              12 ms', 0.42],
   ['   ✓ flags a 3p difference as a break              4 ms', 0.42],
   ['   ✓ returns ledger orphans as unreconciled        3 ms', 0.42],
   [' Tests 3 passed (3)   Files 1 passed   Coverage 94.2 %', 0.6]]
    .forEach((row, i) => {
      t(c, row[0], SB + 34 * u, TT + (86 + i * 30) * u,
        { size: 20 * u, col: w(row[1]), mono: true });
    });

  /* --- status bar ---------------------------------------------------------- */
  fill(c, 0, ST, W, H - ST, 0, '#141417');
  let bx = 34 * u;
  ['main*', '0 errors', '0 warnings', 'TypeScript 5.6', 'ESLint', 'Prettier']
    .forEach((s) => {
      t(c, s, bx, ST + 39 * u, { size: 19 * u, col: w(0.46) });
      bx += measure(c, s, { size: 19 * u }) + 46 * u;
    });
  let rx = W - 34 * u;
  ['UTF-8', 'LF', 'Spaces: 2', 'Ln 21, Col 30'].forEach((s) => {
    t(c, s, rx, ST + 39 * u, { size: 19 * u, col: w(0.4), align: 'right' });
    rx -= measure(c, s, { size: 19 * u }) + 46 * u;
  });
  return cv;
}

/* =================================================================== 2048 × 1280
   03 · SAAS PRODUCTS — the console a customer signs in to every morning.
   Four tiles, a chart and a table is the shape of every analytics page ever
   shipped; what makes it read as *ours* is that every number is consistent —
   the table's MRR adds up to the tile, the cohort grid decays the way real
   retention decays, and the bars end where the KPI says they end.
   ============================================================================ */
function dash(W, H) {
  const { cv, c } = canvas2d(W, H, '#08080a');
  const u = W / 2048;
  const SB = 340 * u, L = 380 * u, R = W - 60 * u;

  /* --- sidebar ------------------------------------------------------------- */
  fill(c, 0, 0, SB, H, 0, '#0b0b0d');
  t(c, 'NORTHWIND', 36 * u, 62 * u, { size: 24 * u, ls: 5 * u, col: w(0.92), serif: true });
  line(c, 36 * u, 96 * u, SB - 72 * u, 0.08);
  const nav = [
    ['OVERVIEW', [['Home', ''], ['Revenue', '', 1], ['Retention', '']]],
    ['CUSTOMERS', [['Accounts', '1,284'], ['Segments', '7'], ['Health', '']]],
    ['OPERATIONS', [['Billing', '3'], ['Usage', ''], ['Webhooks', '']]],
    ['WORKSPACE', [['Team', '9'], ['API keys', ''], ['Audit log', '']]],
  ];
  let ny = 150 * u;
  nav.forEach(([title, rows]) => {
    t(c, title, 36 * u, ny, { size: 16 * u, ls: 3.2 * u, col: w(0.28) });
    rows.forEach(([label, badge, on], i) => {
      const y = ny + (44 + i * 44) * u;
      if (on) {
        fill(c, 0, y - 30 * u, SB, 42 * u, 0, w(0.055));
        fill(c, 0, y - 30 * u, 3 * u, 42 * u, 0, w(0.8));
      }
      t(c, label, 36 * u, y, { size: 21 * u, col: w(on ? 0.94 : 0.52) });
      if (badge) {
        const bw = measure(c, badge, { size: 16 * u }) + 20 * u;
        fill(c, SB - 36 * u - bw, y - 20 * u, bw, 26 * u, 13 * u, w(0.1));
        t(c, badge, SB - 36 * u - bw / 2, y - 2 * u,
          { size: 16 * u, col: w(0.5), align: 'center' });
      }
    });
    ny += (76 + rows.length * 44) * u;
  });
  line(c, 36 * u, H - 132 * u, SB - 72 * u, 0.08);
  initials(c, 36 * u, H - 100 * u, 20 * u, 'WA', 0.14);
  t(c, 'Wren Adeyemi', 92 * u, H - 84 * u, { size: 20 * u, col: w(0.7) });
  t(c, 'Owner · Production', 92 * u, H - 58 * u, { size: 17 * u, col: w(0.32) });

  /* --- top bar ------------------------------------------------------------- */
  t(c, 'Analytics  /  Revenue', L, 60 * u, { size: 19 * u, col: w(0.36) });
  let cx = R;
  ['Export CSV', 'All plans', '1 – 30 Sep 2026'].forEach((s, i) => {
    const wd = measure(c, s, { size: 19 * u }) + 40 * u;
    cx -= wd;
    stroke(c, cx, 32 * u, wd, 42 * u, 21 * u, w(i === 0 ? 0.3 : 0.14), 1.5 * u);
    t(c, s, cx + 20 * u, 59 * u, { size: 19 * u, col: w(i === 0 ? 0.8 : 0.55) });
    cx -= 16 * u;
  });
  line(c, L, 100 * u, R - L, 0.08);

  /* --- heading ------------------------------------------------------------- */
  t(c, 'Recurring revenue', L, 176 * u, { size: 40 * u, col: w(0.95), serif: true });
  t(c, 'Updated 4 minutes ago · GBP · excludes tax and one-off fees', L, 212 * u,
    { size: 20 * u, col: w(0.36) });

  /* --- KPI tiles ----------------------------------------------------------- */
  const kpis = [
    ['MRR', '£48,240', '+6.2%', [31, 33, 32, 36, 38, 37, 41, 43, 42, 45, 46, 48]],
    ['Active accounts', '1,284', '+38', [1080, 1104, 1131, 1150, 1166, 1179, 1198, 1214, 1229, 1246, 1262, 1284]],
    ['Net revenue churn', '1.4%', '−0.3pt', [3.1, 2.9, 2.8, 2.6, 2.5, 2.2, 2.1, 1.9, 1.8, 1.7, 1.6, 1.4]],
    ['Trial → paid', '24.6%', '+2.1pt', [18, 19, 21, 20, 22, 21, 23, 24, 23, 25, 24, 24.6]],
  ];
  const kw = (R - L - 3 * 26 * u) / 4, kh = 182 * u, ky = 248 * u;
  kpis.forEach(([label, value, delta, series], i) => {
    const x = L + i * (kw + 26 * u);
    stroke(c, x, ky, kw, kh, 6 * u, w(0.1), 1.5 * u);
    t(c, label, x + 28 * u, ky + 40 * u, { size: 17 * u, ls: 3 * u, col: w(0.36), caps: true });
    t(c, value, x + 28 * u, ky + 100 * u, { size: 44 * u, col: w(0.96), serif: true });
    t(c, delta, x + 28 * u + measure(c, value, { size: 44 * u, serif: true }) + 18 * u,
      ky + 100 * u, { size: 19 * u, col: w(0.5) });
    spark(c, x + 28 * u, ky + 122 * u, kw - 56 * u, 40 * u, series, 0.32);
  });

  /* --- chart --------------------------------------------------------------- */
  const CT = 480 * u, CB = 804 * u, PL = L + 92 * u;
  t(c, 'Monthly recurring revenue · rolling 12 months', L, CT - 20 * u,
    { size: 22 * u, col: w(0.8) });
  let lx = R;
  [['Expansion', 0.28], ['New', 0.55]].forEach(([s, a]) => {
    lx -= measure(c, s, { size: 18 * u });
    t(c, s, lx, CT - 20 * u, { size: 18 * u, col: w(0.45) });
    lx -= 16 * u;
    fill(c, lx - 18 * u, CT - 32 * u, 18 * u, 10 * u, 2 * u, w(a));
    lx -= 44 * u;
  });
  ['60k', '40k', '20k', '0'].forEach((s, i) => {
    const y = CT + 30 * u + i * ((CB - CT - 30 * u) / 3);
    line(c, PL, y, R - PL, 0.07);
    t(c, '£' + s, PL - 18 * u, y + 7 * u, { size: 17 * u, col: w(0.28), align: 'right' });
  });
  const mrr = [31.4, 32.8, 32.1, 35.6, 37.9, 37.2, 40.8, 42.6, 41.9, 44.7, 46.1, 48.2];
  const exp = [4.1, 4.4, 4.0, 5.2, 5.6, 5.1, 6.3, 6.8, 6.4, 7.2, 7.6, 8.1];
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  const SC = (CB - CT - 30 * u) / 60;
  const bw = (R - PL) / 12, bar = bw * 0.5;
  mrr.forEach((v, i) => {
    const x = PL + i * bw + (bw - bar) / 2;
    const full = SC * v, eh = SC * exp[i];
    fill(c, x, CB - full, bar, eh, 2 * u, w(0.26));            /* expansion, on top */
    fill(c, x, CB - full + eh, bar, full - eh, 0, w(i === 11 ? 0.66 : 0.5));
    t(c, months[i], x + bar / 2, CB + 32 * u,
      { size: 17 * u, col: w(i === 11 ? 0.6 : 0.3), align: 'center' });
  });
  t(c, '£48.2k', PL + 11 * bw + bar / 2, CB - SC * 48.2 - 16 * u,
    { size: 18 * u, col: w(0.62), align: 'center' });
  /* the target the whole team is measured against — and the reason for the headroom */
  c.setLineDash([7 * u, 7 * u]);
  c.beginPath(); c.moveTo(PL, CB - SC * 55); c.lineTo(R, CB - SC * 55);
  c.strokeStyle = w(0.22); c.lineWidth = 1.5 * u; c.stroke();
  c.setLineDash([]);
  t(c, 'Target £55k by December', PL + 14 * u, CB - SC * 55 - 14 * u,
    { size: 17 * u, col: w(0.38) });

  /* --- accounts table ------------------------------------------------------ */
  const TY = 892 * u, TW = 950 * u;
  t(c, 'Largest accounts', L, TY, { size: 22 * u, col: w(0.82) });
  t(c, 'View all 1,284', L + TW, TY, { size: 18 * u, col: w(0.38), align: 'right' });
  const cols = [0, 300, 430, 540, 700, 830];
  ['ACCOUNT', 'PLAN', 'SEATS', 'MRR', 'HEALTH', 'RENEWS'].forEach((s, i) => {
    t(c, s, L + cols[i] * u, TY + 42 * u,
      { size: 15 * u, ls: 2.6 * u, col: w(0.3) });
  });
  line(c, L, TY + 58 * u, TW, 0.09);
  const rows = [
    ['Kestrel Labs', 'Scale', '48', '£2,400', 'Healthy', '12 Sep'],
    ['Fjord Systems', 'Scale', '61', '£3,050', 'Healthy', '28 Sep'],
    ['Ardent Studio', 'Scale', '39', '£1,950', 'Healthy', '22 Oct'],
    ['Northwind Ltd', 'Team', '22', '£990', 'Watch', '03 Oct'],
    ['Halyard Group', 'Team', '14', '£630', 'At risk', '19 Sep'],
    ['Meridian Foods', 'Starter', '6', '£174', 'Healthy', '07 Nov'],
  ];
  rows.forEach((row, i) => {
    const y = TY + (92 + i * 38) * u;
    row.forEach((s, k) => {
      if (k === 4) {
        const a = s === 'Healthy' ? 0.5 : s === 'Watch' ? 0.34 : 0.22;
        c.beginPath(); c.arc(L + cols[k] * u + 7 * u, y - 7 * u, 5 * u, 0, 7);
        c.fillStyle = w(a + 0.25); c.fill();
        t(c, s, L + cols[k] * u + 22 * u, y, { size: 19 * u, col: w(0.52) });
      } else {
        t(c, s, L + cols[k] * u, y,
          { size: 19 * u, col: w(k === 0 ? 0.82 : k === 3 ? 0.7 : 0.46) });
      }
    });
    if (i < rows.length - 1) line(c, L, y + 15 * u, TW, 0.045);
  });

  /* --- cohort grid --------------------------------------------------------- */
  const HX = L + TW + 60 * u;
  t(c, 'Retention by cohort', HX, TY, { size: 22 * u, col: w(0.82) });
  t(c, '% of accounts still paying', HX, TY + 42 * u, { size: 17 * u, col: w(0.32) });
  const cell = (R - HX - 90 * u) / 6, ch2 = 34 * u;
  ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'].forEach((s, i) => {
    t(c, s, HX + 90 * u + i * cell + cell / 2, TY + 78 * u,
      { size: 15 * u, col: w(0.3), align: 'center' });
  });
  const coh = [
    ['Apr', [100, 94, 91, 88, 86, 85]],
    ['May', [100, 95, 92, 90, 88, 87]],
    ['Jun', [100, 93, 90, 88, 86, null]],
    ['Jul', [100, 96, 93, 91, null, null]],
    ['Aug', [100, 95, 92, null, null, null]],
    ['Sep', [100, 97, null, null, null, null]],
  ];
  coh.forEach(([label, vals], r) => {
    const y = TY + 90 * u + r * ch2;
    t(c, label, HX, y + 23 * u, { size: 17 * u, col: w(0.4) });
    vals.forEach((v, k) => {
      const x = HX + 90 * u + k * cell;
      if (v === null) {
        stroke(c, x + 2 * u, y + 3 * u, cell - 6 * u, ch2 - 6 * u, 3 * u, w(0.05), 1.2 * u);
        return;
      }
      fill(c, x + 2 * u, y + 3 * u, cell - 6 * u, ch2 - 6 * u, 3 * u,
        w(0.045 + ((v - 82) / 18) * 0.16));
      t(c, String(v), x + cell / 2, y + 24 * u,
        { size: 16 * u, col: w(0.3 + ((v - 82) / 18) * 0.45), align: 'center' });
    });
  });

  /* --- footer -------------------------------------------------------------- */
  line(c, L, H - 66 * u, R - L, 0.08);
  t(c, '2,048 events/min   ·   p95 142 ms   ·   99.98% uptime, 90 days', L, H - 26 * u,
    { size: 18 * u, col: w(0.34) });
  t(c, 'Last sync 12:04:31', R, H - 26 * u, { size: 18 * u, col: w(0.3), align: 'right' });
  return cv;
}

/* --------------------------------------------------------- SF-style glyphs
   The phone screen is the one that has to survive being seen from across a
   room, and five identical rounded squares in a tab bar is the tell that
   nobody drew it. These are traced from the SF Symbols the app actually
   names in its source — briefcase, figure.run, heart, moon.stars, banknote,
   sparkles, square.grid.2x2, chart.bar, flame, gearshape. */
function star4(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x + r * 0.17, y - r * 0.17, x + r, y);
  c.quadraticCurveTo(x + r * 0.17, y + r * 0.17, x, y + r);
  c.quadraticCurveTo(x - r * 0.17, y + r * 0.17, x - r, y);
  c.quadraticCurveTo(x - r * 0.17, y - r * 0.17, x, y - r);
  c.closePath();
}

const SF = {
  briefcase(c, x, y, s) {
    stroke(c, x - s * 0.5, y - s * 0.26, s, s * 0.62, s * 0.1, c.strokeStyle, c.lineWidth);
    c.beginPath();
    c.moveTo(x - s * 0.2, y - s * 0.26); c.lineTo(x - s * 0.2, y - s * 0.44);
    c.lineTo(x + s * 0.2, y - s * 0.44); c.lineTo(x + s * 0.2, y - s * 0.26);
    c.stroke();
  },
  run(c, x, y, s) {
    c.beginPath(); c.arc(x + s * 0.13, y - s * 0.35, s * 0.13, 0, 7); c.stroke();
    c.beginPath();
    c.moveTo(x + s * 0.15, y - s * 0.16); c.lineTo(x - s * 0.03, y + s * 0.05);
    c.lineTo(x + s * 0.21, y + s * 0.42);
    c.moveTo(x - s * 0.03, y + s * 0.05); c.lineTo(x - s * 0.27, y + s * 0.34);
    c.moveTo(x + s * 0.07, y - s * 0.08); c.lineTo(x + s * 0.36, y - s * 0.02);
    c.moveTo(x + s * 0.07, y - s * 0.08); c.lineTo(x - s * 0.24, y - s * 0.14);
    c.stroke();
  },
  heart(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y + s * 0.38);
    c.bezierCurveTo(x - s * 0.62, y - s * 0.02, x - s * 0.44, y - s * 0.46, x, y - s * 0.14);
    c.bezierCurveTo(x + s * 0.44, y - s * 0.46, x + s * 0.62, y - s * 0.02, x, y + s * 0.38);
    c.closePath(); c.stroke();
  },
  /* a stroked C is a letter; a thick one is a crescent */
  moon(c, x, y, s) {
    const lw = c.lineWidth;
    c.lineWidth = s * 0.23; c.lineCap = 'round';
    c.beginPath();
    c.arc(x + s * 0.07, y + s * 0.02, s * 0.28, Math.PI * 0.44, Math.PI * 1.56);
    c.stroke();
    c.lineWidth = lw;
    c.fillStyle = c.strokeStyle;
    star4(c, x + s * 0.36, y - s * 0.34, s * 0.12); c.fill();
    star4(c, x + s * 0.47, y - s * 0.02, s * 0.075); c.fill();
  },
  banknote(c, x, y, s) {
    stroke(c, x - s * 0.52, y - s * 0.3, s * 1.04, s * 0.6, s * 0.08, c.strokeStyle, c.lineWidth);
    c.beginPath(); c.arc(x, y, s * 0.15, 0, 7); c.stroke();
  },
  sparkles(c, x, y, s) {
    c.fillStyle = c.strokeStyle;
    star4(c, x - s * 0.08, y - s * 0.04, s * 0.38); c.fill();
    star4(c, x + s * 0.33, y + s * 0.3, s * 0.17); c.fill();
    star4(c, x + s * 0.3, y - s * 0.34, s * 0.12); c.fill();
  },
  grid(c, x, y, s) {
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
      stroke(c, x + dx * s * 0.40 - s * 0.17, y + dy * s * 0.40 - s * 0.17,
        s * 0.34, s * 0.34, s * 0.09, c.strokeStyle, c.lineWidth);
    });
  },
  bars(c, x, y, s) {
    c.beginPath();
    [[-0.34, 0.32], [0, 0.56], [0.34, 0.82]].forEach(([dx, h]) => {
      c.moveTo(x + dx * s, y + s * 0.42); c.lineTo(x + dx * s, y + s * 0.42 - h * s);
    });
    c.stroke();
  },
  /* the inner flame is what separates it from a water drop — the outline
     alone is ambiguous at any size a tab bar allows */
  flame(c, x, y, s) {
    c.beginPath();
    c.moveTo(x + s * 0.04, y - s * 0.50);
    c.bezierCurveTo(x + s * 0.10, y - s * 0.22, x + s * 0.36, y - s * 0.10, x + s * 0.33, y + s * 0.14);
    c.bezierCurveTo(x + s * 0.30, y + s * 0.38, x + s * 0.14, y + s * 0.50, x - s * 0.02, y + s * 0.50);
    c.bezierCurveTo(x - s * 0.24, y + s * 0.50, x - s * 0.36, y + s * 0.34, x - s * 0.33, y + s * 0.12);
    c.bezierCurveTo(x - s * 0.30, y - s * 0.06, x - s * 0.14, y - s * 0.02, x - s * 0.19, y - s * 0.24);
    c.bezierCurveTo(x - s * 0.23, y - s * 0.42, x - s * 0.08, y - s * 0.44, x + s * 0.04, y - s * 0.50);
    c.closePath(); c.stroke();
    c.beginPath();
    c.moveTo(x + s * 0.02, y + s * 0.01);
    c.bezierCurveTo(x + s * 0.19, y + s * 0.15, x + s * 0.15, y + s * 0.40, x - s * 0.02, y + s * 0.40);
    c.bezierCurveTo(x - s * 0.17, y + s * 0.40, x - s * 0.21, y + s * 0.21, x + s * 0.02, y + s * 0.01);
    c.closePath(); c.stroke();
  },
  /* real teeth have flat tops; radial spokes make a sun, not a gearshape */
  gear(c, x, y, s) {
    const N = 7, ro = s * 0.50, ri = s * 0.35, step = (Math.PI * 2) / N / 4;
    c.beginPath();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const nxt = ((i + 1) / N) * Math.PI * 2 - Math.PI / 2;
      [[a - step * 1.05, ri], [a - step * 0.75, ro],
       [a + step * 0.75, ro], [a + step * 1.05, ri]].forEach(([ang, r], k) => {
        const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r;
        (i === 0 && k === 0) ? c.moveTo(px, py) : c.lineTo(px, py);
      });
      c.arc(x, y, ri, a + step * 1.05, nxt - step * 1.05);
    }
    c.closePath(); c.stroke();
    c.beginPath(); c.arc(x, y, s * 0.15, 0, 7); c.stroke();
  },
  chevron(c, x, y, s) {
    c.beginPath();
    c.moveTo(x - s * 0.22, y - s * 0.4); c.lineTo(x + s * 0.2, y); c.lineTo(x - s * 0.22, y + s * 0.4);
    c.stroke();
  },
  shareUp(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y + s * 0.16); c.lineTo(x, y - s * 0.46);
    c.moveTo(x - s * 0.24, y - s * 0.22); c.lineTo(x, y - s * 0.46); c.lineTo(x + s * 0.24, y - s * 0.22);
    c.moveTo(x - s * 0.36, y - s * 0.06); c.lineTo(x - s * 0.36, y + s * 0.46);
    c.lineTo(x + s * 0.36, y + s * 0.46); c.lineTo(x + s * 0.36, y - s * 0.06);
    c.stroke();
  },
};

/* ==================================================================== 780 × 1690
   04 · MOBILE APPLICATIONS — Zenin, Today.
   The other five screens on this floor are invented products, and they say so
   in the caption. This one is not: it is our own shipped iOS app, drawn from
   its own source — the header's day / date / month stack and completion ring,
   the daily quote card, Compound Progress, the MANIFEST heading, the goal
   cards with their pillar icon and streak, and the five real tabs. The goal
   titles are the app's own starter templates and the pillars are its own
   `LifePillar` cases; nothing here is dressed up.

   The arithmetic holds, as everywhere else: two of five goals checked is the
   40% on the ring and the 40% on the Daily row.
   ============================================================================ */
function app(W, H) {
  const { cv, c } = canvas2d(W, H, '#08080a');
  const u = W / 780;
  const M = 44 * u, R = W - M;

  /* --- status bar ---------------------------------------------------------- */
  t(c, '9:41', M, 46 * u, { size: 25 * u, weight: 500, col: w(0.92) });
  [3, 5, 7, 9].forEach((h, i) => {
    fill(c, W - 168 * u + i * 13 * u, 40 * u - h * 1.7 * u, 8 * u, h * 1.7 * u, 1.5 * u, w(0.85));
  });
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.arc(W - 96 * u, 42 * u, (i + 1) * 7 * u, Math.PI * 1.25, Math.PI * 1.75);
    c.strokeStyle = w(0.85); c.lineWidth = 3 * u; c.stroke();
  }
  stroke(c, W - 68 * u, 27 * u, 34 * u, 17 * u, 4 * u, w(0.5), 2 * u);
  fill(c, W - 65 * u, 30 * u, 24 * u, 11 * u, 2 * u, w(0.85));

  /* --- header: day / date / month, and the completion ring ----------------- */
  t(c, 'TUE', M, 126 * u, { size: 17 * u, ls: 3.4 * u, col: w(0.34) });
  t(c, '25', M, 190 * u, { size: 56 * u, col: w(0.96), serif: true });
  t(c, 'AUGUST 2026', M, 224 * u, { size: 16 * u, ls: 3 * u, col: w(0.42) });

  const RR = 40 * u, RC = R - RR, RY = 168 * u, PROG = 0.4;
  c.lineCap = 'round';
  c.beginPath(); c.arc(RC, RY, RR, 0, 7);
  c.strokeStyle = w(0.14); c.lineWidth = 5 * u; c.stroke();
  c.beginPath();
  c.arc(RC, RY, RR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * PROG);
  c.strokeStyle = w(0.82); c.lineWidth = 5 * u; c.stroke();
  c.lineCap = 'butt';
  t(c, '40%', RC, RY + 10 * u, { size: 24 * u, col: w(0.94), align: 'center' });

  /* --- the daily quote ----------------------------------------------------- */
  const QY = 280 * u, QH = 170 * u;
  fill(c, M, QY, R - M, QH, 18 * u, w(0.045));
  t(c, '“', M + 28 * u, QY + 74 * u, { size: 68 * u, col: w(0.2), serif: true });
  c.strokeStyle = w(0.34); c.lineWidth = 2.2 * u; c.lineJoin = 'round';
  SF.shareUp(c, R - 44 * u, QY + 44 * u, 26 * u);
  t(c, 'Discipline equals freedom.', M + 28 * u, QY + 110 * u,
    { size: 27 * u, col: w(0.9), serif: true });
  t(c, '— Jocko Willink', M + 28 * u, QY + 144 * u, { size: 17 * u, col: w(0.38) });

  /* --- compound progress --------------------------------------------------- */
  t(c, 'Compound Progress', M, 508 * u, { size: 22 * u, col: w(0.86) });
  const bars = [['Daily', 0.40], ['Weekly', 0.76], ['Monthly', 0.68], ['Yearly', 0.54]];
  bars.forEach(([label, v], i) => {
    const y = (548 + i * 44) * u, bx = M + 116 * u, bw2 = R - 76 * u - bx;
    t(c, label, M, y + 6 * u, { size: 18 * u, col: w(0.56) });
    fill(c, bx, y - 4 * u, bw2, 7 * u, 3.5 * u, w(0.075));
    fill(c, bx, y - 4 * u, bw2 * v, 7 * u, 3.5 * u, w(i ? 0.42 : 0.78));
    t(c, Math.round(v * 100) + '%', R, y + 6 * u,
      { size: 18 * u, col: w(i ? 0.5 : 0.8), align: 'right' });
  });

  /* --- the manifest heading, in the app's own words ------------------------ */
  t(c, 'MANIFEST', M, 758 * u, { size: 15 * u, ls: 3.2 * u, col: w(0.3) });
  t(c, 'Write it down.', M, 802 * u, { size: 31 * u, col: w(0.95), serif: true });
  t(c, 'Manifest it.', M, 840 * u, { size: 31 * u, col: w(0.95), serif: true });
  t(c, 'The goals you put into words are the ones you live out.', M, 876 * u,
    { size: 16 * u, col: w(0.36) });

  /* --- today's goals ------------------------------------------------------- */
  const goals = [
    ['Deep work for 1 hour', 'Career', 'briefcase', 12, 1],
    ['Walk 8,000 steps', 'Sports & Health', 'run', 41, 1],
    ['Drink 2L of water', 'Sports & Health', 'run', 23, 0],
    ['Meditate 10 minutes', 'Spiritual', 'moon', 8, 0],
    ['Call a loved one', 'Relationships', 'heart', 5, 0],
  ];
  goals.forEach(([title, pillar, icon, streak, done], i) => {
    const y = (912 + i * 118) * u, h = 106 * u;
    if (done) fill(c, M, y, R - M, h, 16 * u, w(0.055));
    else stroke(c, M, y, R - M, h, 16 * u, w(0.075), 1.5 * u);

    const cxk = M + 34 * u, cyk = y + h / 2;
    if (done) {
      c.beginPath(); c.arc(cxk, cyk, 17 * u, 0, 7); c.fillStyle = w(0.86); c.fill();
      c.strokeStyle = '#0b0b0d'; c.lineWidth = 3 * u;
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(cxk - 7 * u, cyk); c.lineTo(cxk - 2 * u, cyk + 5 * u);
      c.lineTo(cxk + 7.5 * u, cyk - 5.5 * u); c.stroke();
      c.lineCap = 'butt';
    } else {
      c.beginPath(); c.arc(cxk, cyk, 17 * u, 0, 7);
      c.strokeStyle = w(0.18); c.lineWidth = 2.2 * u; c.stroke();
    }

    t(c, title, M + 66 * u, y + 46 * u, { size: 23 * u, col: w(done ? 0.6 : 0.93) });
    c.strokeStyle = w(0.34); c.lineWidth = 1.8 * u;
    c.lineCap = 'round'; c.lineJoin = 'round';
    SF[icon](c, M + 76 * u, y + 72 * u, 20 * u);
    c.lineCap = 'butt';
    t(c, pillar, M + 96 * u, y + 79 * u, { size: 16 * u, col: w(0.34) });

    t(c, String(streak), R - 54 * u, y + 48 * u,
      { size: 21 * u, col: w(0.72), align: 'right' });
    t(c, 'days', R - 54 * u, y + 74 * u, { size: 14 * u, col: w(0.32), align: 'right' });
    c.strokeStyle = w(0.24); c.lineWidth = 2.2 * u;
    c.lineCap = 'round'; c.lineJoin = 'round';
    SF.chevron(c, R - 22 * u, cyk, 18 * u);
    c.lineCap = 'butt';
  });

  /* --- the five real tabs -------------------------------------------------- */
  line(c, 0, H - 128 * u, W, 0.1);
  [['Today', 'grid'], ['Goals', 'bars'], ['Coach', 'sparkles'],
   ['Streak', 'flame'], ['Settings', 'gear']].forEach(([label, icon], i) => {
    const x = (W / 5) * i + W / 10, on = i === 0, a = on ? 0.9 : 0.3;
    c.strokeStyle = w(a); c.lineWidth = 2.2 * u;
    c.lineCap = 'round'; c.lineJoin = 'round';
    SF[icon](c, x, H - 86 * u, 26 * u);
    c.lineCap = 'butt';
    t(c, label, x, H - 50 * u, { size: 15 * u, col: w(on ? 0.9 : 0.34), align: 'center' });
  });
  fill(c, W / 2 - 70 * u, H - 22 * u, 140 * u, 6 * u, 3 * u, w(0.35));
  return cv;
}
/* =================================================================== 1600 × 1200
   05 · BUSINESS DIGITALIZATION — the board that replaced the whiteboard.
   Every card carries a reference, a customer, a value and a date, because the
   whole argument of this service is that the work stops living in someone's
   head. The automation strip at the bottom is the part clients do not expect
   and the part that actually saves the day.
   ============================================================================ */
function flow(W, H) {
  const { cv, c } = canvas2d(W, H, '#08080a');
  const u = W / 1600;
  const M = 44 * u;

  /* --- header -------------------------------------------------------------- */
  fill(c, 0, 0, W, 104 * u, 0, '#0d0d10');
  t(c, 'HALYARD FIELD SERVICES', M, 62 * u,
    { size: 21 * u, ls: 4.4 * u, col: w(0.9), serif: true });
  stroke(c, 480 * u, 32 * u, 380 * u, 42 * u, 21 * u, w(0.12), 1.5 * u);
  t(c, 'Search jobs, customers, refs…', 506 * u, 59 * u, { size: 18 * u, col: w(0.3) });
  ['WA', 'KO', 'JM', 'RD'].forEach((s, i) => {
    initials(c, (1160 + i * 42) * u, 32 * u, 21 * u, s, 0.11);
  });
  fill(c, W - M - 150 * u, 30 * u, 150 * u, 46 * u, 23 * u, w(0.9));
  t(c, 'New job', W - M - 75 * u, 59 * u, { size: 19 * u, col: '#0b0b0d', align: 'center' });

  /* --- sub bar ------------------------------------------------------------- */
  t(c, 'Jobs', M, 168 * u, { size: 34 * u, col: w(0.95), serif: true });
  let hx = W - M;
  ['Map', 'List', 'Board'].forEach((s, i) => {
    const wd = measure(c, s, { size: 18 * u }) + 34 * u;
    hx -= wd;
    if (i === 2) fill(c, hx, 140 * u, wd, 38 * u, 8 * u, w(0.1));
    t(c, s, hx + 17 * u, 165 * u, { size: 18 * u, col: w(i === 2 ? 0.88 : 0.4) });
  });
  hx -= 30 * u;
  ['All crews', 'This week'].forEach((s) => {
    const wd = measure(c, s, { size: 18 * u }) + 44 * u;
    hx -= wd + 14 * u;
    stroke(c, hx, 140 * u, wd, 38 * u, 19 * u, w(0.13), 1.5 * u);
    t(c, s, hx + 22 * u, 165 * u, { size: 18 * u, col: w(0.52) });
  });
  t(c, '9 open   ·   4 due today   ·   2 blocked   ·   £22,450 scheduled this week',
    M, 214 * u, { size: 19 * u, col: w(0.38) });
  line(c, M, 240 * u, W - M * 2, 0.08);

  /* --- board --------------------------------------------------------------- */
  /* the arithmetic is the point: 3 + 3 + 3 open, four cards marked Today, two
     marked Blocked, and the Scheduled column adding to the £22,450 in the
     line above. A board whose header disagrees with its own cards is the
     tell that it was drawn rather than used. */
  const cols = [
    ['New', [
      ['JOB-2418', 'Roof survey — Unit 4', 'Kestrel Labs', '£1,240', 'Today', 'KO', 1],
      ['JOB-2417', 'Quarterly HVAC service', 'Fjord Systems', '£3,600', 'Thu', 'WA', 0],
      ['JOB-2415', 'Emergency leak, floor 2', 'Northwind Ltd', '£480', 'Today', 'JM', 1],
    ]],
    ['Scheduled', [
      ['JOB-2409', 'Lift inspection ×3', 'Ardent Studio', '£2,150', 'Today', 'RD', 1],
      ['JOB-2404', 'Fire door remediation', 'Kestrel Labs', '£7,400', '18 Sep', 'WA', 0],
      ['JOB-2398', 'Car park resurfacing', 'Meridian Foods', '£12,900', '22 Sep', 'KO', 0],
    ]],
    ['In progress', [
      ['JOB-2391', 'Cladding replacement', 'Fjord Systems', '£9,800', 'Blocked', 'JM', 2],
      ['JOB-2387', 'Boiler swap — block C', 'Halyard Group', '£4,320', 'Today', 'RD', 1],
      ['JOB-2384', 'Access hatch repair', 'Kestrel Labs', '£1,150', 'Blocked', 'WA', 2],
    ]],
    ['Invoiced', [
      ['JOB-2372', 'Gutter clearance', 'Northwind Ltd', '£690', 'Paid', 'WA', 0],
      ['JOB-2361', 'Window seals ×14', 'Ardent Studio', '£1,880', 'Sent', 'KO', 0],
      ['JOB-2358', 'Drain survey, block A', 'Meridian Foods', '£3,240', 'Paid', 'RD', 0],
    ]],
  ];
  const cw = (W - M * 2 - 3 * 24 * u) / 4;
  cols.forEach(([title, cards], ci) => {
    const x = M + ci * (cw + 24 * u);
    t(c, title, x, 300 * u, { size: 21 * u, col: w(0.86) });
    t(c, String(cards.length), x + measure(c, title, { size: 21 * u }) + 14 * u, 300 * u,
      { size: 19 * u, col: w(0.3) });
    line(c, x, 320 * u, cw, 0.1);
    cards.forEach((card, i) => {
      const [ref, name, cust, val, due, who, flag] = card;
      const y = (350 + i * 184) * u, h = 166 * u;
      stroke(c, x, y, cw, h, 10 * u, w(0.09), 1.5 * u);
      if (flag) fill(c, x, y, 3 * u, h, 0, w(flag === 2 ? 0.6 : 0.26));
      t(c, ref, x + 22 * u, y + 34 * u, { size: 16 * u, ls: 1.6 * u, col: w(0.34), mono: true });
      t(c, name, x + 22 * u, y + 72 * u, { size: 21 * u, col: w(0.9) });
      t(c, cust, x + 22 * u, y + 104 * u, { size: 18 * u, col: w(0.4) });
      t(c, val, x + 22 * u, y + 142 * u, { size: 20 * u, col: w(0.72) });
      chip(c, x + cw - 22 * u - measure(c, due, { size: 16 * u }) - 30 * u, y + 124 * u, due,
        { size: 16 * u, pad: 15 * u, h: 32 * u,
          bd: flag === 2 ? 0.42 : flag === 1 ? 0.3 : 0.12,
          col: w(flag ? 0.82 : 0.45) });
      initials(c, x + cw - 22 * u - 26 * u, y + 22 * u, 13 * u, who, 0.13);
    });
    /* the empty slot at the foot of a column — every board has one */
    const gy = (350 + cards.length * 184) * u;
    c.setLineDash([6 * u, 6 * u]);
    stroke(c, x, gy, cw, 56 * u, 10 * u, w(0.09), 1.5 * u);
    c.setLineDash([]);
    t(c, '+  Add job', x + 22 * u, gy + 35 * u, { size: 18 * u, col: w(0.26) });
  });

  /* --- automations --------------------------------------------------------- */
  line(c, M, 1030 * u, W - M * 2, 0.08);
  t(c, 'AUTOMATIONS', M, 1074 * u, { size: 16 * u, ls: 3.4 * u, col: w(0.32) });
  t(c, '3 active · 1,412 runs this month · 0 failures', W - M, 1074 * u,
    { size: 17 * u, col: w(0.3), align: 'right' });
  [['Job accepted → schedule crew + send SMS', '486 runs'],
   ['Work complete → draft invoice in Xero', '312 runs'],
   ['Unpaid 14 days → chase, then flag to owner', '58 runs']]
    .forEach(([rule, runs], i) => {
      const x = M + i * ((W - M * 2) / 3);
      c.beginPath(); c.arc(x + 7 * u, 1120 * u, 6 * u, 0, 7);
      c.fillStyle = w(0.6); c.fill();
      t(c, rule, x + 26 * u, 1127 * u, { size: 19 * u, col: w(0.6) });
      t(c, runs, x + 26 * u, 1158 * u, { size: 16 * u, col: w(0.28) });
    });
  return cv;
}

/* =================================================================== 1600 × 1200
   06 · AI AUTOMATION — an assistant that has to show its work.
   The whole risk with this category is that it looks like a chat toy, so the
   screen is built around the three things that make it not one: the systems
   it is connected to, a table pulled from a real record with the record cited
   underneath it, and an approval queue where nothing leaves without a human.
   ============================================================================ */
function ai(W, H) {
  const { cv, c } = canvas2d(W, H, '#08080a');
  const u = W / 1600;
  const M = 56 * u, CW = 960 * u, RX = M + CW + 44 * u;

  /* --- header -------------------------------------------------------------- */
  t(c, 'Operations assistant', M, 64 * u, { size: 30 * u, col: w(0.95), serif: true });
  t(c, 'reconciler-2 · audit log on · 4 tools', W - M, 62 * u,
    { size: 18 * u, col: w(0.34), align: 'right' });
  let px = M;
  t(c, 'CONNECTED', px, 118 * u, { size: 15 * u, ls: 3 * u, col: w(0.3) });
  px += measure(c, 'CONNECTED', { size: 15 * u, ls: 3 * u }) + 34 * u;
  [['Invoices', '2,418 records'], ['CRM', '1,284 accounts'],
   ['Inventory', '9,610 SKUs'], ['Email', 'draft only']].forEach(([s, sub]) => {
    const label = s + '  ' + sub;
    const wd = measure(c, label, { size: 17 * u }) + 52 * u;
    stroke(c, px, 96 * u, wd, 34 * u, 17 * u, w(0.12), 1.4 * u);
    c.beginPath(); c.arc(px + 20 * u, 113 * u, 5 * u, 0, 7);
    c.fillStyle = w(0.55); c.fill();
    t(c, s, px + 34 * u, 119 * u, { size: 17 * u, col: w(0.7) });
    t(c, sub, px + 34 * u + measure(c, s, { size: 17 * u }) + 10 * u, 119 * u,
      { size: 17 * u, col: w(0.3) });
    px += wd + 14 * u;
  });
  line(c, M, 158 * u, W - M * 2, 0.08);

  /* --- conversation -------------------------------------------------------- */
  function bubble(x, y, wd, ht, me) {
    fill(c, x, y, wd, ht, 18 * u, w(me ? 0.085 : 0.035));
  }
  /* turn 1 — the ask */
  const q1 = 'Which invoices are more than 14 days overdue?';
  const q1w = measure(c, q1, { size: 22 * u }) + 60 * u;
  bubble(M + CW - q1w, 196 * u, q1w, 62 * u, 1);
  t(c, q1, M + CW - q1w + 30 * u, 235 * u, { size: 22 * u, col: w(0.92) });

  /* turn 2 — the answer, with the table it is based on */
  const ay = 286 * u, ah = 330 * u;
  bubble(M, ay, CW, ah, 0);
  t(c, 'Six, totalling £18,430. Two are the same customer — Kestrel Labs,',
    M + 30 * u, ay + 44 * u, { size: 22 * u, col: w(0.86) });
  t(c, 'whose payment terms changed on 14 March.',
    M + 30 * u, ay + 76 * u, { size: 22 * u, col: w(0.86) });
  const tc = [30, 210, 470, 610, 790];
  ['REF', 'CUSTOMER', 'DAYS LATE', 'AMOUNT', 'TERMS'].forEach((s, i) => {
    t(c, s, M + tc[i] * u, ay + 124 * u, { size: 14 * u, ls: 2.4 * u, col: w(0.3) });
  });
  line(c, M + 30 * u, ay + 138 * u, CW - 60 * u, 0.08);
  [['INV-2291', 'Kestrel Labs', '31', '£6,480', 'Net 14'],
   ['INV-2274', 'Kestrel Labs', '24', '£4,150', 'Net 14'],
   ['INV-2310', 'Fjord Systems', '17', '£2,900', 'Net 30']].forEach((row, r) => {
    const y = ay + (172 + r * 36) * u;
    row.forEach((s, k) => {
      t(c, s, M + tc[k] * u, y,
        { size: 19 * u, col: w(k === 0 ? 0.62 : k === 3 ? 0.8 : 0.5), mono: k === 0 });
    });
  });
  line(c, M + 30 * u, ay + 266 * u, CW - 60 * u, 0.06);
  t(c, '+ 3 more · £4,900', M + 30 * u, ay + 294 * u, { size: 18 * u, col: w(0.38) });
  t(c, 'Source: invoices.ledger · read 12:03:44 · 6 rows · no writes',
    M + CW - 30 * u, ay + 294 * u, { size: 16 * u, col: w(0.3), align: 'right' });

  /* turn 3 — the instruction */
  const q2 = 'Chase the two largest and flag the terms change to finance.';
  const q2w = measure(c, q2, { size: 22 * u }) + 60 * u;
  bubble(M + CW - q2w, 646 * u, q2w, 62 * u, 1);
  t(c, q2, M + CW - q2w + 30 * u, 685 * u, { size: 22 * u, col: w(0.92) });

  /* turn 4 — the result, explicitly not sent */
  bubble(M, 738 * u, CW, 130 * u, 0);
  t(c, 'Drafted 2 emails and opened FIN-114 for finance.',
    M + 30 * u, 782 * u, { size: 22 * u, col: w(0.86) });
  t(c, 'Nothing has been sent — both are waiting for you on the right.',
    M + 30 * u, 814 * u, { size: 22 * u, col: w(0.86) });
  t(c, '3 tool calls · 1.8 s · 4,120 tokens',
    M + 30 * u, 848 * u, { size: 16 * u, col: w(0.28) });

  /* composer */
  stroke(c, M, 898 * u, CW, 56 * u, 28 * u, w(0.11), 1.5 * u);
  t(c, 'Ask about invoices, stock or accounts…', M + 28 * u, 933 * u,
    { size: 19 * u, col: w(0.28) });

  /* --- approval rail ------------------------------------------------------- */
  const RW = W - M - RX;
  stroke(c, RX, 196 * u, RW, 758 * u, 12 * u, w(0.09), 1.5 * u);
  t(c, 'PENDING APPROVAL', RX + 26 * u, 236 * u, { size: 15 * u, ls: 3 * u, col: w(0.34) });
  t(c, '3', RX + RW - 26 * u, 236 * u, { size: 17 * u, col: w(0.5), align: 'right' });
  line(c, RX + 26 * u, 256 * u, RW - 52 * u, 0.08);
  [['Email · Kestrel Labs', 'Chase INV-2291 · £6,480', 'Payment reminder, second notice'],
   ['Email · Kestrel Labs', 'Chase INV-2274 · £4,150', 'Payment reminder, first notice'],
   ['Note · FIN-114', 'Terms changed 14 Mar', 'Assigned to finance · normal']]
    .forEach(([head, sub, body], i) => {
      const y = (288 + i * 200) * u;
      t(c, head, RX + 26 * u, y + 32 * u, { size: 18 * u, col: w(0.82) });
      t(c, sub, RX + 26 * u, y + 62 * u, { size: 18 * u, col: w(0.5) });
      t(c, body, RX + 26 * u, y + 90 * u, { size: 16 * u, col: w(0.3) });
      const bw = 108 * u;
      fill(c, RX + 26 * u, y + 112 * u, bw, 38 * u, 19 * u, w(0.86));
      t(c, 'Approve', RX + 26 * u + bw / 2, y + 137 * u,
        { size: 17 * u, col: '#0b0b0d', align: 'center' });
      stroke(c, RX + 26 * u + bw + 12 * u, y + 112 * u, 84 * u, 38 * u, 19 * u, w(0.16), 1.5 * u);
      t(c, 'Edit', RX + 26 * u + bw + 12 * u + 42 * u, y + 137 * u,
        { size: 17 * u, col: w(0.6), align: 'center' });
      if (i < 2) line(c, RX + 26 * u, y + 178 * u, RW - 52 * u, 0.055);
    });
  t(c, 'Approved today', RX + 26 * u, 918 * u, { size: 16 * u, col: w(0.3) });
  t(c, '11 of 11', RX + RW - 26 * u, 918 * u, { size: 16 * u, col: w(0.5), align: 'right' });

  /* --- guardrails ---------------------------------------------------------- */
  line(c, M, 1042 * u, W - M * 2, 0.08);
  t(c, 'GUARDRAILS', M, 1100 * u, { size: 15 * u, ls: 3.2 * u, col: w(0.32) });
  [['Nothing sends without approval', 'enforced in the tool layer'],
   ['Every answer cites the record', '6 of 6 citations resolved'],
   ['Evaluated nightly', '214 cases · 98.6% pass']].forEach(([head, sub], i) => {
    const x = M + 210 * u + i * 440 * u;
    c.beginPath(); c.arc(x + 7 * u, 1093 * u, 6 * u, 0, 7);
    c.fillStyle = w(0.6); c.fill();
    t(c, head, x + 26 * u, 1100 * u, { size: 19 * u, col: w(0.66) });
    t(c, sub, x + 26 * u, 1130 * u, { size: 16 * u, col: w(0.28) });
  });
  return cv;
}

const SCREENS = { code, web, dash, app, flow, ai };

export { SCREENS };

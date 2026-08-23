/* =============================================================================
   Screen artwork.

   Painted on a 2D canvas so it goes through the same post-processing grade as
   the concrete around it — a CSS3D overlay could not. Everything here is real
   copy in the real typefaces, because a screen full of grey placeholder bars
   reads as a mockup, and the point of the chapter is that we ship the thing.

   Drop-in override: put a PNG/JPG at assets/screens/<key>.(png|jpg) and it is
   used instead of the painted version — same keys as SCREENS below.
   ========================================================================== */

const SANS = '"Inter V", -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
const SERIF = '"Cormorant V", "Cormorant Garamond", Georgia, serif';

const w = (a) => `rgba(255,255,255,${a})`;

function rr(c, x, y, wd, ht, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + wd, y, x + wd, y + ht, r);
  c.arcTo(x + wd, y + ht, x, y + ht, r);
  c.arcTo(x, y + ht, x, y, r);
  c.arcTo(x, y, x + wd, y, r);
  c.closePath();
}
function fill(c, x, y, wd, ht, r, col) { rr(c, x, y, wd, ht, r); c.fillStyle = col; c.fill(); }
function stroke(c, x, y, wd, ht, r, col, lw) {
  rr(c, x, y, wd, ht, r); c.strokeStyle = col; c.lineWidth = lw || 1.5; c.stroke();
}

/* One text call with the options actually used, so the painters stay readable. */
function t(c, s, x, y, o) {
  o = o || {};
  const weight = o.weight || 300;
  const size = o.size || 24;
  c.font = `${weight} ${size}px ${o.serif ? SERIF : SANS}`;
  c.letterSpacing = (o.ls || 0) + 'px';
  c.textAlign = o.align || 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = o.col || w(0.92);
  c.fillText(o.caps ? s.toUpperCase() : s, x, y);
  c.letterSpacing = '0px';
  c.textAlign = 'left';
}

function canvas2d(W, H, bg) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = bg || '#08080a'; c.fillRect(0, 0, W, H);
  return { cv, c };
}

/* --------------------------------------------------------------- painters */

const SCREENS = {

  /* ------------------------------------------------- 01 · custom software */
  code(W, H) {
    const { cv, c } = canvas2d(W, H, '#0a0a0c');
    const u = W / 2048;

    /* window chrome */
    fill(c, 0, 0, W, 64 * u, 0, '#131316');
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
      c.beginPath(); c.arc((44 + i * 34) * u, 32 * u, 8 * u, 0, 7);
      c.fillStyle = col; c.fill();
    });
    t(c, 'ledger-service — src/billing/reconcile.ts', W / 2, 40 * u,
      { size: 22 * u, col: w(0.4), align: 'center' });

    /* file tree */
    fill(c, 0, 64 * u, 400 * u, H, 0, '#0d0d10');
    t(c, 'LEDGER-SERVICE', 40 * u, 120 * u, { size: 18 * u, ls: 2.4 * u, col: w(0.38) });
    const tree = [
      ['src', 0, 0], ['api', 1, 0], ['billing', 1, 0], ['reconcile.ts', 2, 1],
      ['invoice.ts', 2, 0], ['ledger.ts', 2, 0], ['db', 1, 0],
      ['migrations', 2, 0], ['schema.sql', 2, 0], ['tests', 0, 0],
      ['reconcile.spec.ts', 1, 0], ['infra', 0, 0], ['deploy.yml', 1, 0],
    ];
    tree.forEach(([name, depth, on], i) => {
      const y = (180 + i * 46) * u;
      if (on) fill(c, 24 * u, y - 26 * u, 352 * u, 40 * u, 8 * u, w(0.07));
      t(c, name, (52 + depth * 30) * u, y, { size: 23 * u, col: w(on ? 0.9 : 0.44) });
    });

    /* code */
    const code = [
      [[' async function ', 0.42], ['reconcile', 0.95], ['(period: Period) {', 0.6]],
      [['  const ledger = ', 0.6], ['await', 0.42], [' db.ledger.forPeriod(period)', 0.78]],
      [['  const charges = ', 0.6], ['await', 0.42], [' stripe.charges.list({ period })', 0.78]],
      [],
      [['  const drift = ', 0.6], ['diff', 0.95], ['(ledger, charges)', 0.78]],
      [['  if', 0.42], [' (drift.total === 0) ', 0.6], ['return', 0.42], [' ok(period)', 0.78]],
      [],
      [['  await', 0.42], [' notify(', 0.6], ['"finance"', 0.86], [', drift)', 0.6]],
      [['  return', 0.42], [' flagged(period, drift)', 0.78]],
      [['}', 0.6]],
      [],
      [['// 214 periods reconciled · 0 manual corrections', 0.34]],
    ];
    code.forEach((line, i) => {
      const y = (200 + i * 62) * u;
      t(c, String(i + 1).padStart(2, ' '), 470 * u, y, { size: 24 * u, col: w(0.2) });
      let x = 540 * u;
      line.forEach(([frag, a]) => {
        t(c, frag, x, y, { size: 27 * u, col: w(a) });
        c.font = `300 ${27 * u}px ${SANS}`;
        x += c.measureText(frag).width;
      });
    });

    /* terminal strip */
    fill(c, 470 * u, H - 190 * u, W - 530 * u, 150 * u, 12 * u, '#0e0e11');
    t(c, 'PASS  tests/reconcile.spec.ts  ·  38 passing  ·  1.9s',
      506 * u, H - 132 * u, { size: 24 * u, col: w(0.66) });
    t(c, 'deploy  main@8f21c4  →  production  ·  ok',
      506 * u, H - 78 * u, { size: 24 * u, col: w(0.4) });
    return cv;
  },

  /* ---------------------------------------------------- 02 · web platforms */
  web(W, H) {
    const { cv, c } = canvas2d(W, H, '#08080a');
    const u = W / 2048;

    /* browser chrome */
    fill(c, 0, 0, W, 96 * u, 0, '#141417');
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
      c.beginPath(); c.arc((48 + i * 36) * u, 48 * u, 9 * u, 0, 7);
      c.fillStyle = col; c.fill();
    });
    fill(c, 230 * u, 24 * u, 700 * u, 48 * u, 24 * u, '#0b0b0d');
    t(c, 'acmemeridian.com', 268 * u, 56 * u, { size: 25 * u, col: w(0.62) });

    /* site nav */
    t(c, 'ACME MERIDIAN', 120 * u, 200 * u, { size: 30 * u, ls: 6 * u, col: w(0.95), serif: true });
    ['Capabilities', 'How we work', 'Contact'].forEach((s, i) => {
      t(c, s, (1290 + i * 250) * u, 200 * u, { size: 24 * u, col: w(0.5) });
    });
    fill(c, 120 * u, 250 * u, W - 240 * u, 1 * u, 0, w(0.1));

    /* hero */
    t(c, '— SOFTWARE · WORLDWIDE', 120 * u, 400 * u, { size: 22 * u, ls: 7 * u, col: w(0.42) });
    t(c, 'We build the software', 120 * u, 560 * u, { size: 116 * u, col: w(0.97), serif: true });
    t(c, 'your business runs on.', 120 * u, 690 * u, { size: 116 * u, col: w(0.97), serif: true });
    t(c, 'Design, engineering and deployment under one roof —', 120 * u, 790 * u,
      { size: 30 * u, col: w(0.56) });
    t(c, 'with one team accountable for the result.', 120 * u, 840 * u,
      { size: 30 * u, col: w(0.56) });

    fill(c, 120 * u, 900 * u, 300 * u, 78 * u, 39 * u, w(0.8));
    t(c, 'Start a project', 270 * u, 948 * u, { size: 26 * u, col: '#0b0b0d', align: 'center' });
    stroke(c, 450 * u, 900 * u, 250 * u, 78 * u, 39 * u, w(0.22), 2 * u);
    t(c, 'What we do', 575 * u, 948 * u, { size: 26 * u, col: w(0.8), align: 'center' });

    /* proof strip */
    fill(c, 0, H - 220 * u, W, 1 * u, 0, w(0.08));
    ['Swift', 'TypeScript', 'React', 'Next.js', 'PostgreSQL', 'Cloudflare', 'AWS', 'Stripe']
      .forEach((s, i) => {
        t(c, s, (120 + i * 235) * u, H - 130 * u, { size: 24 * u, ls: 3 * u, col: w(0.3), caps: true });
      });
    return cv;
  },

  /* ----------------------------------------------------- 03 · saas products */
  dash(W, H) {
    const { cv, c } = canvas2d(W, H, '#08080a');
    const u = W / 2048;

    fill(c, 0, 0, 340 * u, H, 0, '#0c0c0f');
    t(c, 'ACME', 60 * u, 100 * u, { size: 26 * u, ls: 6 * u, col: w(0.9), serif: true });
    ['Overview', 'Revenue', 'Customers', 'Usage', 'Billing', 'Settings'].forEach((s, i) => {
      const y = (200 + i * 68) * u;
      if (i === 1) fill(c, 30 * u, y - 40 * u, 280 * u, 56 * u, 10 * u, w(0.08));
      t(c, s, 60 * u, y, { size: 25 * u, col: w(i === 1 ? 0.92 : 0.44) });
    });

    t(c, 'Revenue', 420 * u, 120 * u, { size: 48 * u, col: w(0.95), serif: true });
    t(c, 'Last 12 months · all plans', 420 * u, 166 * u, { size: 24 * u, col: w(0.42) });

    /* stat tiles */
    const stats = [['MRR', '$48,240', '+12.4%'], ['Accounts', '1,908', '+86'],
                   ['Churn', '1.7%', '−0.4pt'], ['ARPA', '$25.28', '+3.1%']];
    stats.forEach(([label, value, delta], i) => {
      const x = (420 + i * 390) * u;
      stroke(c, x, 210 * u, 350 * u, 170 * u, 14 * u, w(0.09), 2 * u);
      t(c, label, x + 32 * u, 268 * u, { size: 22 * u, ls: 3 * u, col: w(0.4), caps: true });
      t(c, value, x + 32 * u, 330 * u, { size: 46 * u, col: w(0.95) });
      t(c, delta, x + 250 * u, 330 * u, { size: 22 * u, col: w(0.55) });
    });

    /* chart */
    const cx = 420 * u, cy = 460 * u, cw = W - 500 * u, ch = 420 * u;
    for (let i = 0; i <= 4; i++) {
      const y = cy + (ch / 4) * i;
      fill(c, cx, y, cw, 1 * u, 0, w(0.06));
      t(c, ['60k', '45k', '30k', '15k', '0'][i], cx - 20 * u, y + 8 * u,
        { size: 20 * u, col: w(0.28), align: 'right' });
    }
    const series = [.28, .34, .31, .42, .46, .44, .55, .6, .58, .69, .78, .84];
    const bw = cw / series.length;
    series.forEach((v, i) => {
      const bh = ch * v;
      fill(c, cx + i * bw + bw * 0.24, cy + ch - bh, bw * 0.52, bh, 6 * u,
        w(i === series.length - 1 ? 0.9 : 0.3));
    });
    ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].forEach((s, i) => {
      t(c, s, cx + i * bw + bw / 2, cy + ch + 44 * u, { size: 21 * u, col: w(0.3), align: 'center' });
    });

    /* table */
    const rows = [['Northwind Ltd', 'Scale', '$4,800'], ['Fjord Systems', 'Team', '$1,200'],
                  ['Kestrel Labs', 'Scale', '$4,800']];
    t(c, 'Largest accounts', 420 * u, cy + ch + 130 * u, { size: 26 * u, col: w(0.72) });
    rows.forEach(([a, b, d], i) => {
      const y = cy + ch + (190 + i * 56) * u;
      fill(c, 420 * u, y + 18 * u, cw, 1 * u, 0, w(0.06));
      t(c, a, 420 * u, y, { size: 24 * u, col: w(0.8) });
      t(c, b, 900 * u, y, { size: 24 * u, col: w(0.44) });
      t(c, d, 420 * u + cw, y, { size: 24 * u, col: w(0.8), align: 'right' });
    });
    return cv;
  },

  /* ------------------------------------------------ 04 · mobile applications */
  app(W, H) {
    const { cv, c } = canvas2d(W, H, '#08080a');
    const u = W / 780;

    t(c, '9:41', 60 * u, 74 * u, { size: 26 * u, weight: 500, col: w(0.95) });
    t(c, '5G', 640 * u, 74 * u, { size: 24 * u, col: w(0.75) });
    fill(c, 690 * u, 56 * u, 42 * u, 20 * u, 5 * u, w(0.75));

    t(c, 'Today', 60 * u, 240 * u, { size: 74 * u, col: w(0.97), serif: true });
    t(c, 'Thursday 23 · 4 of 6 done', 60 * u, 292 * u, { size: 26 * u, col: w(0.44) });

    fill(c, 60 * u, 330 * u, 660 * u, 6 * u, 3 * u, w(0.12));
    fill(c, 60 * u, 330 * u, 440 * u, 6 * u, 3 * u, w(0.9));

    const items = [
      ['Morning run', '5.2 km · 26:41', 1],
      ['Deep work', '2 h focus block', 1],
      ['Read', '20 pages', 1],
      ['Language', '15 min · Spanish', 1],
      ['Strength', 'Push · 45 min', 0],
      ['Journal', 'Evening entry', 0],
    ];
    items.forEach(([title, sub, done], i) => {
      const y = (400 + i * 132) * u;
      fill(c, 60 * u, y, 660 * u, 112 * u, 22 * u, w(0.045));
      c.beginPath();
      c.arc(126 * u, y + 56 * u, 26 * u, 0, 7);
      if (done) { c.fillStyle = w(0.92); c.fill(); }
      else { c.strokeStyle = w(0.22); c.lineWidth = 3 * u; c.stroke(); }
      if (done) {
        c.beginPath();
        c.moveTo(114 * u, y + 56 * u); c.lineTo(123 * u, y + 66 * u); c.lineTo(139 * u, y + 46 * u);
        c.strokeStyle = '#08080a'; c.lineWidth = 5 * u; c.lineCap = 'round'; c.stroke();
      }
      t(c, title, 180 * u, y + 50 * u, { size: 30 * u, col: w(done ? 0.55 : 0.95) });
      t(c, sub, 180 * u, y + 88 * u, { size: 24 * u, col: w(0.38) });
    });

    /* tab bar */
    fill(c, 0, H - 170 * u, W, 1 * u, 0, w(0.09));
    ['Today', 'Goals', 'Stats', 'You'].forEach((s, i) => {
      const x = (98 + i * 195) * u;
      fill(c, x - 22 * u, H - 128 * u, 44 * u, 44 * u, 12 * u, w(i === 0 ? 0.85 : 0.2));
      t(c, s, x, H - 62 * u, { size: 22 * u, col: w(i === 0 ? 0.9 : 0.35), align: 'center' });
    });
    return cv;
  },

  /* ------------------------------------------- 05 · business digitalization */
  flow(W, H) {
    const { cv, c } = canvas2d(W, H, '#08080a');
    const u = W / 1600;

    t(c, 'Job board', 70 * u, 100 * u, { size: 46 * u, col: w(0.95), serif: true });
    t(c, 'Replaced: 3 spreadsheets, 1 shared inbox, 1 whiteboard',
      70 * u, 146 * u, { size: 23 * u, col: w(0.42) });

    const cols = [
      ['Intake', [['Bathroom refit', 'Booked · Tue 9:00'], ['Roof survey', 'Awaiting deposit'],
                  ['Kitchen quote', 'New — 2 min ago']]],
      ['Scheduled', [['Loft insulation', 'Crew B · Wed'], ['Boiler service', 'Crew A · Thu']]],
      ['Invoiced', [['Deck rebuild', '£4,120 · paid'], ['Fence run', '£880 · due 7d'],
                    ['Patio', '£2,340 · paid']]],
    ];
    cols.forEach(([title, cards], i) => {
      const x = (70 + i * 500) * u;
      t(c, title, x, 240 * u, { size: 22 * u, ls: 4 * u, col: w(0.44), caps: true });
      t(c, String(cards.length), x + 440 * u, 240 * u,
        { size: 22 * u, col: w(0.3), align: 'right' });
      fill(c, x, 264 * u, 450 * u, 1 * u, 0, w(0.1));
      cards.forEach(([name, meta], j) => {
        const y = (300 + j * 150) * u;
        fill(c, x, y, 450 * u, 122 * u, 16 * u, w(0.05));
        fill(c, x, y, 4 * u, 122 * u, 2 * u, w(i === 2 ? 0.5 : 0.22));
        t(c, name, x + 34 * u, y + 52 * u, { size: 28 * u, col: w(0.92) });
        t(c, meta, x + 34 * u, y + 90 * u, { size: 23 * u, col: w(0.4) });
      });
    });

    /* automation footer */
    fill(c, 70 * u, H - 200 * u, W - 140 * u, 1 * u, 0, w(0.08));
    t(c, 'Automations running', 70 * u, H - 140 * u, { size: 22 * u, ls: 4 * u, col: w(0.4), caps: true });
    ['Quote accepted → job created', 'Job done → invoice sent', 'Invoice 7d overdue → reminder']
      .forEach((s, i) => {
        t(c, '·  ' + s, (70 + i * 500) * u, H - 88 * u, { size: 24 * u, col: w(0.62) });
      });
    return cv;
  },

  /* ------------------------------------------------- 06 · AI & automation */
  ai(W, H) {
    const { cv, c } = canvas2d(W, H, '#08080a');
    const u = W / 1600;

    t(c, 'Operations assistant', 70 * u, 100 * u, { size: 44 * u, col: w(0.95), serif: true });
    t(c, 'Connected to: invoices · CRM · inventory', 70 * u, 144 * u, { size: 23 * u, col: w(0.42) });
    fill(c, 70 * u, 180 * u, W - 140 * u, 1 * u, 0, w(0.09));

    const msgs = [
      [1, 'Which invoices are overdue by more than 14 days?'],
      [0, 'Six, totalling £18,430. Four are the same customer — Kestrel Labs,\nwhose payment terms changed in March. Want me to draft the chase?'],
      [1, 'Yes, and flag the terms change to finance.'],
      [0, 'Drafted six emails and opened a note for finance. Nothing sent yet —\nreview them below.'],
    ];
    let y = 250 * u;
    msgs.forEach(([me, text]) => {
      const lines = text.split('\n');
      const h = 44 * u + lines.length * 42 * u;
      const wd = Math.min(980 * u, 60 * u + Math.max(...lines.map((l) => {
        c.font = `300 ${28 * u}px ${SANS}`; return c.measureText(l).width;
      })));
      const x = me ? W - 70 * u - wd : 70 * u;
      fill(c, x, y, wd, h, 20 * u, w(me ? 0.1 : 0.045));
      lines.forEach((l, k) => {
        t(c, l, x + 30 * u, y + (58 + k * 42) * u, { size: 28 * u, col: w(me ? 0.92 : 0.8) });
      });
      y += h + 30 * u;
    });

    /* the guardrails are the product — say so on the screen */
    y += 10 * u;
    fill(c, 70 * u, y, W - 140 * u, 1 * u, 0, w(0.09));
    t(c, 'Guardrails', 70 * u, y + 54 * u, { size: 22 * u, ls: 4 * u, col: w(0.4), caps: true });
    [['Nothing sends without approval', 1], ['Answers cite the source record', 1],
     ['Evaluated nightly · 214 cases', 1]].forEach(([s], i) => {
      const gx = (70 + i * 500) * u;
      c.beginPath(); c.arc(gx + 12 * u, y + 100 * u, 8 * u, 0, 7);
      c.fillStyle = w(0.75); c.fill();
      t(c, s, gx + 34 * u, y + 110 * u, { size: 24 * u, col: w(0.62) });
    });
    return cv;
  },
};

export { SCREENS };

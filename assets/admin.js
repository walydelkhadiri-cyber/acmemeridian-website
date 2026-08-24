/* =============================================================================
   ACME MERIDIAN — /admin/
   Reading and triaging project briefs. No framework, no build, no WebGL: this
   is a tool, and the only thing it owes anyone is being fast and clear.

   Auth is Supabase Auth over plain fetch rather than the JS client — the whole
   surface used here is three POSTs, and vendoring 40 KB to make them would be
   the wrong trade on a site that ships no dependencies anywhere else.

   The refresh token is kept in localStorage so a daily check-in does not mean
   a daily login; the access token is short-lived and held in memory only. Sign
   out clears both and revokes the session server-side.
   ========================================================================== */
import { SUPABASE_URL, ANON_KEY, API } from './config.js';

const $ = (s) => document.querySelector(s);
const gate = $('#gate'), body = $('#body'), detail = $('#detail'), statusEl = $('#status');
const listEl = $('#list'), emptyEl = $('#empty'), countEl = $('#count');

const STORE = 'meridian:adm:rt';
let access = '';          /* in memory only */
let expiresAt = 0;
let briefs = [];
let filter = 'all';

/* ------------------------------------------------------------------- auth */

const authFetch = (path, body) =>
  fetch(SUPABASE_URL + '/auth/v1/' + path, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

function keepSession(j) {
  access = j.access_token || '';
  /* refresh a minute early rather than discovering expiry mid-request */
  expiresAt = Date.now() + Math.max(0, (j.expires_in || 3600) - 60) * 1000;
  try {
    if (j.refresh_token) localStorage.setItem(STORE, j.refresh_token);
  } catch (e) { /* private mode: the session simply ends with the tab */ }
}

async function signIn(email, password) {
  const r = await authFetch('token?grant_type=password', { email, password });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.msg || 'Wrong email or password.');
  keepSession(j);
}

async function resume() {
  let rt = null;
  try { rt = localStorage.getItem(STORE); } catch (e) { /* ignore */ }
  if (!rt) return false;
  const r = await authFetch('token?grant_type=refresh_token', { refresh_token: rt });
  if (!r.ok) { forget(false); return false; }
  keepSession(await r.json());
  return true;
}

/* Called before every request. A token that is about to expire is renewed
   rather than allowed to fail a request the user is watching. */
async function fresh() {
  if (access && Date.now() < expiresAt) return true;
  return resume();
}

async function forget(revoke = true) {
  if (revoke && access) {
    /* best effort — a dead network must not trap someone signed in */
    try {
      await fetch(SUPABASE_URL + '/auth/v1/logout', {
        method: 'POST',
        headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + access },
      });
    } catch (e) { /* ignore */ }
  }
  access = ''; expiresAt = 0;
  try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
  location.hash = '';
  show(gate);
}

$('#signout').addEventListener('click', () => forget());

function wantedBrief() {
  return new URLSearchParams(location.hash.slice(1)).get('b');
}

/* ------------------------------------------------------------------- api */

async function api(path, opts = {}) {
  if (!(await fresh())) { forget(false); throw new Error('unauthorized'); }
  const r = await fetch(API + '/admin' + path, {
    ...opts,
    headers: { Authorization: 'Bearer ' + access, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (r.status === 401) { forget(false); throw new Error('unauthorized'); }
  if (r.status === 403) {
    /* signed in, but not an admin — say so plainly instead of looping the login */
    forget();
    $('#gate-err').textContent = 'That account is not allowed in here.';
    $('#gate-err').className = 'status on bad';
    throw new Error('unauthorized');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'request failed');
  return j;
}

function say(msg, bad) {
  statusEl.textContent = msg || '';
  statusEl.className = 'status' + (msg ? ' on' : '') + (bad ? ' bad' : '');
}

function show(which) {
  for (const el of [gate, body, detail]) el.hidden = el !== which;
}

/* ------------------------------------------------------------------ list */

const fmtDate = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? 'Today ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

function render() {
  const rows = briefs.filter((b) => filter === 'all' || b.status === filter);
  listEl.innerHTML = '';
  emptyEl.hidden = rows.length > 0;

  for (const b of rows) {
    const li = document.createElement('li');
    li.className = 'adm-row' + (b.status === 'new' ? ' is-new' : '');
    li.tabIndex = 0;
    li.dataset.id = b.id;
    li.innerHTML = `
      <p class="adm-when">${fmtDate(b.created_at)}</p>
      <div class="adm-who">
        <h3>${esc(b.title)}</h3>
        <p>${esc(b.name)}${b.company ? ' · ' + esc(b.company) : ''}</p>
      </div>
      <p class="adm-tags">${(b.wants || []).slice(0, 3).map(esc).join(' · ') || '—'}</p>
      <p class="adm-money">${esc(b.budget || '—')}</p>
      <p class="adm-state" data-s="${b.status}">${b.status}</p>`;
    const open = () => openBrief(b.id);
    li.addEventListener('click', open);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
    listEl.appendChild(li);
  }

  const n = briefs.filter((b) => b.status === 'new').length;
  countEl.textContent = briefs.length
    ? `${briefs.length} brief${briefs.length === 1 ? '' : 's'}${n ? `, ${n} new` : ''}`
    : 'No briefs yet';
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

for (const r of document.querySelectorAll('#filters input')) {
  r.addEventListener('change', () => { filter = r.value; render(); });
}
$('#refresh').addEventListener('click', () => load(true));

async function load(loud) {
  if (loud) say('Loading…');
  try {
    const j = await api('?list');
    briefs = j.briefs || [];
    render();
    show(body);
    say('');
  } catch (e) {
    if (e.message !== 'unauthorized') say('Could not load briefs — ' + e.message, true);
  }
}

/* ---------------------------------------------------------------- detail */

async function openBrief(id) {
  say('');
  let b;
  try { b = (await api('?id=' + encodeURIComponent(id))).brief; }
  catch (e) { if (e.message !== 'unauthorized') say('Could not open that brief.', true); return; }

  /* Opening it is reading it — no reason to make that a second click. */
  if (b.status === 'new') { patch(id, { status: 'read' }); b.status = 'read'; }

  const field = (k, v) => v
    ? `<div class="adm-f"><dt>${k}</dt><dd>${esc(v)}</dd></div>` : '';
  const subject = `Re: ${b.title}`;
  /* the address goes in raw — percent-encoding the @ is legal but some mail
     clients show it back to you literally */
  const mailto = `mailto:${b.email}?subject=${encodeURIComponent(subject)}`;

  detail.innerHTML = `
    <button class="btn adm-backbtn" type="button" id="back"><span>&larr; All briefs</span></button>

    <p class="eyebrow">${fmtDate(b.created_at)} &middot; ${esc(b.status)}</p>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.name)}${b.company ? ' · ' + esc(b.company) : ''}<br>
      <a href="${mailto}">${esc(b.email)}</a></p>

    <dl class="adm-fields">
      ${field('Wants built', (b.wants || []).join(', '))}
      ${field('Budget', b.budget)}
      ${field('Timeline', b.timeline)}
      ${field('Stage', b.stage)}
      ${field('For', b.for_who)}
      ${field('Where', b.country)}
      ${field('Links', b.links)}
    </dl>

    <p class="eyebrow">The brief</p>
    <div class="adm-detailtext">${esc(b.detail)}</div>

    <div class="field adm-notes">
      <label for="notes">Your notes</label>
      <textarea id="notes" rows="4" placeholder="Only you see this.">${esc(b.notes || '')}</textarea>
      <p class="hint" id="notesaved">Saves as you stop typing.</p>
    </div>

    <div class="adm-actions">
      <a class="btn solid" href="${mailto}"><span>Reply</span></a>
      <div class="choices">
        ${['new', 'read', 'replied', 'archived'].map((s) => `
          <label class="choice"><input type="radio" name="st" value="${s}"${b.status === s ? ' checked' : ''}><span>${s}</span></label>`).join('')}
      </div>
    </div>`;

  show(detail);
  scrollTo({ top: 0 });

  $('#back').addEventListener('click', () => { location.hash = ''; show(body); });

  for (const r of detail.querySelectorAll('input[name=st]')) {
    r.addEventListener('change', () => patch(id, { status: r.value }));
  }

  let t;
  const notes = $('#notes');
  notes.addEventListener('input', () => {
    clearTimeout(t);
    $('#notesaved').textContent = 'Unsaved…';
    t = setTimeout(async () => {
      await patch(id, { notes: notes.value });
      $('#notesaved').textContent = 'Saved.';
    }, 700);
  });
}

async function patch(id, body) {
  try {
    const j = await api('', { method: 'POST', body: JSON.stringify({ id, ...body }) });
    const i = briefs.findIndex((b) => b.id === id);
    if (i > -1) { briefs[i] = { ...briefs[i], ...j.brief }; render(); }
  } catch (e) {
    if (e.message !== 'unauthorized') say('That change did not save — ' + e.message, true);
  }
}

/* ------------------------------------------------------------------ boot */

const form = $('#signin'), goBtn = $('#go'), gateErr = $('#gate-err');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#email').value.trim();
  const password = $('#pw').value;
  if (!email || !password) return;

  goBtn.disabled = true;
  goBtn.querySelector('span').textContent = 'Signing in…';
  gateErr.className = 'status';

  try {
    await signIn(email, password);
    $('#pw').value = '';
    await start();
  } catch (err) {
    gateErr.textContent = err.message;
    gateErr.className = 'status on bad';
  } finally {
    goBtn.disabled = false;
    goBtn.querySelector('span').textContent = 'Sign in';
  }
});

async function start() {
  if (!access) { show(gate); $('#email').focus(); return; }
  await load(false);
  const want = wantedBrief();
  if (want && !body.hidden) openBrief(want);
}

/* A stored refresh token means the last session can be picked back up without
   asking again. Anything else lands on the form. */
resume().then(start);

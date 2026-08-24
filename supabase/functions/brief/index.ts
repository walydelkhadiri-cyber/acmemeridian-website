/* =============================================================================
   POST /functions/v1/brief
   The only way a project brief gets in. Public by design — the form is on a
   static page and has no session — so everything that protects the table lives
   here: an origin allow-list, length caps, a honeypot, and a per-source rate
   limit computed from a salted hash rather than a stored IP.

   The insert is what matters. Mail is a notification on top of it: if Resend is
   down the brief is still safely in the table and the caller is still told it
   worked, because it did. Losing a lead to a mail provider outage would be the
   worst possible failure here.
   ========================================================================== */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const SITE = 'https://acmemeridian.com';

/* Long enough that the visitor is never cut off mid-thought, short enough that
   the table cannot be used as free storage. */
const CAP = {
  name: 120, email: 200, company: 160, country: 120, for_who: 60,
  title: 200, stage: 80, detail: 8000, timeline: 60, budget: 60, links: 600,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

async function sha256(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function clean(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, origin);

  /* Two shapes arrive here. The form posts JSON when JS is running; when it is
     not, the browser posts the form natively and expects a page back, not a
     payload — so that path is answered with a redirect to the same screen the
     scripted one shows. */
  const ct = req.headers.get('content-type') ?? '';
  const native = ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data');

  let body: Record<string, unknown>;
  if (native) {
    const fd = await req.formData();
    const o: Record<string, unknown> = {};
    for (const k of new Set([...fd.keys()])) {
      const all = fd.getAll(k).map(String);
      o[k] = all.length > 1 ? all : all[0];
    }
    body = o;
  } else {
    try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400, origin); }
  }

  const back = (q: string) =>
    new Response(null, { status: 303, headers: { Location: `${SITE}/start/?${q}` } });

  /* A bot fills the hidden field. Answer 200 so it learns nothing from the
     difference between a rejection and a success. */
  if (clean(body._honey, 10)) return native ? back('sent=1') : json({ ok: true }, 200, origin);

  /* The form's own field names differ from the column names in a few places
     (it is written for a reader, not for a schema). Normalise once, here. */
  body.for_who ??= body.forwho;
  body.wants ??= body.build;
  if (typeof body.wants === 'string') body.wants = [body.wants];

  const b = {
    name: clean(body.name, CAP.name),
    email: clean(body.email, CAP.email),
    company: clean(body.company, CAP.company) || null,
    country: clean(body.country, CAP.country) || null,
    for_who: clean(body.for_who, CAP.for_who) || null,
    title: clean(body.title, CAP.title),
    wants: Array.isArray(body.wants)
      ? body.wants.filter((w) => typeof w === 'string').slice(0, 12).map((w) => (w as string).slice(0, 80))
      : [],
    stage: clean(body.stage, CAP.stage) || null,
    detail: clean(body.detail, CAP.detail),
    timeline: clean(body.timeline, CAP.timeline) || null,
    budget: clean(body.budget, CAP.budget) || null,
    links: clean(body.links, CAP.links) || null,
  };

  /* The same rules the form enforces in the browser, enforced again here —
     client-side validation is a courtesy, not a control. */
  const bad: string[] = [];
  if (b.name.length < 2) bad.push('name');
  if (!EMAIL_RE.test(b.email)) bad.push('email');
  if (b.title.length < 2) bad.push('title');
  if (b.detail.length < 20) bad.push('detail');
  if (bad.length) {
    return native ? back('err=invalid') : json({ error: 'invalid', fields: bad }, 422, origin);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const ip_hash = ip ? await sha256(ip + (Deno.env.get('IP_SALT') ?? 'meridian')) : null;

  if (ip_hash) {
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await admin.from('briefs')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ip_hash).gte('created_at', since);
    if ((count ?? 0) >= 3) {
      return native ? back('err=rate')
        : json({ error: 'rate', message: 'Too many briefs from here just now.' }, 429, origin);
    }
  }

  const { data, error } = await admin.from('briefs').insert({
    ...b,
    ip_hash,
    user_agent: (req.headers.get('user-agent') ?? '').slice(0, 400) || null,
    referrer: (req.headers.get('referer') ?? '').slice(0, 400) || null,
  }).select('id, created_at').single();

  if (error) {
    console.error('insert failed', error);
    return native ? back('err=store')
      : json({ error: 'store', message: 'Could not save the brief.' }, 500, origin);
  }

  /* --------------------------------------------------------------- notify */
  /* The admin page is behind a login, so the notification can link to it
     openly — there is no key to leak in an email. */
  const link = `${SITE}/admin/#b=${data.id}`;
  const row = (k: string, v: string | null) =>
    `<tr><td style="padding:6px 18px 6px 0;color:#888;font:400 12px/1.6 -apple-system,Helvetica,Arial,sans-serif;white-space:nowrap;vertical-align:top">${k}</td>
         <td style="padding:6px 0;color:#111;font:400 14px/1.6 -apple-system,Helvetica,Arial,sans-serif">${esc(v || '—')}</td></tr>`;

  const html = `
<div style="max-width:640px;margin:0 auto;padding:32px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif">
  <p style="margin:0 0 6px;font:400 11px/1 -apple-system,Helvetica,Arial,sans-serif;letter-spacing:.28em;text-transform:uppercase;color:#999">New project brief</p>
  <h1 style="margin:0 0 4px;font:400 26px/1.25 Georgia,serif;color:#111">${esc(b.title)}</h1>
  <p style="margin:0 0 26px;font:400 14px/1.6 -apple-system,Helvetica,Arial,sans-serif;color:#666">
    ${esc(b.name)}${b.company ? ' · ' + esc(b.company) : ''} &lt;${esc(b.email)}&gt;
  </p>

  <table style="border-collapse:collapse;width:100%;border-top:1px solid #e5e5e5;padding-top:12px">
    ${row('Wants built', b.wants.join(', '))}
    ${row('Budget', b.budget)}
    ${row('Timeline', b.timeline)}
    ${row('Stage', b.stage)}
    ${row('For', b.for_who)}
    ${row('Where', b.country)}
    ${row('Links', b.links)}
  </table>

  <p style="margin:26px 0 8px;font:400 11px/1 -apple-system,Helvetica,Arial,sans-serif;letter-spacing:.28em;text-transform:uppercase;color:#999">The brief</p>
  <div style="white-space:pre-wrap;font:400 15px/1.7 -apple-system,Helvetica,Arial,sans-serif;color:#111;border-left:2px solid #e5e5e5;padding-left:16px">${esc(b.detail)}</div>

  <p style="margin:32px 0 0">
    <a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:13px 22px;border-radius:100px;font:400 12px/1 -apple-system,Helvetica,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase">Open in admin</a>
  </p>
  <p style="margin:18px 0 0;font:400 12px/1.7 -apple-system,Helvetica,Arial,sans-serif;color:#999">
    Reply to this email and it goes straight to ${esc(b.name)}.
  </p>
</div>`;

  const key = Deno.env.get('RESEND_API_KEY');
  let mailed = false;
  if (key) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: Deno.env.get('MAIL_FROM') ?? 'Acme Meridian <briefs@acmemeridian.com>',
          to: [Deno.env.get('MAIL_TO') ?? 'walyd@acmemeridian.com'],
          reply_to: b.email,
          subject: `New brief — ${b.title} — ${b.name}`,
          html,
        }),
      });
      mailed = r.ok;
      if (!r.ok) console.error('resend refused', r.status, await r.text());
    } catch (e) {
      console.error('resend threw', e);
    }
  } else {
    console.warn('RESEND_API_KEY not set — brief stored, no mail sent');
  }

  /* Stored is success. The mail flag is for the logs, not for the visitor. */
  return native ? back('sent=1') : json({ ok: true, id: data.id, mailed }, 200, origin);
});

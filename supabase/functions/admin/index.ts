/* =============================================================================
   /functions/v1/admin
   Reading and triaging briefs. The door is Supabase Auth: the page signs in
   with an email and password, gets a JWT, and sends it here. This function
   verifies the JWT against the project and then checks one more thing — that
   the user carries `role: admin` in app_metadata.

   That second check is the one that matters. A verified JWT only proves
   somebody is *a* user; app_metadata is writable only by the service role, so
   it is the one claim a user cannot grant themselves. Public sign-up is off as
   well, but authorization should not depend on a setting somewhere else being
   right.

     GET  ?list                    → the table, newest first
     GET  ?id=<uuid>               → one brief in full
     POST {id, status?, notes?}    → triage it
   ========================================================================== */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const LIST_COLS = 'id, created_at, name, email, company, title, wants, budget, timeline, status';
const STATUSES = new Set(['new', 'read', 'replied', 'archived']);

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'unauthorized' }, 401, origin);

  /* Verified with the anon key: getUser asks the auth server whether this token
     is real and current, so a revoked session stops working immediately. */
  const auth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { persistSession: false } },
  );
  const { data: { user }, error: authErr } = await auth.auth.getUser(jwt);
  if (authErr || !user) return json({ error: 'unauthorized' }, 401, origin);
  if (user.app_metadata?.role !== 'admin') {
    console.warn('non-admin user reached admin fn', user.id);
    return json({ error: 'forbidden' }, 403, origin);
  }

  /* Only past both checks do we pick up the key that can read the table. */
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const id = url.searchParams.get('id');
    if (id) {
      const { data, error } = await db.from('briefs').select('*').eq('id', id).single();
      if (error) return json({ error: 'not found' }, 404, origin);
      return json({ brief: data }, 200, origin);
    }
    const { data, error } = await db.from('briefs')
      .select(LIST_COLS).order('created_at', { ascending: false }).limit(300);
    if (error) return json({ error: 'query' }, 500, origin);
    const counts = { new: 0, read: 0, replied: 0, archived: 0 } as Record<string, number>;
    for (const b of data ?? []) counts[b.status] = (counts[b.status] ?? 0) + 1;
    return json({ briefs: data, counts }, 200, origin);
  }

  if (req.method === 'POST') {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400, origin); }
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return json({ error: 'id required' }, 400, origin);

    const patch: Record<string, unknown> = {};
    if (typeof body.status === 'string') {
      if (!STATUSES.has(body.status)) return json({ error: 'bad status' }, 422, origin);
      patch.status = body.status;
    }
    if (typeof body.notes === 'string') patch.notes = body.notes.slice(0, 4000);
    if (!Object.keys(patch).length) return json({ error: 'nothing to do' }, 400, origin);

    const { data, error } = await db.from('briefs')
      .update(patch).eq('id', id).select(LIST_COLS).single();
    if (error) return json({ error: 'update' }, 500, origin);
    return json({ brief: data }, 200, origin);
  }

  return json({ error: 'method' }, 405, origin);
});

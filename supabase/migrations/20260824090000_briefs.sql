-- =============================================================================
-- Project briefs submitted from https://acmemeridian.com/start/
--
-- Nothing reaches this table from a browser. RLS is on and there are no
-- policies at all, which means anon and authenticated can do nothing here; the
-- only way in or out is an Edge Function using the service role. That is the
-- point: the site is static and public, so the client must never hold a key
-- that can read other people's briefs.
-- =============================================================================

create extension if not exists pgcrypto;

create table if not exists public.briefs (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  -- 01 · who they are
  name         text not null,
  email        text not null,
  company      text,
  country      text,
  for_who      text,

  -- 02 · the project
  title        text not null,
  wants        text[] not null default '{}',
  stage        text,
  detail       text not null,

  -- 03 · shape and timing
  timeline     text,
  budget       text,
  links        text,

  -- our side of it
  status       text not null default 'new'
               check (status in ('new', 'read', 'replied', 'archived')),
  notes        text,

  -- provenance, for spotting abuse. The address itself is never stored: a
  -- salted hash is enough to count submissions from one source and cannot be
  -- turned back into an IP.
  ip_hash      text,
  user_agent   text,
  referrer     text
);

alter table public.briefs enable row level security;

comment on table public.briefs is
  'Project briefs from /start/. Service role only — see the brief and admin Edge Functions.';

create index if not exists briefs_created_at_idx on public.briefs (created_at desc);
create index if not exists briefs_status_idx     on public.briefs (status);
create index if not exists briefs_ip_hash_idx    on public.briefs (ip_hash, created_at desc);

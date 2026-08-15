-- Google tokens are deliberately isolated from client-readable public tables.
-- This table is accessed only by server routes using SUPABASE_SERVICE_ROLE_KEY.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.google_calendar_credentials (
  connection_id uuid primary key references public.google_calendar_connections(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

revoke all on private.google_calendar_credentials from public, anon, authenticated;

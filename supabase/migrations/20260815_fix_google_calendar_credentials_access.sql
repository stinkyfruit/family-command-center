-- Keep the private schema out of the Data API. Server routes access it through
-- these narrowly scoped functions using the Supabase secret/service role key.
create or replace function public.store_google_calendar_credentials(
  p_connection_id uuid,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into private.google_calendar_credentials (connection_id, access_token, refresh_token, expires_at, updated_at)
  values (p_connection_id, p_access_token, p_refresh_token, p_expires_at, now())
  on conflict (connection_id) do update set
    access_token = excluded.access_token,
    refresh_token = excluded.refresh_token,
    expires_at = excluded.expires_at,
    updated_at = now();
end;
$$;

create or replace function public.get_google_calendar_credentials(p_connection_id uuid)
returns table (access_token text, refresh_token text, expires_at timestamptz)
language sql
security definer
set search_path = public, private
as $$
  select access_token, refresh_token, expires_at
  from private.google_calendar_credentials
  where connection_id = p_connection_id;
$$;

revoke all on function public.store_google_calendar_credentials(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_google_calendar_credentials(uuid) from public, anon, authenticated;
grant execute on function public.store_google_calendar_credentials(uuid, text, text, timestamptz) to service_role;
grant execute on function public.get_google_calendar_credentials(uuid) to service_role;

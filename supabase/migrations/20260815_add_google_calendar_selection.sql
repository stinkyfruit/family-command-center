-- Each Google calendar can be included or excluded independently.
alter table public.google_calendar_connections
  add column if not exists enabled boolean not null default true;

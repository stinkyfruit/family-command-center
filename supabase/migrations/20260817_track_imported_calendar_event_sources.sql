-- Imported events remember the exact calendar/feed that supplied them. This
-- lets later syncs remove only events deleted from that same source.
alter table public.events
  add column if not exists google_calendar_connection_id uuid references public.google_calendar_connections(id) on delete cascade,
  add column if not exists calendar_feed_id uuid references public.calendar_feeds(id) on delete cascade;

create index if not exists events_google_calendar_connection_idx
  on public.events (google_calendar_connection_id)
  where google_calendar_connection_id is not null;

create index if not exists events_calendar_feed_idx
  on public.events (calendar_feed_id)
  where calendar_feed_id is not null;

-- Read-only public iCloud calendar feeds. Treat each URL as private: anyone
-- with the URL can generally view the calendar it represents.
alter table public.events drop constraint if exists events_source_check;
alter table public.events add constraint events_source_check check (source in ('app', 'google', 'apple'));

create table public.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'apple' check (provider in ('apple')),
  display_name text not null,
  feed_url text not null,
  enabled boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (household_id, feed_url)
);

alter table public.calendar_feeds enable row level security;

create policy "members access calendar feeds" on public.calendar_feeds for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

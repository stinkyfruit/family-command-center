-- Family assignments for recurring imported events live separately from the
-- read-only Google/iCloud source. A single assignment then applies to every
-- current and future occurrence of that series.
alter table public.events
  add column if not exists series_external_id text,
  add column if not exists member_ids_override boolean not null default false;

create index if not exists events_series_external_id_idx
  on public.events (household_id, source, series_external_id)
  where series_external_id is not null;

create table public.calendar_series_member_assignments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('google', 'apple')),
  series_external_id text not null,
  member_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, source, series_external_id)
);

create index calendar_series_member_assignments_lookup_idx
  on public.calendar_series_member_assignments (household_id, source, series_external_id);

alter table public.calendar_series_member_assignments enable row level security;

create policy "members access recurring event assignments"
on public.calendar_series_member_assignments for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

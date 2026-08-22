-- Imported calendar rows are a replaceable projection of the external source.
-- Keep family assignments separately so deleting a local row does not erase the
-- assignment when a later sync recreates the same external event.
create table if not exists public.calendar_event_member_assignments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('google', 'apple')),
  external_id text not null,
  member_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, source, external_id)
);

create index if not exists calendar_event_member_assignments_lookup_idx
  on public.calendar_event_member_assignments (household_id, source, external_id);

alter table public.calendar_event_member_assignments enable row level security;

drop policy if exists "members access imported event assignments" on public.calendar_event_member_assignments;

create policy "members access imported event assignments"
on public.calendar_event_member_assignments for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

-- Preserve assignments already stored on imported event rows. Do not backfill
-- every recurring row: rows inheriting a series assignment must keep following
-- the series record when that record changes.
insert into public.calendar_event_member_assignments (household_id, created_by, source, external_id, member_ids)
select household_id, created_by, source, external_id, member_ids
from public.events
where source in ('google', 'apple')
  and external_id is not null
  and (
    coalesce(member_ids_override, false)
    or (series_external_id is null and cardinality(member_ids) > 0)
  )
on conflict (household_id, source, external_id) do update
set member_ids = excluded.member_ids,
    updated_at = now();

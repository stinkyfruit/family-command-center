-- Keep the replaceable events projection synchronized with app-owned
-- assignments at the database boundary. This protects the invariant even if
-- an importer is deployed independently from the dashboard.
create or replace function public.apply_imported_event_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_member_ids uuid[];
  series_member_ids uuid[];
begin
  if new.source in ('google', 'apple') and new.external_id is not null then
    select member_ids into event_member_ids
    from public.calendar_event_member_assignments
    where household_id = new.household_id
      and source = new.source
      and external_id = new.external_id;

    if found then
      new.member_ids := event_member_ids;
      if new.series_external_id is not null then
        new.member_ids_override := true;
      end if;
    elsif new.series_external_id is not null then
      select member_ids into series_member_ids
      from public.calendar_series_member_assignments
      where household_id = new.household_id
        and source = new.source
        and series_external_id = new.series_external_id;

      if found then
        new.member_ids := series_member_ids;
        new.member_ids_override := false;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists apply_imported_event_assignment on public.events;

create trigger apply_imported_event_assignment
before insert or update on public.events
for each row execute function public.apply_imported_event_assignment();

create or replace function public.project_imported_event_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.events
  set member_ids = new.member_ids,
      member_ids_override = case when series_external_id is not null then true else member_ids_override end,
      updated_at = now()
  where household_id = new.household_id
    and source = new.source
    and external_id = new.external_id;
  return new;
end;
$$;

drop trigger if exists project_imported_event_assignment on public.calendar_event_member_assignments;

create trigger project_imported_event_assignment
after insert or update of member_ids on public.calendar_event_member_assignments
for each row execute function public.project_imported_event_assignment();

create or replace function public.project_imported_series_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.events e
  set member_ids = new.member_ids,
      member_ids_override = false,
      updated_at = now()
  where e.household_id = new.household_id
    and e.source = new.source
    and e.series_external_id = new.series_external_id
    and not exists (
      select 1
      from public.calendar_event_member_assignments a
      where a.household_id = e.household_id
        and a.source = e.source
        and a.external_id = e.external_id
    );
  return new;
end;
$$;

drop trigger if exists project_imported_series_assignment on public.calendar_series_member_assignments;

create trigger project_imported_series_assignment
after insert or update of member_ids on public.calendar_series_member_assignments
for each row execute function public.project_imported_series_assignment();

-- Repair imported rows that already have durable event-level assignments.
update public.events e
set member_ids = a.member_ids,
    member_ids_override = case when e.series_external_id is not null then true else e.member_ids_override end,
    updated_at = now()
from public.calendar_event_member_assignments a
where e.household_id = a.household_id
  and e.source = a.source
  and e.external_id = a.external_id;

-- Then restore series-level assignments for occurrences without an explicit
-- event-level override.
update public.events e
set member_ids = a.member_ids,
    member_ids_override = false,
    updated_at = now()
from public.calendar_series_member_assignments a
where e.household_id = a.household_id
  and e.source = a.source
  and e.series_external_id = a.series_external_id
  and not exists (
    select 1
    from public.calendar_event_member_assignments ea
    where ea.household_id = e.household_id
      and ea.source = e.source
      and ea.external_id = e.external_id
  );

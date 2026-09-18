-- Keep an append-only record of every mood selection for per-person stats.
create table if not exists public.mood_checkin_selections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  mood text not null,
  selected_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists mood_checkin_selections_household_member_idx
  on public.mood_checkin_selections (household_id, member_id, selected_at desc);

alter table public.mood_checkin_selections enable row level security;

drop policy if exists "members can view mood selection history" on public.mood_checkin_selections;
create policy "members can view mood selection history" on public.mood_checkin_selections
  for select using (
    public.is_household_member(mood_checkin_selections.household_id)
    and exists (
      select 1 from public.members
      where members.id = mood_checkin_selections.member_id
        and members.household_id = mood_checkin_selections.household_id
    )
  );

drop policy if exists "members can record mood selections" on public.mood_checkin_selections;
create policy "members can record mood selections" on public.mood_checkin_selections
  for insert with check (
    public.is_household_member(mood_checkin_selections.household_id)
    and mood_checkin_selections.created_by = auth.uid()
    and exists (
      select 1 from public.members
      where members.id = mood_checkin_selections.member_id
        and members.household_id = mood_checkin_selections.household_id
    )
  );

-- Give existing daily check-ins a useful starting point without inventing
-- repeated selections that were not recorded by the old schema.
insert into public.mood_checkin_selections (household_id, member_id, mood, selected_at, created_by)
select checkins.household_id, checkins.member_id, checkins.mood, checkins.checked_in_at, checkins.created_by
from public.mood_checkins as checkins
where not exists (
  select 1
  from public.mood_checkin_selections as selections
  where selections.household_id = checkins.household_id
    and selections.member_id = checkins.member_id
    and selections.mood = checkins.mood
    and selections.selected_at = checkins.checked_in_at
    and selections.created_by = checkins.created_by
);

-- Daily mood check-ins for each family member.
create table if not exists public.mood_checkins (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  checkin_date date not null default current_date,
  mood text not null check (mood in ('great', 'good', 'okay', 'tired', 'low')),
  checked_in_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (household_id, member_id, checkin_date)
);

create index if not exists mood_checkins_household_date_idx on public.mood_checkins (household_id, checkin_date);

alter table public.mood_checkins enable row level security;

drop policy if exists "members access mood checkins" on public.mood_checkins;
create policy "members access mood checkins" on public.mood_checkins
  for all using (
    public.is_household_member(mood_checkins.household_id)
    and exists (
      select 1 from public.members
      where members.id = mood_checkins.member_id
        and members.household_id = mood_checkins.household_id
    )
  )
  with check (
    public.is_household_member(mood_checkins.household_id)
    and mood_checkins.created_by = auth.uid()
    and exists (
      select 1 from public.members
      where members.id = mood_checkins.member_id
        and members.household_id = mood_checkins.household_id
    )
  );

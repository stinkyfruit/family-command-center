-- Add potty as the first fixed step in the Vulpetti children's morning routine.
-- The guard keeps this migration safe if a routine was already customized manually.
with target_members as (
  select members.id
  from public.members as members
  where members.household_id = 'a0595e01-f363-460d-8efc-975ba666b9ba'
    and lower(members.display_name) in ('lucas', 'michael')
    and not exists (
      select 1
      from public.chores as existing
      where existing.assignee_member_id = members.id
        and existing.routine = 'Before school'
        and lower(existing.title) = 'potty'
        and existing.is_fixed = true
    )
)
update public.chores as chores
set sort_order = chores.sort_order + 1
where chores.assignee_member_id in (select id from target_members)
  and chores.routine = 'Before school'
  and chores.is_fixed = true;

insert into public.chores (
  household_id,
  assignee_member_id,
  title,
  emoji,
  routine,
  sort_order,
  is_daily,
  is_fixed
)
select
  members.household_id,
  members.id,
  'Potty',
  '🚽',
  'Before school',
  1,
  true,
  true
from public.members as members
where members.household_id = 'a0595e01-f363-460d-8efc-975ba666b9ba'
  and lower(members.display_name) in ('lucas', 'michael')
  and not exists (
    select 1
    from public.chores as existing
    where existing.assignee_member_id = members.id
      and existing.routine = 'Before school'
      and lower(existing.title) = 'potty'
      and existing.is_fixed = true
  );

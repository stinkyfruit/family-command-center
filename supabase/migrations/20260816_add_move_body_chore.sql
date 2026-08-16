-- Add a movement break after homework in each child's fixed after-school routine.
update public.chores as chore
set sort_order = sort_order + 1
where chore.is_fixed = true
  and chore.routine = 'After school'
  and chore.sort_order >= 3
  and not exists (
    select 1
    from public.chores as existing
    where existing.assignee_member_id = chore.assignee_member_id
      and existing.routine = 'After school'
      and existing.title = 'Move body'
      and existing.is_fixed = true
  );

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
  routine.household_id,
  routine.assignee_member_id,
  'Move body',
  '🏃',
  'After school',
  3,
  true,
  true
from public.chores as routine
where routine.is_fixed = true
  and routine.routine = 'After school'
  and not exists (
    select 1
    from public.chores as existing
    where existing.assignee_member_id = routine.assignee_member_id
      and existing.routine = 'After school'
      and existing.title = 'Move body'
      and existing.is_fixed = true
  )
group by routine.household_id, routine.assignee_member_id;

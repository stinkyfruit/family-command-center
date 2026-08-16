-- Add the new fixed after-school step for each child who has the routine.
update public.chores as chore
set sort_order = sort_order + 1
where is_fixed = true
  and routine = 'After school'
  and sort_order >= 3
  and exists (
    select 1
    from public.chores as dinner
    where dinner.assignee_member_id = chore.assignee_member_id
      and dinner.routine = 'After school'
      and dinner.title = 'Dinner'
      and dinner.is_fixed = true
  )
  and not exists (
    select 1
    from public.chores as existing
    where existing.assignee_member_id = chore.assignee_member_id
      and existing.routine = 'After school'
      and existing.title = 'Bring plate to sink'
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
  dinner.household_id,
  dinner.assignee_member_id,
  'Bring plate to sink',
  '🍽️',
  'After school',
  3,
  true,
  true
from public.chores as dinner
where dinner.is_fixed = true
  and dinner.routine = 'After school'
  and dinner.title = 'Dinner'
  and not exists (
    select 1
    from public.chores as existing
    where existing.assignee_member_id = dinner.assignee_member_id
      and existing.routine = 'After school'
      and existing.title = 'Bring plate to sink'
      and existing.is_fixed = true
  );

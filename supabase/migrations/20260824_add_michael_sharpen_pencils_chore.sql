-- Add Michael's new after-school chore without changing the household's
-- existing $2.00 daily reward pool: homework moves from 40 cents to 30 cents,
-- and sharpening pencils adds 10 cents.

update public.chores
set reward_cents = 30
where household_id = 'a0595e01-f363-460d-8efc-975ba666b9ba'
  and assignee_member_id = (
    select members.id
    from public.members
    where members.household_id = 'a0595e01-f363-460d-8efc-975ba666b9ba'
      and lower(members.display_name) = 'michael'
      and members.role = 'child'
  )
  and routine = 'After school'
  and is_fixed = true
  and lower(title) = 'do homework';

-- Put the new chore after changing clothes and before homework. The guard
-- keeps this safe if the migration is inspected or replayed in development.
with michael as (
  select members.id
  from public.members
  where members.household_id = 'a0595e01-f363-460d-8efc-975ba666b9ba'
    and lower(members.display_name) = 'michael'
    and members.role = 'child'
), missing_sharpen_pencils as (
  select michael.id
  from michael
  where not exists (
    select 1
    from public.chores existing
    where existing.assignee_member_id = michael.id
      and existing.routine = 'After school'
      and existing.is_fixed = true
      and lower(existing.title) = 'sharpen pencils'
  )
)
update public.chores chores
set sort_order = chores.sort_order + 1
from missing_sharpen_pencils
where chores.assignee_member_id = missing_sharpen_pencils.id
  and chores.routine = 'After school'
  and chores.is_fixed = true
  and chores.sort_order >= 2;

insert into public.chores (
  household_id,
  assignee_member_id,
  title,
  emoji,
  routine,
  sort_order,
  is_daily,
  is_fixed,
  reward_cents,
  reward_stars
)
select
  members.household_id,
  members.id,
  'Sharpen pencils',
  '✏️',
  'After school',
  2,
  true,
  true,
  10,
  1
from public.members members
where members.household_id = 'a0595e01-f363-460d-8efc-975ba666b9ba'
  and lower(members.display_name) = 'michael'
  and members.role = 'child'
  and not exists (
    select 1
    from public.chores existing
    where existing.assignee_member_id = members.id
      and existing.routine = 'After school'
      and existing.is_fixed = true
      and lower(existing.title) = 'sharpen pencils'
  );

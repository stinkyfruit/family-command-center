-- This cleanup is intentionally limited to the Vulpetti household.
-- Remove legacy duplicate labels, preserving the newer named routine cards.
delete from public.chores
where household_id = 'a0595e01-f363-460d-8efc-975ba666b9ba'
  and routine = 'After school'
  and lower(title) in ('dinner', 'read', 'homework');

-- Keep the fixed Before School cards in their intended order.
update public.chores
set sort_order = case lower(title)
  when 'eat breakfast' then 1
  when 'put on clothes' then 2
  when 'brush hair' then 3
  when 'put on shoes' then 4
  when 'pack backpack' then 5
  when 'pack snacks' then 6
  when 'pack water' then 7
  when 'pack lunch' then 8
  when 'give mama a hug and/or kiss' then 9
  else sort_order
end
where household_id = 'a0595e01-f363-460d-8efc-975ba666b9ba'
  and routine = 'Before school'
  and is_fixed = true;

with new_routines (title, emoji, sort_order) as (
  values
    ('Brush hair', '🪮', 3),
    ('Put on shoes', '👟', 4),
    ('Give Mama a hug and/or kiss', '💗', 9)
)
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
  new_routines.title,
  new_routines.emoji,
  'Before school',
  new_routines.sort_order,
  true,
  true
from public.members members
cross join new_routines
where members.household_id = 'a0595e01-f363-460d-8efc-975ba666b9ba'
  and lower(members.display_name) in ('lucas', 'michael')
  and not exists (
    select 1
    from public.chores existing
    where existing.assignee_member_id = members.id
      and existing.routine = 'Before school'
      and lower(existing.title) = lower(new_routines.title)
      and existing.is_fixed = true
  );

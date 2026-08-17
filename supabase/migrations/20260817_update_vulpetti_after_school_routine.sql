-- Put the Vulpetti after-school and nighttime routine in the agreed order.
update public.chores
set sort_order = case lower(title)
  when 'change clothes and put school clothes in laundry basket' then 1
  when 'do homework' then 2
  when 'move body' then 3
  when 'eat dinner' then 4
  when 'bring plate to the sink' then 5
  when 'help mama and dada clean up dinner' then 6
  when 'take a bath/shower' then 7
  when 'brush teeth' then 8
  when 'read a book' then 9
  else sort_order
end
where household_id = 'a0595e01-f363-460d-8efc-975ba666b9ba'
  and routine = 'After school'
  and is_fixed = true;

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
  'Help Mama and Dada clean up dinner',
  '🧹',
  'After school',
  6,
  true,
  true
from public.members members
where members.household_id = 'a0595e01-f363-460d-8efc-975ba666b9ba'
  and lower(members.display_name) in ('lucas', 'michael')
  and not exists (
    select 1
    from public.chores existing
    where existing.assignee_member_id = members.id
      and existing.routine = 'After school'
      and lower(existing.title) = 'help mama and dada clean up dinner'
      and existing.is_fixed = true
  );

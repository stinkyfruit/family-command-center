-- Add the morning hair routine for both children, without duplicating it if
-- this migration needs to be run again.
alter table public.chores
  add column if not exists is_fixed boolean not null default false;

update public.chores
set sort_order = sort_order + 1
where routine = 'Before school'
  and is_fixed = true
  and sort_order >= 3;

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
  'Brush hair',
  '🪮',
  'Before school',
  3,
  true,
  true
from public.members members
where lower(members.display_name) in ('lucas', 'michael')
  and not exists (
    select 1
    from public.chores existing
    where existing.assignee_member_id = members.id
      and existing.routine = 'Before school'
      and lower(existing.title) = 'brush hair'
      and existing.is_fixed = true
  );

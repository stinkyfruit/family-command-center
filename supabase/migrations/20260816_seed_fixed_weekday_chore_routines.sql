-- Replace prior editable daily chores with the family's fixed weekday routines.
alter table public.chores
  add column if not exists is_fixed boolean not null default false;

update public.chores
set active = false
where active = true
  and routine in ('Before school', 'After school')
  and is_fixed = false;

with routine_templates (routine, title, emoji, sort_order, lucas_only) as (
  values
    ('Before school', 'Eat breakfast', '🍳', 1, false),
    ('Before school', 'Put on clothes', '👕', 2, false),
    ('Before school', 'Pack backpack', '🎒', 3, false),
    ('Before school', 'Pack snacks', '🥨', 4, false),
    ('Before school', 'Pack water', '💧', 5, false),
    ('Before school', 'Pack lunch', '🍱', 6, true),
    ('After school', 'Homework', '📚', 1, false),
    ('After school', 'Dinner', '🍽️', 2, false),
    ('After school', 'Take a bath/shower', '🫧', 3, false),
    ('After school', 'Brush teeth', '🪥', 4, false),
    ('After school', 'Read', '📖', 5, false)
)
insert into public.chores (household_id, assignee_member_id, title, emoji, routine, sort_order, is_daily, is_fixed)
select members.household_id, members.id, templates.title, templates.emoji, templates.routine, templates.sort_order, true, true
from public.members members
cross join routine_templates templates
where lower(members.display_name) in ('lucas', 'michael')
  and (not templates.lucas_only or lower(members.display_name) = 'lucas')
  and not exists (
    select 1
    from public.chores existing
    where existing.assignee_member_id = members.id
      and existing.routine = templates.routine
      and existing.title = templates.title
      and existing.is_fixed = true
  );

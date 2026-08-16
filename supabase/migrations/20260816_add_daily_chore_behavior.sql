-- Routine chores repeat daily; anytime to-dos are one-time items.
alter table public.chores
  add column if not exists is_daily boolean not null default true;

update public.chores
set is_daily = false
where routine = 'To-do';

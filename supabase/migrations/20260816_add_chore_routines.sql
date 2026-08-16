-- Each child's chores can belong to a separate daily routine.
alter table public.chores
  add column if not exists routine text not null default 'To-do';

create index if not exists chores_household_assignee_routine_sort_idx
  on public.chores (household_id, assignee_member_id, routine, sort_order);

-- A non-null date makes a custom Before/After School chore a one-time task.
-- It is displayed only on that date, while fixed routine chores remain daily.
alter table public.chores
  add column if not exists scheduled_for date;

create index if not exists chores_household_scheduled_for_idx
  on public.chores (household_id, scheduled_for);

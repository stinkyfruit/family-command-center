-- New list cards start collapsed. Existing per-user choices are preserved.
alter table public.user_list_preferences
  alter column expanded set default false;

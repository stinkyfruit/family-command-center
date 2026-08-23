-- Store list expansion state per signed-in user. The key includes the list
-- type because shared lists and PIN-unlocked private lists use separate tables.
create table public.user_list_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  list_key text not null,
  expanded boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, list_key)
);

create index user_list_preferences_user_idx on public.user_list_preferences (user_id);

alter table public.user_list_preferences enable row level security;

create policy "users access their own list preferences" on public.user_list_preferences
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

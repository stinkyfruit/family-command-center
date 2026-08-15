-- Family Command Center: initial Supabase schema
-- Run this file in the Supabase SQL Editor, then enable email or Google auth.

create extension if not exists "pgcrypto";

create type public.member_role as enum ('adult', 'child');
create type public.todo_visibility as enum ('private', 'adults', 'household');
create type public.todo_status as enum ('open', 'completed', 'archived');
create type public.calendar_provider as enum ('google');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Chicago',
  latitude numeric,
  longitude numeric,
  theme_mode text not null default 'auto' check (theme_mode in ('auto', 'light', 'dark')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  color text not null default '#7c3aed',
  role public.member_role not null default 'child',
  avatar_url text,
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  color text not null default '#7c3aed',
  source text not null default 'app' check (source in ('app', 'google')),
  external_id text,
  recurrence_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, source, external_id)
);

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  assignee_member_id uuid references public.members(id) on delete set null,
  title text not null,
  notes text,
  due_at timestamptz,
  priority smallint not null default 2 check (priority between 1 and 3),
  visibility public.todo_visibility not null default 'adults',
  status public.todo_status not null default 'open',
  recurrence_rule text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  assignee_member_id uuid references public.members(id) on delete set null,
  title text not null,
  emoji text not null default '✨',
  recurrence_rule text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.chore_completions (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  completed_at timestamptz not null default now()
);

-- OAuth refresh tokens never belong in a client-readable database table.
-- Store them as Supabase Edge Function secrets or in Vault. This table only
-- holds sync metadata safe for the dashboard to read.
create table public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  connected_by uuid not null references auth.users(id) on delete cascade,
  google_calendar_id text not null,
  display_name text not null,
  color text,
  sync_token text,
  watch_channel_id text,
  watch_expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (household_id, google_calendar_id)
);

create index events_household_starts_at_idx on public.events (household_id, starts_at);
create index todos_household_status_due_at_idx on public.todos (household_id, status, due_at);
create index members_household_idx on public.members (household_id);

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.members where household_id = target_household_id and user_id = auth.uid()
); $$;

create or replace function public.add_household_creator()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into public.members (household_id, user_id, display_name, role)
  values (new.id, new.created_by, coalesce(auth.jwt() ->> 'email', 'Adult'), 'adult');
  return new;
end; $$;

create trigger on_household_created after insert on public.households
for each row execute procedure public.add_household_creator();

alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.todos enable row level security;
alter table public.chores enable row level security;
alter table public.chore_completions enable row level security;
alter table public.google_calendar_connections enable row level security;

create policy "members access household" on public.households for all using (public.is_household_member(id)) with check (created_by = auth.uid());
create policy "members access members" on public.members for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members access events" on public.events for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "adults access todos" on public.todos for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members access chores" on public.chores for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members access chore completions" on public.chore_completions for all using (exists (select 1 from public.chores where chores.id = chore_id and public.is_household_member(chores.household_id))) with check (exists (select 1 from public.chores where chores.id = chore_id and public.is_household_member(chores.household_id)));
create policy "adults access calendar connections" on public.google_calendar_connections for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

alter publication supabase_realtime add table public.events, public.todos, public.chores, public.chore_completions;

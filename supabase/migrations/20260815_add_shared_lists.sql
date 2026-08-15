-- Shared household lists (groceries, packing, ideas, notes, and more).
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  icon text not null default '☰',
  created_at timestamptz not null default now()
);

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index lists_household_idx on public.lists (household_id);
create index list_items_list_idx on public.list_items (list_id);

alter table public.lists enable row level security;
alter table public.list_items enable row level security;

create policy "members access lists" on public.lists for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "members access list items" on public.list_items for all
using (exists (select 1 from public.lists where lists.id = list_id and public.is_household_member(lists.household_id)))
with check (exists (select 1 from public.lists where lists.id = list_id and public.is_household_member(lists.household_id)));

alter publication supabase_realtime add table public.lists, public.list_items;

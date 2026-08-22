-- Child-facing Christmas wish lists, kept separate from shared household lists.
create table public.christmas_wishlist_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  title text not null,
  note text,
  category text not null default 'Surprise',
  priority boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index christmas_wishlist_household_idx on public.christmas_wishlist_items (household_id);
create index christmas_wishlist_member_idx on public.christmas_wishlist_items (member_id);

alter table public.christmas_wishlist_items enable row level security;

create policy "members access Christmas wishlist items" on public.christmas_wishlist_items for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

alter publication supabase_realtime add table public.christmas_wishlist_items;

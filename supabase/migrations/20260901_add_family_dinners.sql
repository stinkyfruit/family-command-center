-- Family dinner memories with per-dish categories, private photos, and
-- one rating from each family member.
alter table public.households
  add column if not exists show_family_dinners_tab boolean not null default true;

create table if not exists public.family_dinners (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  eaten_on date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.family_dinner_dishes (
  id uuid primary key default gen_random_uuid(),
  dinner_id uuid not null references public.family_dinners(id) on delete cascade,
  position smallint not null check (position between 1 and 20),
  title text not null,
  category text not null check (category in ('main', 'side', 'bread', 'dessert')),
  photo_path text,
  created_at timestamptz not null default now(),
  unique (dinner_id, position)
);

create table if not exists public.family_dinner_ratings (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.family_dinner_dishes(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  member_name text not null,
  rating smallint not null check (rating between 1 and 10),
  created_at timestamptz not null default now(),
  unique (dish_id, member_id)
);

create index if not exists family_dinners_household_date_idx
  on public.family_dinners (household_id, eaten_on desc, created_at desc);
create index if not exists family_dinner_dishes_dinner_position_idx
  on public.family_dinner_dishes (dinner_id, position);
create index if not exists family_dinner_ratings_dish_idx
  on public.family_dinner_ratings (dish_id);

alter table public.family_dinners enable row level security;
alter table public.family_dinner_dishes enable row level security;
alter table public.family_dinner_ratings enable row level security;

drop policy if exists "members access family dinners" on public.family_dinners;
create policy "members access family dinners" on public.family_dinners for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members access family dinner dishes" on public.family_dinner_dishes;
create policy "members access family dinner dishes" on public.family_dinner_dishes for all
using (exists (
  select 1 from public.family_dinners
  where family_dinners.id = dinner_id
    and public.is_household_member(family_dinners.household_id)
))
with check (exists (
  select 1 from public.family_dinners
  where family_dinners.id = dinner_id
    and public.is_household_member(family_dinners.household_id)
));

drop policy if exists "members access family dinner ratings" on public.family_dinner_ratings;
create policy "members access family dinner ratings" on public.family_dinner_ratings for all
using (exists (
  select 1
  from public.family_dinner_dishes
  join public.family_dinners on family_dinners.id = family_dinner_dishes.dinner_id
  where family_dinner_dishes.id = dish_id
    and public.is_household_member(family_dinners.household_id)
))
with check (exists (
  select 1
  from public.family_dinner_dishes
  join public.family_dinners on family_dinners.id = family_dinner_dishes.dinner_id
  where family_dinner_dishes.id = dish_id
    and public.is_household_member(family_dinners.household_id)
));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-dinner-photos', 'family-dinner-photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members read family dinner photos" on storage.objects;
create policy "members read family dinner photos" on storage.objects for select
using (
  bucket_id = 'family-dinner-photos'
  and public.is_household_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists "members upload family dinner photos" on storage.objects;
create policy "members upload family dinner photos" on storage.objects for insert
with check (
  bucket_id = 'family-dinner-photos'
  and public.is_household_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists "members update family dinner photos" on storage.objects;
create policy "members update family dinner photos" on storage.objects for update
using (
  bucket_id = 'family-dinner-photos'
  and public.is_household_member((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'family-dinner-photos'
  and public.is_household_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists "members delete family dinner photos" on storage.objects;
create policy "members delete family dinner photos" on storage.objects for delete
using (
  bucket_id = 'family-dinner-photos'
  and public.is_household_member((storage.foldername(name))[1]::uuid)
);

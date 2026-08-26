-- Family movie-night history. Movie metadata such as poster URLs can be added
-- to movie_night_movies later without changing the household record or ratings.
alter table public.households
  add column if not exists show_movie_night_tab boolean not null default true;

create table if not exists public.movie_nights (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  watched_on date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.movie_night_movies (
  id uuid primary key default gen_random_uuid(),
  movie_night_id uuid not null references public.movie_nights(id) on delete cascade,
  position smallint not null check (position in (1, 2)),
  title text not null,
  picker_member_id uuid references public.members(id) on delete set null,
  picker_name text,
  created_at timestamptz not null default now(),
  unique (movie_night_id, position)
);

create table if not exists public.movie_night_ratings (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movie_night_movies(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  member_name text not null,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (movie_id, member_id)
);

create index if not exists movie_nights_household_date_idx
  on public.movie_nights (household_id, watched_on desc);
create index if not exists movie_night_movies_night_position_idx
  on public.movie_night_movies (movie_night_id, position);
create index if not exists movie_night_ratings_movie_idx
  on public.movie_night_ratings (movie_id);

alter table public.movie_nights enable row level security;
alter table public.movie_night_movies enable row level security;
alter table public.movie_night_ratings enable row level security;

drop policy if exists "members access movie nights" on public.movie_nights;
create policy "members access movie nights" on public.movie_nights for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members access movie night movies" on public.movie_night_movies;
create policy "members access movie night movies" on public.movie_night_movies for all
using (exists (
  select 1 from public.movie_nights
  where movie_nights.id = movie_night_id
    and public.is_household_member(movie_nights.household_id)
))
with check (exists (
  select 1 from public.movie_nights
  where movie_nights.id = movie_night_id
    and public.is_household_member(movie_nights.household_id)
));

drop policy if exists "members access movie night ratings" on public.movie_night_ratings;
create policy "members access movie night ratings" on public.movie_night_ratings for all
using (exists (
  select 1
  from public.movie_night_movies
  join public.movie_nights on movie_nights.id = movie_night_movies.movie_night_id
  where movie_night_movies.id = movie_id
    and public.is_household_member(movie_nights.household_id)
))
with check (exists (
  select 1
  from public.movie_night_movies
  join public.movie_nights on movie_nights.id = movie_night_movies.movie_night_id
  where movie_night_movies.id = movie_id
    and public.is_household_member(movie_nights.household_id)
));

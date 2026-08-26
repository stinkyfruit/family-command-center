-- Record first-time viewing per person and per movie.
alter table public.movie_night_ratings
  add column if not exists first_time_watching boolean not null default false;

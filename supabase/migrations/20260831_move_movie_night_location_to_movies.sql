-- Viewing location belongs to each movie, since a two-movie night can move rooms.
-- Preserve locations already recorded by the earlier night-level migration.
alter table public.movie_night_movies
  add column if not exists location text not null default 'downstairs';

alter table public.movie_night_movies
  drop constraint if exists movie_night_movies_location_check;

alter table public.movie_night_movies
  add constraint movie_night_movies_location_check
  check (location in ('downstairs', 'pool-house', 'playroom', 'boys-room', 'parents-bedroom'));

update public.movie_night_movies as movie
set location = night.location
from public.movie_nights as night
where night.id = movie.movie_night_id
  and night.location in ('downstairs', 'pool-house', 'playroom', 'boys-room', 'parents-bedroom');

alter table public.movie_nights
  drop constraint if exists movie_nights_location_check;

alter table public.movie_nights
  drop column if exists location;

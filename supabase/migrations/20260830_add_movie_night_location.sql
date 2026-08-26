-- Record where the family watched the movie night.
alter table public.movie_nights
  add column if not exists location text not null default 'downstairs';

alter table public.movie_nights
  drop constraint if exists movie_nights_location_check;

alter table public.movie_nights
  add constraint movie_nights_location_check
  check (location in ('downstairs', 'pool-house', 'playroom', 'boys-room', 'parents-bedroom'));

-- Notes belong to the whole family movie night, not an individual movie.
alter table public.movie_nights
  add column if not exists notes text;

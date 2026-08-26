-- Store TMDB metadata only. Poster files remain on TMDB's image CDN and are
-- never copied into Supabase Storage by the family app.
alter table public.movie_night_movies
  add column if not exists tmdb_id integer,
  add column if not exists poster_path text,
  add column if not exists release_year smallint;

create index if not exists movie_night_movies_tmdb_idx
  on public.movie_night_movies (tmdb_id);

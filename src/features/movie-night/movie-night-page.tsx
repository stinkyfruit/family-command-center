"use client";

/* TMDB posters are intentionally rendered directly from TMDB's CDN. This
 * avoids copying images into Supabase Storage or using Vercel transformations. */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/role-has-required-aria-props */

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AppIcon, StyledSelect, useAppNotifications } from "@/components/home/shared-ui";
import type { Member } from "@/features/home/model";
import { supabase } from "@/lib/supabase";

type TmdbSearchResult = { id: number; title: string; releaseYear: number | null; posterPath: string | null };
const movieNightLocationOptions = [
  { value: "downstairs", label: "Downstairs" },
  { value: "pool-house", label: "Pool house" },
  { value: "playroom", label: "Playroom" },
  { value: "boys-room", label: "Boys room" },
  { value: "parents-bedroom", label: "Parents bedroom" },
] as const;
type MovieNightLocation = (typeof movieNightLocationOptions)[number]["value"];
type MovieNightRating = { id: string; memberId: string | null; memberName: string; rating: number; firstTimeWatching: boolean };
type MovieNightMovie = { id: string; position: number; title: string; location: MovieNightLocation; pickerMemberId: string | null; pickerName: string | null; tmdbId: number | null; posterPath: string | null; releaseYear: number | null; ratings: MovieNightRating[] };
type MovieNight = { id: string; watchedOn: string; createdAt: string; notes: string | null; movies: MovieNightMovie[] };
type MovieDraft = { id: string | null; title: string; location: MovieNightLocation; pickerId: string; tmdbId: number | null; posterPath: string | null; releaseYear: number | null; ratings: Record<string, string>; firstTimeWatching: Record<string, boolean>; searchQuery: string; searchResults: TmdbSearchResult[]; searching: boolean; searchMessage: string };

function blankMovie(): MovieDraft {
  return { id: null, title: "", location: "downstairs", pickerId: "", tmdbId: null, posterPath: null, releaseYear: null, ratings: {}, firstTimeWatching: {}, searchQuery: "", searchResults: [], searching: false, searchMessage: "" };
}

function movieDraftFromSavedMovie(movie: MovieNightMovie, members: Member[]): MovieDraft {
  const pickerMember = members.find((member) => String(member.id) === String(movie.pickerMemberId)) ?? members.find((member) => member.name === movie.pickerName);
  return {
    id: movie.id,
    title: movie.title,
    location: movie.location,
    pickerId: pickerMember ? String(pickerMember.id) : "",
    tmdbId: movie.tmdbId,
    posterPath: movie.posterPath,
    releaseYear: movie.releaseYear,
    ratings: Object.fromEntries(movie.ratings.map((rating) => [String(rating.memberId), String(rating.rating)])),
    firstTimeWatching: Object.fromEntries(movie.ratings.map((rating) => [String(rating.memberId), rating.firstTimeWatching])),
    searchQuery: movie.title,
    searchResults: [],
    searching: false,
    searchMessage: "",
  };
}

function MovieSuggestions({ movie, movieIndex, onSelectMovie, onUseTypedTitle }: { movie: MovieDraft; movieIndex: number; onSelectMovie: (movieIndex: number, result: TmdbSearchResult) => void; onUseTypedTitle: (movieIndex: number) => void }) {
  const hasTitle = movie.title.trim().length >= 2;
  if (!hasTitle && !movie.posterPath) return null;
  return <div className="mt-2 space-y-2">
    {movie.searching && <p role="status" className="text-xs font-bold text-violet-600 dark:text-violet-200">Looking up movie suggestions…</p>}
    {movie.searchMessage && <p role="status" className="text-xs font-bold text-rose-600 dark:text-rose-300">{movie.searchMessage}</p>}
    {movie.searchResults.length > 0 && <div className="grid gap-2" role="listbox" aria-label={`Movie suggestions for ${movie.title}`}>
      {movie.searchResults.map((result) => <button type="button" role="option" key={result.id} onClick={() => onSelectMovie(movieIndex, result)} className="flex items-center gap-3 rounded-xl bg-white p-2 text-left ring-1 ring-violet-100 hover:bg-fuchsia-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 dark:bg-white/10 dark:ring-white/10"><span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-violet-100 dark:bg-violet-400/20">{posterUrl(result.posterPath, "w185") ? <img src={posterUrl(result.posterPath, "w185")!} alt="" className="size-full object-cover" loading="lazy" /> : <AppIcon name="movieNight" className="size-5 text-violet-500" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{result.title}</span>{result.releaseYear && <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">{result.releaseYear}</span>}</span><span className="text-xs font-black text-fuchsia-700 dark:text-fuchsia-200">Use poster</span></button>)}
    </div>}
    {hasTitle && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-violet-100/70 px-3 py-2 dark:bg-violet-400/10"><p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{movie.searchResults.length ? "Don't see your movie?" : "No poster match?"} Keep your typed title.</p><button type="button" onClick={() => onUseTypedTitle(movieIndex)} className="shrink-0 text-xs font-black text-violet-700 underline underline-offset-2 hover:text-violet-900 dark:text-violet-200">Use my typed title</button></div>}
    {movie.posterPath && <div className="flex items-center gap-3 rounded-xl bg-white/70 p-2 dark:bg-white/10"><img src={posterUrl(movie.posterPath, "w185") ?? ""} alt={`${movie.title} poster`} className="h-20 w-14 rounded-lg object-cover" loading="lazy" /><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Poster selected{movie.releaseYear ? ` · ${movie.releaseYear}` : ""}</span></div>}
  </div>;
}

function posterUrl(posterPath: string | null, size: "w185" | "w500" = "w500") {
  return posterPath?.startsWith("/") ? `https://image.tmdb.org/t/p/${size}${posterPath}` : null;
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function averageRating(movie: MovieNightMovie) {
  return movie.ratings.length ? movie.ratings.reduce((total, rating) => total + rating.rating, 0) / movie.ratings.length : 0;
}

function ratingLabel(value: number) {
  return `${value.toFixed(1)} / 5`;
}

function normalizeMovieNightLocation(value: string | null | undefined): MovieNightLocation {
  return movieNightLocationOptions.some((option) => option.value === value) ? value as MovieNightLocation : "downstairs";
}

function movieNightLocationLabel(value: MovieNightLocation) {
  return movieNightLocationOptions.find((option) => option.value === value)?.label ?? value;
}

function sortMovieNights(movieNights: MovieNight[]) {
  return [...movieNights].sort((first, second) => second.watchedOn.localeCompare(first.watchedOn) || second.createdAt.localeCompare(first.createdAt));
}

function movieNightFromRows(night: { id: string; watched_on: string; notes: string | null; created_at: string }, movieRows: Array<{ id: string; position: number; title: string; location: string | null; picker_member_id: string | null; picker_name: string | null; tmdb_id: number | null; poster_path: string | null; release_year: number | null }>, ratingRows: Array<{ id: string; movie_id: string; member_id: string | null; member_name: string; rating: number; first_time_watching: boolean }>): MovieNight {
  return {
    id: night.id,
    watchedOn: night.watched_on,
    createdAt: night.created_at,
    notes: night.notes,
    movies: movieRows.sort((first, second) => first.position - second.position).map((movie) => ({
      id: movie.id,
      position: movie.position,
      title: movie.title,
      location: normalizeMovieNightLocation(movie.location),
      pickerMemberId: movie.picker_member_id,
      pickerName: movie.picker_name,
      tmdbId: movie.tmdb_id,
      posterPath: movie.poster_path,
      releaseYear: movie.release_year,
      ratings: ratingRows.filter((rating) => rating.movie_id === movie.id).map((rating) => ({ id: rating.id, memberId: rating.member_id, memberName: rating.member_name, rating: rating.rating, firstTimeWatching: rating.first_time_watching })),
    })),
  };
}

export function MovieNightPage({ householdId, members, currentUserId }: { householdId: string | null; members: Member[]; currentUserId: string | null }) {
  const { notify } = useAppNotifications();
  const [nights, setNights] = useState<MovieNight[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingNightId, setEditingNightId] = useState<string | null>(null);
  const [selectedNight, setSelectedNight] = useState<MovieNight | null>(null);
  const [watchedOn, setWatchedOn] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [notes, setNotes] = useState("");
  const [movieDrafts, setMovieDrafts] = useState<MovieDraft[]>([blankMovie()]);
  const searchTimers = useRef<Record<number, number>>({});
  const searchRequestIds = useRef<Record<number, number>>({});

  useEffect(() => {
    if (!selectedNight) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedNight(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedNight]);

  useEffect(() => () => {
    Object.values(searchTimers.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadMovieNights() {
      setLoading(true);
      setMessage("");
      if (!supabase || !householdId) {
        setNights([]);
        setLoading(false);
        return;
      }
      const nightResult = await supabase.from("movie_nights").select("id, watched_on, notes, created_at").eq("household_id", householdId).order("watched_on", { ascending: false }).order("created_at", { ascending: false });
      if (cancelled) return;
      if (nightResult.error) {
        setMessage(nightResult.error.code === "42P01" ? "Run the Movie Night migration in Supabase first." : `Could not load movie nights: ${nightResult.error.message}`);
        setLoading(false);
        return;
      }
      const loadedNights = (nightResult.data ?? []) as Array<{ id: string; watched_on: string; notes: string | null; created_at: string }>;
      if (!loadedNights.length) {
        setNights([]);
        setLoading(false);
        return;
      }
      const nightIds = loadedNights.map((night) => night.id);
      const movieResult = await supabase.from("movie_night_movies").select("id, movie_night_id, position, title, location, picker_member_id, picker_name, tmdb_id, poster_path, release_year").in("movie_night_id", nightIds);
      if (movieResult.error) {
        setMessage(`Could not load the movies: ${movieResult.error.message}`);
        setLoading(false);
        return;
      }
      const loadedMovies = (movieResult.data ?? []) as Array<{ id: string; movie_night_id: string; position: number; title: string; location: string | null; picker_member_id: string | null; picker_name: string | null; tmdb_id: number | null; poster_path: string | null; release_year: number | null }>;
      const movieIds = loadedMovies.map((movie) => movie.id);
      const ratingResult = movieIds.length
        ? await supabase.from("movie_night_ratings").select("id, movie_id, member_id, member_name, rating, first_time_watching").in("movie_id", movieIds)
        : { data: [], error: null };
      if (ratingResult.error) {
        setMessage(`Could not load family ratings: ${ratingResult.error.message}`);
        setLoading(false);
        return;
      }
      if (!cancelled) {
        setNights(sortMovieNights(loadedNights.map((night) => movieNightFromRows(night, loadedMovies.filter((movie) => movie.movie_night_id === night.id), (ratingResult.data ?? []) as Array<{ id: string; movie_id: string; member_id: string | null; member_name: string; rating: number; first_time_watching: boolean }>))));
        setLoading(false);
      }
    }
    void loadMovieNights();
    return () => { cancelled = true; };
  }, [householdId]);

  const totalMovies = useMemo(() => nights.reduce((total, night) => total + night.movies.length, 0), [nights]);

  function updateMovie(index: number, update: Partial<MovieDraft>) {
    setMovieDrafts((current) => current.map((movie, movieIndex) => movieIndex === index ? { ...movie, ...update } : movie));
  }

  function updateRating(movieIndex: number, memberId: string, rating: string) {
    setMovieDrafts((current) => current.map((movie, index) => index === movieIndex ? { ...movie, ratings: { ...movie.ratings, [memberId]: rating } } : movie));
  }

  function updateFirstTime(movieIndex: number, memberId: string, firstTime: boolean) {
    setMovieDrafts((current) => current.map((movie, index) => index === movieIndex ? { ...movie, firstTimeWatching: { ...movie.firstTimeWatching, [memberId]: firstTime } } : movie));
  }

  async function searchMovies(movieIndex: number, queryOverride?: string) {
    const query = (queryOverride || movieDrafts[movieIndex]?.searchQuery || movieDrafts[movieIndex]?.title || "").trim();
    if (query.length < 2) {
      updateMovie(movieIndex, { searchMessage: "Enter at least two characters to search." });
      return;
    }
    const requestId = (searchRequestIds.current[movieIndex] ?? 0) + 1;
    searchRequestIds.current[movieIndex] = requestId;
    updateMovie(movieIndex, { searching: true, searchMessage: "", searchResults: [] });
    try {
      const response = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const payload = await response.json() as { results?: TmdbSearchResult[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Movie lookup is unavailable right now.");
      if (searchRequestIds.current[movieIndex] !== requestId) return;
      updateMovie(movieIndex, { searching: false, searchResults: payload.results ?? [], searchMessage: payload.results?.length ? "" : "No movies found. Try a different title." });
    } catch (error) {
      if (searchRequestIds.current[movieIndex] !== requestId) return;
      updateMovie(movieIndex, { searching: false, searchMessage: error instanceof Error ? error.message : "Movie lookup is unavailable right now." });
    }
  }

  function updateMovieTitle(index: number, title: string) {
    window.clearTimeout(searchTimers.current[index]);
    searchRequestIds.current[index] = (searchRequestIds.current[index] ?? 0) + 1;
    updateMovie(index, { title, searchQuery: title, tmdbId: null, posterPath: null, releaseYear: null, searchResults: [], searchMessage: "", searching: false });
    if (title.trim().length < 2) return;
    searchTimers.current[index] = window.setTimeout(() => { void searchMovies(index, title); }, 450);
  }

  function selectMovie(movieIndex: number, result: TmdbSearchResult) {
    window.clearTimeout(searchTimers.current[movieIndex]);
    searchRequestIds.current[movieIndex] = (searchRequestIds.current[movieIndex] ?? 0) + 1;
    updateMovie(movieIndex, { title: result.title, tmdbId: result.id, posterPath: result.posterPath, releaseYear: result.releaseYear, searchQuery: result.title, searchResults: [], searching: false, searchMessage: "" });
  }

  function useTypedTitle(movieIndex: number) {
    window.clearTimeout(searchTimers.current[movieIndex]);
    searchRequestIds.current[movieIndex] = (searchRequestIds.current[movieIndex] ?? 0) + 1;
    updateMovie(movieIndex, { tmdbId: null, posterPath: null, releaseYear: null, searchQuery: movieDrafts[movieIndex]?.title ?? "", searchResults: [], searching: false, searchMessage: "" });
  }

  function resetForm() {
    Object.values(searchTimers.current).forEach((timer) => window.clearTimeout(timer));
    searchTimers.current = {};
    searchRequestIds.current = {};
    setWatchedOn(new Date().toLocaleDateString("en-CA"));
    setNotes("");
    setMovieDrafts([blankMovie()]);
    setEditingNightId(null);
    setShowForm(false);
    setMessage("");
  }

  function beginEditingMovieNight(night: MovieNight) {
    setEditingNightId(night.id);
    setWatchedOn(night.watchedOn);
    setNotes(night.notes ?? "");
    setMovieDrafts(night.movies.map((movie) => movieDraftFromSavedMovie(movie, members)));
    setSelectedNight(null);
    setMessage("");
    setShowForm(true);
  }

  async function saveMovieNight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!watchedOn) { setMessage("Choose the night you watched the movie."); return; }
    if (!members.length) { setMessage("Add family members before recording ratings."); return; }
    const preparedMovies = movieDrafts.map((movie, index) => ({
      id: movie.id,
      position: index + 1,
      title: movie.title.trim(),
      location: movie.location,
      pickerId: movie.pickerId || null,
      pickerName: members.find((member) => String(member.id) === movie.pickerId)?.name ?? null,
      tmdbId: movie.tmdbId,
      posterPath: movie.posterPath,
      releaseYear: movie.releaseYear,
      ratings: members.map((member) => ({ memberId: member.id, memberName: member.name, rating: Number(movie.ratings[String(member.id)] ?? ""), firstTimeWatching: Boolean(movie.firstTimeWatching[String(member.id)]) })),
    }));
    if (preparedMovies.some((movie) => !movie.title)) { setMessage("Give each movie a title."); return; }
    if (preparedMovies.some((movie) => !movie.pickerId)) { setMessage("Choose who picked each movie."); return; }
    if (preparedMovies.some((movie) => movie.ratings.some((rating) => !Number.isInteger(rating.rating) || rating.rating < 1 || rating.rating > 5))) {
      setMessage("Choose a rating from 1 to 5 for everyone and every movie.");
      return;
    }

    setSaving(true);
    setMessage("");
    const existingNight = editingNightId ? nights.find((night) => night.id === editingNightId) : null;
    let createdNightId: string | null = null;
    try {
      if (!supabase || !householdId) {
        const localNight: MovieNight = {
          id: editingNightId ?? `local-${Date.now()}`,
          watchedOn,
          createdAt: existingNight?.createdAt ?? new Date().toISOString(),
          notes: notes.trim() || null,
          movies: preparedMovies.map((movie) => ({ id: movie.id ?? `local-${Date.now()}-${movie.position}`, position: movie.position, title: movie.title, location: movie.location, pickerMemberId: movie.pickerId ? String(movie.pickerId) : null, pickerName: movie.pickerName, tmdbId: movie.tmdbId, posterPath: movie.posterPath, releaseYear: movie.releaseYear, ratings: movie.ratings.map((rating, index) => ({ id: `local-rating-${Date.now()}-${index}`, memberId: String(rating.memberId), memberName: rating.memberName, rating: rating.rating, firstTimeWatching: rating.firstTimeWatching })) })),
        };
        setNights((current) => sortMovieNights(editingNightId ? current.map((night) => night.id === editingNightId ? localNight : night) : [localNight, ...current]));
        notify(editingNightId ? "Movie night updated." : "Movie night saved.", "success");
        resetForm();
        return;
      }

      const nightResult = editingNightId
        ? await supabase.from("movie_nights").update({ watched_on: watchedOn, notes: notes.trim() || null }).eq("id", editingNightId).eq("household_id", householdId).select("id, watched_on, notes, created_at").single()
        : await supabase.from("movie_nights").insert({ household_id: householdId, watched_on: watchedOn, notes: notes.trim() || null, created_by: currentUserId }).select("id, watched_on, notes, created_at").single();
      if (nightResult.error || !nightResult.data) throw new Error(nightResult.error?.message ?? "The movie night could not be saved.");
      const night = nightResult.data as { id: string; watched_on: string; notes: string | null; created_at: string };
      if (!editingNightId) createdNightId = night.id;

      const persistedMovies: Array<{ id: string; position: number; title: string; location: string | null; picker_member_id: string | null; picker_name: string | null; tmdb_id: number | null; poster_path: string | null; release_year: number | null }> = [];
      for (const movie of preparedMovies) {
        const movieData = { movie_night_id: night.id, position: movie.position, title: movie.title, location: movie.location, picker_member_id: movie.pickerId, picker_name: movie.pickerName, tmdb_id: movie.tmdbId, poster_path: movie.posterPath, release_year: movie.releaseYear };
        const movieResult = movie.id
          ? await supabase.from("movie_night_movies").update(movieData).eq("id", movie.id).eq("movie_night_id", night.id).select("id, position, title, location, picker_member_id, picker_name, tmdb_id, poster_path, release_year").single()
          : await supabase.from("movie_night_movies").insert(movieData).select("id, position, title, location, picker_member_id, picker_name, tmdb_id, poster_path, release_year").single();
        if (movieResult.error || !movieResult.data) throw new Error(movieResult.error?.message ?? "The movies could not be saved.");
        persistedMovies.push(movieResult.data as typeof persistedMovies[number]);
      }

      const existingMovieIds = existingNight?.movies.map((movie) => movie.id) ?? [];
      const persistedMovieIds = persistedMovies.map((movie) => movie.id);
      const removedMovieIds = existingMovieIds.filter((id) => !persistedMovieIds.includes(id));
      if (removedMovieIds.length) {
        const removedResult = await supabase.from("movie_night_movies").delete().in("id", removedMovieIds).eq("movie_night_id", night.id);
        if (removedResult.error) throw new Error(removedResult.error.message);
      }

      const clearRatingsResult = await supabase.from("movie_night_ratings").delete().in("movie_id", persistedMovieIds);
      if (clearRatingsResult.error) throw new Error(clearRatingsResult.error.message);
      const ratingRows = preparedMovies.flatMap((movie) => {
        const persistedMovie = persistedMovies.find((item) => item.position === movie.position);
        return persistedMovie ? movie.ratings.map((rating) => ({ movie_id: persistedMovie.id, member_id: rating.memberId, member_name: rating.memberName, rating: rating.rating, first_time_watching: rating.firstTimeWatching })) : [];
      });
      const ratingResult = await supabase.from("movie_night_ratings").insert(ratingRows).select("id, movie_id, member_id, member_name, rating, first_time_watching");
      if (ratingResult.error || !ratingResult.data) throw new Error(ratingResult.error?.message ?? "The ratings could not be saved.");
      const savedNight = movieNightFromRows(night, persistedMovies, (ratingResult.data ?? []) as Array<{ id: string; movie_id: string; member_id: string | null; member_name: string; rating: number; first_time_watching: boolean }>);
      setNights((current) => sortMovieNights(editingNightId ? current.map((item) => item.id === editingNightId ? savedNight : item) : [savedNight, ...current]));
      notify(editingNightId ? "Movie night updated." : "Movie night saved.", "success");
      resetForm();
    } catch (error) {
      if (supabase && householdId && createdNightId) void supabase.from("movie_nights").delete().eq("id", createdNightId).eq("household_id", householdId);
      setMessage(error instanceof Error ? error.message : "The movie night could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8">
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-800 p-6 text-white shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">Family movie nights</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Roll the credits</h1><p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-violet-100">Keep a little record of the movies you watch together—and whose pick became the family favorite.</p></div>
          <button type="button" onClick={() => { if (showForm) resetForm(); else { setEditingNightId(null); setMessage(""); setShowForm(true); } }} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-violet-900 shadow-sm hover:bg-fuchsia-50"><AppIcon name="plus" className="size-4" />{showForm ? "Close form" : "Record a night"}</button>
        </div>
        <div className="mt-7 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-2xl font-black">{nights.length}</p><p className="text-xs font-bold text-violet-200">Nights recorded</p></div><div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-2xl font-black">{totalMovies}</p><p className="text-xs font-bold text-violet-200">Movies watched</p></div><div className="hidden rounded-2xl bg-white/10 p-3 ring-1 ring-white/10 sm:block"><p className="text-2xl font-black">{members.length}</p><p className="text-xs font-bold text-violet-200">Family raters</p></div></div>
      </section>


      {showForm && <div className={editingNightId ? "fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" : ""} role={editingNightId ? "dialog" : undefined} aria-modal={editingNightId ? true : undefined} aria-labelledby={editingNightId ? "edit-movie-night-title" : undefined}><form id="movie-night-form" onSubmit={saveMovieNight} className={`${editingNightId ? "max-h-[92vh] w-full max-w-4xl overflow-y-auto " : ""}rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-violet-100 dark:bg-white/5 dark:ring-white/10 md:p-7`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">{editingNightId ? "Edit memory" : "New memory"}</p><h2 id={editingNightId ? "edit-movie-night-title" : undefined} className="mt-1 text-2xl font-black">{editingNightId ? "Edit movie night" : "What did you watch?"}</h2><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">Add one or two movies, then capture everyone&apos;s rating.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-black">Date<input required type="date" value={watchedOn} onChange={(event) => setWatchedOn(event.target.value)} className="mt-1 block rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white" /></label></div></div><label className="mt-5 block text-sm font-bold">Night notes <span className="font-medium text-slate-500 dark:text-slate-300">(optional)</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={3} placeholder="What made this night memorable?" className="mt-2 block w-full resize-y rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white" /><span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">{notes.length}/1000</span></label><div className="mt-5 grid gap-4 md:grid-cols-2">{movieDrafts.map((movie, movieIndex) => <article key={movieIndex} className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-400/10"><div className="flex items-center justify-between gap-3"><h3 className="font-black">Movie {movieIndex + 1}</h3>{movieDrafts.length > 1 && <button type="button" onClick={() => setMovieDrafts((current) => current.filter((_, index) => index !== movieIndex))} className="text-xs font-black text-rose-600 hover:underline">Remove</button>}</div><label className="mt-3 block text-sm font-bold">Title<input required maxLength={120} value={movie.title} onChange={(event) => updateMovieTitle(movieIndex, event.target.value)} placeholder="e.g. Paddington 2" className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white" /></label><MovieSuggestions movie={movie} movieIndex={movieIndex} onSelectMovie={selectMovie} onUseTypedTitle={useTypedTitle} /><label className="mt-3 block text-sm font-bold">Where did you watch it?<StyledSelect value={movie.location} onChange={(event) => updateMovie(movieIndex, { location: event.target.value as MovieNightLocation })}>{movieNightLocationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</StyledSelect></label><label className="mt-3 block text-sm font-bold">Who picked it?<StyledSelect value={movie.pickerId} onChange={(event) => updateMovie(movieIndex, { pickerId: event.target.value })}><option value="">Choose a family member</option>{members.map((member) => <option key={member.id} value={String(member.id)}>{member.name}</option>)}</StyledSelect></label><div className="mt-4 border-t border-violet-200/70 pt-3 dark:border-white/10"><p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">Everyone&apos;s rating</p><div className="mt-2 grid gap-2">{members.map((member) => <label key={member.id} className="flex items-center gap-2 text-sm font-bold"><span className="min-w-0 flex-1 truncate">{member.name}</span><span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300"><input type="checkbox" checked={Boolean(movie.firstTimeWatching[String(member.id)])} onChange={(event) => updateFirstTime(movieIndex, String(member.id), event.target.checked)} aria-label={`${member.name} watched this movie for the first time`} className="size-4 accent-violet-600" /><span>First time</span></span><StyledSelect className="mt-0 w-28" aria-label={`${member.name}'s rating for ${movie.title || `movie ${movieIndex + 1}`}`} value={movie.ratings[String(member.id)] ?? ""} onChange={(event) => updateRating(movieIndex, String(member.id), event.target.value)}><option value="">Rating</option>{[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</StyledSelect></label>)}</div></div></article>)}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div>{movieDrafts.length === 1 && <button type="button" onClick={() => setMovieDrafts((current) => [...current, blankMovie()])} className="inline-flex items-center gap-2 rounded-xl bg-violet-100 px-3 py-2 text-sm font-black text-violet-700 hover:bg-violet-200 dark:bg-violet-400/20 dark:text-violet-200"><AppIcon name="plus" className="size-4" />Add a second movie</button>}</div><div className="flex items-center gap-2"><button type="button" onClick={resetForm} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">Cancel</button><button type="submit" disabled={saving || !members.length} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60">{saving ? "Saving…" : editingNightId ? "Save changes" : "Save movie night"}</button></div></div>{message && <p role="alert" className="mt-3 text-sm font-bold text-rose-600 dark:text-rose-300">{message}</p>}<p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Movie data and posters powered by <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="font-black underline underline-offset-2">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.</p></form></div>}

      {!showForm && (loading ? <div role="status" className="rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><p className="font-black">Loading movie nights…</p><p className="mt-1 text-sm font-semibold text-slate-400">Gathering your family movie memories.</p></div> : message && !showForm ? <div role="alert" className="rounded-2xl bg-rose-50 p-5 text-sm font-bold text-rose-800 ring-1 ring-rose-100 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20">{message}</div> : nights.length === 0 ? <div className="rounded-[2rem] border-2 border-dashed border-violet-200 bg-white/70 px-5 py-14 text-center dark:border-violet-300/20 dark:bg-white/5"><div className="mx-auto grid size-16 place-items-center rounded-3xl bg-violet-100 text-violet-700 dark:bg-violet-400/20 dark:text-violet-200"><AppIcon name="movieNight" className="size-8" /></div><h2 className="mt-5 text-xl font-black">Your movie history starts here</h2><p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500 dark:text-slate-300">Record your first family movie night to remember the date, the picks, and everyone&apos;s ratings.</p><button type="button" onClick={() => setShowForm(true)} className="mt-5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-700">Record the first night</button></div> : <section aria-label="Recorded movie nights" className="grid gap-5 md:grid-cols-2">{nights.map((night) => <article key={night.id} className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><button type="button" key={night.id} onClick={() => setSelectedNight(night)} className="group block w-full text-left transition hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"><div className="bg-gradient-to-br from-violet-100 via-fuchsia-50 to-amber-50 p-5 dark:from-violet-400/20 dark:via-fuchsia-400/10 dark:to-amber-400/10"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-violet-800 shadow-sm dark:bg-white/10 dark:text-violet-100">{formatDate(night.watchedOn)}</span><AppIcon name="movieNight" className="size-6 text-violet-500 transition-transform group-hover:rotate-6 dark:text-violet-200" /></div><div className="mt-8 grid min-h-28 place-items-center">{night.movies.some((movie) => movie.posterPath) ? <div className={`grid w-full gap-3 ${night.movies.length === 1 ? "mx-auto max-w-32 grid-cols-1" : "grid-cols-2"}`}>{night.movies.map((movie) => <div key={movie.id} className="overflow-hidden rounded-2xl bg-violet-200/60 shadow-sm dark:bg-violet-400/20">{posterUrl(movie.posterPath) ? <img src={posterUrl(movie.posterPath)!} alt={`${movie.title} poster`} className="aspect-[2/3] w-full object-cover" loading="lazy" /> : <div className="grid aspect-[2/3] place-items-center"><AppIcon name="movieNight" className="size-8 text-violet-500" /></div>}</div>)}</div> : <div className="text-center"><p className="text-4xl" aria-hidden="true">🍿</p><p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-violet-700/70 dark:text-violet-100/70">Family feature</p></div>}</div></div><div className="p-5"><div className="space-y-3">{night.movies.map((movie) => <div key={movie.id} className="flex items-center gap-3"><span className="min-w-0 flex-1"><span className="block truncate font-black">{movie.title}</span><span className="block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{movie.pickerName ? `${movie.pickerName}'s pick` : "Pick not recorded"} · {movieNightLocationLabel(movie.location)}</span></span><span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800 dark:bg-amber-400/20 dark:text-amber-100">{ratingLabel(averageRating(movie))}</span></div>)}</div><p className="mt-5 text-xs font-bold text-slate-500 dark:text-slate-400">View details →</p></div></button><div className="flex justify-end border-t border-slate-100 px-5 py-3 dark:border-white/10"><button type="button" onClick={() => beginEditingMovieNight(night)} className="inline-flex items-center gap-2 rounded-xl bg-violet-100 px-3 py-2 text-xs font-black text-violet-700 hover:bg-violet-200 dark:bg-violet-400/20 dark:text-violet-200"><AppIcon name="edit" className="size-4" />Edit</button></div></article>)}</section>)}
    </div>

    {selectedNight && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedNight(null); }}><article role="dialog" aria-modal="true" aria-labelledby="movie-night-dialog-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-[#242435] md:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Family movie night</p><h2 id="movie-night-dialog-title" className="mt-1 text-2xl font-black">{formatDate(selectedNight.watchedOn)}</h2></div><button type="button" onClick={() => setSelectedNight(null)} aria-label="Close movie night details" className="grid size-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><AppIcon name="close" className="size-5" /></button></div>{selectedNight.notes && <div className="mt-6 rounded-2xl bg-amber-50 p-4 dark:bg-amber-400/10"><p className="text-xs font-black uppercase tracking-wide text-amber-800 dark:text-amber-100">Night notes</p><p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-200">{selectedNight.notes}</p></div>}<div className="mt-6 grid gap-4">{selectedNight.movies.map((movie) => <section key={movie.id} className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-400/10"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-wide text-violet-600 dark:text-violet-300">Movie {movie.position}</p><h3 className="mt-1 text-xl font-black">{movie.title}</h3><p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">Watched in {movieNightLocationLabel(movie.location)}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-800 dark:bg-amber-400/20 dark:text-amber-100">Family average {ratingLabel(averageRating(movie))}</span></div><p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Picked by <span className="font-black">{movie.pickerName ?? "a family member"}</span></p><div className="mt-4 grid gap-2 sm:grid-cols-2">{movie.ratings.map((rating) => <div key={rating.id} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm font-bold dark:bg-white/10"><span className="flex items-center gap-2"><span>{rating.memberName}</span>{rating.firstTimeWatching && <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-fuchsia-700 dark:bg-fuchsia-400/20 dark:text-fuchsia-200">First time</span>}</span><span className="text-amber-700 dark:text-amber-200">{rating.rating} / 5</span></div>)}</div></section>)}</div></article></div>}
  </section>;
}

"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AppIcon, StyledSelect, useAppNotifications } from "@/components/home/shared-ui";
import type { Member } from "@/features/home/model";
import { supabase } from "@/lib/supabase";

type MovieNightRating = { id: string; memberId: string | null; memberName: string; rating: number };
type MovieNightMovie = { id: string; position: number; title: string; pickerMemberId: string | null; pickerName: string | null; ratings: MovieNightRating[] };
type MovieNight = { id: string; watchedOn: string; createdAt: string; movies: MovieNightMovie[] };
type MovieDraft = { title: string; pickerId: string; ratings: Record<string, string> };

function blankMovie(): MovieDraft {
  return { title: "", pickerId: "", ratings: {} };
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

function movieNightFromRows(night: { id: string; watched_on: string; created_at: string }, movieRows: Array<{ id: string; position: number; title: string; picker_member_id: string | null; picker_name: string | null }>, ratingRows: Array<{ id: string; movie_id: string; member_id: string | null; member_name: string; rating: number }>): MovieNight {
  return {
    id: night.id,
    watchedOn: night.watched_on,
    createdAt: night.created_at,
    movies: movieRows.sort((first, second) => first.position - second.position).map((movie) => ({
      id: movie.id,
      position: movie.position,
      title: movie.title,
      pickerMemberId: movie.picker_member_id,
      pickerName: movie.picker_name,
      ratings: ratingRows.filter((rating) => rating.movie_id === movie.id).map((rating) => ({ id: rating.id, memberId: rating.member_id, memberName: rating.member_name, rating: rating.rating })),
    })),
  };
}

export function MovieNightPage({ householdId, members, currentUserId }: { householdId: string | null; members: Member[]; currentUserId: string | null }) {
  const { notify, confirm } = useAppNotifications();
  const [nights, setNights] = useState<MovieNight[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedNight, setSelectedNight] = useState<MovieNight | null>(null);
  const [watchedOn, setWatchedOn] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [movieDrafts, setMovieDrafts] = useState<MovieDraft[]>([blankMovie()]);

  useEffect(() => {
    if (!selectedNight) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedNight(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedNight]);

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
      const nightResult = await supabase.from("movie_nights").select("id, watched_on, created_at").eq("household_id", householdId).order("watched_on", { ascending: false }).order("created_at", { ascending: false });
      if (cancelled) return;
      if (nightResult.error) {
        setMessage(nightResult.error.code === "42P01" ? "Run the Movie Night migration in Supabase first." : `Could not load movie nights: ${nightResult.error.message}`);
        setLoading(false);
        return;
      }
      const loadedNights = (nightResult.data ?? []) as Array<{ id: string; watched_on: string; created_at: string }>;
      if (!loadedNights.length) {
        setNights([]);
        setLoading(false);
        return;
      }
      const nightIds = loadedNights.map((night) => night.id);
      const movieResult = await supabase.from("movie_night_movies").select("id, movie_night_id, position, title, picker_member_id, picker_name").in("movie_night_id", nightIds);
      if (movieResult.error) {
        setMessage(`Could not load the movies: ${movieResult.error.message}`);
        setLoading(false);
        return;
      }
      const loadedMovies = (movieResult.data ?? []) as Array<{ id: string; movie_night_id: string; position: number; title: string; picker_member_id: string | null; picker_name: string | null }>;
      const movieIds = loadedMovies.map((movie) => movie.id);
      const ratingResult = movieIds.length
        ? await supabase.from("movie_night_ratings").select("id, movie_id, member_id, member_name, rating").in("movie_id", movieIds)
        : { data: [], error: null };
      if (ratingResult.error) {
        setMessage(`Could not load family ratings: ${ratingResult.error.message}`);
        setLoading(false);
        return;
      }
      if (!cancelled) {
        setNights(loadedNights.map((night) => movieNightFromRows(night, loadedMovies.filter((movie) => movie.movie_night_id === night.id), (ratingResult.data ?? []) as Array<{ id: string; movie_id: string; member_id: string | null; member_name: string; rating: number }>)));
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

  function resetForm() {
    setWatchedOn(new Date().toLocaleDateString("en-CA"));
    setMovieDrafts([blankMovie()]);
    setShowForm(false);
    setMessage("");
  }

  async function saveMovieNight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!watchedOn) { setMessage("Choose the night you watched the movie."); return; }
    if (!members.length) { setMessage("Add family members before recording ratings."); return; }
    const preparedMovies = movieDrafts.map((movie, index) => ({
      position: index + 1,
      title: movie.title.trim(),
      pickerId: movie.pickerId || null,
      pickerName: members.find((member) => String(member.id) === movie.pickerId)?.name ?? null,
      ratings: members.map((member) => ({ memberId: member.id, memberName: member.name, rating: Number(movie.ratings[String(member.id)] ?? "") })),
    }));
    if (preparedMovies.some((movie) => !movie.title)) { setMessage("Give each movie a title."); return; }
    if (preparedMovies.some((movie) => !movie.pickerId)) { setMessage("Choose who picked each movie."); return; }
    if (preparedMovies.some((movie) => movie.ratings.some((rating) => !Number.isInteger(rating.rating) || rating.rating < 1 || rating.rating > 5))) {
      setMessage("Choose a rating from 1 to 5 for everyone and every movie.");
      return;
    }

    setSaving(true);
    setMessage("");
    let createdNightId: string | null = null;
    try {
      if (!supabase || !householdId) {
        const localNight: MovieNight = {
          id: `local-${Date.now()}`,
          watchedOn,
          createdAt: new Date().toISOString(),
          movies: preparedMovies.map((movie) => ({ id: `local-${Date.now()}-${movie.position}`, position: movie.position, title: movie.title, pickerMemberId: movie.pickerId ? String(movie.pickerId) : null, pickerName: movie.pickerName, ratings: movie.ratings.map((rating, index) => ({ id: `local-rating-${index}`, memberId: String(rating.memberId), memberName: rating.memberName, rating: rating.rating })) })),
        };
        setNights((current) => [localNight, ...current]);
        notify("Movie night saved.", "success");
        resetForm();
        return;
      }

      const nightResult = await supabase.from("movie_nights").insert({ household_id: householdId, watched_on: watchedOn, created_by: currentUserId }).select("id, watched_on, created_at").single();
      if (nightResult.error || !nightResult.data) throw new Error(nightResult.error?.message ?? "The movie night could not be created.");
      const night = nightResult.data as { id: string; watched_on: string; created_at: string };
      createdNightId = night.id;
      const movieResult = await supabase.from("movie_night_movies").insert(preparedMovies.map((movie) => ({ movie_night_id: night.id, position: movie.position, title: movie.title, picker_member_id: movie.pickerId, picker_name: movie.pickerName }))).select("id, position, title, picker_member_id, picker_name");
      if (movieResult.error || !movieResult.data) throw new Error(movieResult.error?.message ?? "The movies could not be created.");
      const insertedMovies = movieResult.data as Array<{ id: string; position: number; title: string; picker_member_id: string | null; picker_name: string | null }>;
      const ratingRows = preparedMovies.flatMap((movie) => {
        const insertedMovie = insertedMovies.find((item) => item.position === movie.position);
        return insertedMovie ? movie.ratings.map((rating) => ({ movie_id: insertedMovie.id, member_id: rating.memberId, member_name: rating.memberName, rating: rating.rating })) : [];
      });
      const ratingResult = await supabase.from("movie_night_ratings").insert(ratingRows).select("id, movie_id, member_id, member_name, rating");
      if (ratingResult.error || !ratingResult.data) throw new Error(ratingResult.error?.message ?? "The ratings could not be saved.");
      const savedNight = movieNightFromRows(night, insertedMovies, (ratingResult.data ?? []) as Array<{ id: string; movie_id: string; member_id: string | null; member_name: string; rating: number }>);
      setNights((current) => [savedNight, ...current].sort((first, second) => second.watchedOn.localeCompare(first.watchedOn)));
      notify("Movie night saved.", "success");
      resetForm();
    } catch (error) {
      if (supabase && householdId && createdNightId) void supabase.from("movie_nights").delete().eq("id", createdNightId).eq("household_id", householdId);
      setMessage(error instanceof Error ? error.message : "The movie night could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMovieNight(night: MovieNight) {
    if (!await confirm(`Delete the movie night from ${formatDate(night.watchedOn)}?`, { title: "Delete movie night?", destructive: true })) return;
    setDeletingId(night.id);
    if (supabase && householdId && !night.id.startsWith("local-")) {
      const { error } = await supabase.from("movie_nights").delete().eq("id", night.id).eq("household_id", householdId);
      if (error) { notify(`Could not delete this movie night: ${error.message}`); setDeletingId(null); return; }
    }
    setNights((current) => current.filter((item) => item.id !== night.id));
    setSelectedNight(null);
    setDeletingId(null);
    notify("Movie night deleted.", "success");
  }

  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8">
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-800 p-6 text-white shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">Family movie nights</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Roll the credits</h1><p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-violet-100">Keep a little record of the movies you watch together—and whose pick became the family favorite.</p></div>
          <button type="button" onClick={() => { setMessage(""); setShowForm((visible) => !visible); }} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-violet-900 shadow-sm hover:bg-fuchsia-50"><AppIcon name="plus" className="size-4" />{showForm ? "Close form" : "Record a night"}</button>
        </div>
        <div className="mt-7 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-2xl font-black">{nights.length}</p><p className="text-xs font-bold text-violet-200">Nights recorded</p></div><div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-2xl font-black">{totalMovies}</p><p className="text-xs font-bold text-violet-200">Movies watched</p></div><div className="hidden rounded-2xl bg-white/10 p-3 ring-1 ring-white/10 sm:block"><p className="text-2xl font-black">{members.length}</p><p className="text-xs font-bold text-violet-200">Family raters</p></div></div>
      </section>

      {showForm && <form onSubmit={saveMovieNight} className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-violet-100 dark:bg-white/5 dark:ring-white/10 md:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">New memory</p><h2 className="mt-1 text-2xl font-black">What did you watch?</h2><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">Add one or two movies, then capture everyone&apos;s rating.</p></div><label className="text-sm font-black">Date<input required type="date" value={watchedOn} onChange={(event) => setWatchedOn(event.target.value)} className="mt-1 block rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white" /></label></div><div className="mt-5 grid gap-4 md:grid-cols-2">{movieDrafts.map((movie, movieIndex) => <article key={movieIndex} className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-400/10"><div className="flex items-center justify-between gap-3"><h3 className="font-black">Movie {movieIndex + 1}</h3>{movieDrafts.length > 1 && <button type="button" onClick={() => setMovieDrafts((current) => current.filter((_, index) => index !== movieIndex))} className="text-xs font-black text-rose-600 hover:underline">Remove</button>}</div><label className="mt-3 block text-sm font-bold">Title<input required maxLength={120} value={movie.title} onChange={(event) => updateMovie(movieIndex, { title: event.target.value })} placeholder="e.g. Paddington 2" className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white" /></label><label className="mt-3 block text-sm font-bold">Who picked it?<StyledSelect value={movie.pickerId} onChange={(event) => updateMovie(movieIndex, { pickerId: event.target.value })}><option value="">Choose a family member</option>{members.map((member) => <option key={member.id} value={String(member.id)}>{member.name}</option>)}</StyledSelect></label><div className="mt-4 border-t border-violet-200/70 pt-3 dark:border-white/10"><p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">Everyone&apos;s rating</p><div className="mt-2 grid gap-2">{members.map((member) => <label key={member.id} className="flex items-center gap-2 text-sm font-bold"><span className="min-w-0 flex-1 truncate">{member.name}</span><StyledSelect className="mt-0 w-28" aria-label={`${member.name}'s rating for ${movie.title || `movie ${movieIndex + 1}`}`} value={movie.ratings[String(member.id)] ?? ""} onChange={(event) => updateRating(movieIndex, String(member.id), event.target.value)}><option value="">Rating</option>{[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</StyledSelect></label>)}</div></div></article>)}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div>{movieDrafts.length === 1 && <button type="button" onClick={() => setMovieDrafts((current) => [...current, blankMovie()])} className="inline-flex items-center gap-2 rounded-xl bg-violet-100 px-3 py-2 text-sm font-black text-violet-700 hover:bg-violet-200 dark:bg-violet-400/20 dark:text-violet-200"><AppIcon name="plus" className="size-4" />Add a second movie</button>}</div><div className="flex items-center gap-2"><button type="button" onClick={resetForm} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">Cancel</button><button type="submit" disabled={saving || !members.length} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60">{saving ? "Saving…" : "Save movie night"}</button></div></div>{message && <p role="alert" className="mt-3 text-sm font-bold text-rose-600 dark:text-rose-300">{message}</p>}</form>}

      {loading ? <div role="status" className="rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><p className="font-black">Loading movie nights…</p><p className="mt-1 text-sm font-semibold text-slate-400">Gathering your family movie memories.</p></div> : message && !showForm ? <div role="alert" className="rounded-2xl bg-rose-50 p-5 text-sm font-bold text-rose-800 ring-1 ring-rose-100 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20">{message}</div> : nights.length === 0 ? <div className="rounded-[2rem] border-2 border-dashed border-violet-200 bg-white/70 px-5 py-14 text-center dark:border-violet-300/20 dark:bg-white/5"><div className="mx-auto grid size-16 place-items-center rounded-3xl bg-violet-100 text-violet-700 dark:bg-violet-400/20 dark:text-violet-200"><AppIcon name="movieNight" className="size-8" /></div><h2 className="mt-5 text-xl font-black">Your movie history starts here</h2><p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500 dark:text-slate-300">Record your first family movie night to remember the date, the picks, and everyone&apos;s ratings.</p><button type="button" onClick={() => setShowForm(true)} className="mt-5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-700">Record the first night</button></div> : <section aria-label="Recorded movie nights" className="grid gap-5 md:grid-cols-2">{nights.map((night) => <button type="button" key={night.id} onClick={() => setSelectedNight(night)} className="group overflow-hidden rounded-[2rem] bg-white text-left shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:bg-white/5 dark:ring-white/10"><div className="bg-gradient-to-br from-violet-100 via-fuchsia-50 to-amber-50 p-5 dark:from-violet-400/20 dark:via-fuchsia-400/10 dark:to-amber-400/10"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-violet-800 shadow-sm dark:bg-white/10 dark:text-violet-100">{formatDate(night.watchedOn)}</span><AppIcon name="movieNight" className="size-6 text-violet-500 transition-transform group-hover:rotate-6 dark:text-violet-200" /></div><div className="mt-8 grid min-h-28 place-items-center"><div className="text-center"><p className="text-4xl" aria-hidden="true">🍿</p><p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-violet-700/70 dark:text-violet-100/70">Family feature</p></div></div></div><div className="p-5"><div className="space-y-3">{night.movies.map((movie) => <div key={movie.id} className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-sm font-black text-violet-700 dark:bg-violet-400/20 dark:text-violet-200">{movie.position}</span><span className="min-w-0 flex-1 truncate font-black">{movie.title}</span><span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800 dark:bg-amber-400/20 dark:text-amber-100">{ratingLabel(averageRating(movie))}</span></div>)}</div><p className="mt-5 text-xs font-bold text-slate-500 dark:text-slate-400">{night.movies.map((movie) => movie.pickerName ? `${movie.pickerName}'s pick` : "Pick not recorded").join(" · ")} · View details →</p></div></button>)}</section>}
    </div>

    {selectedNight && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedNight(null); }}><article role="dialog" aria-modal="true" aria-labelledby="movie-night-dialog-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-[#242435] md:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Family movie night</p><h2 id="movie-night-dialog-title" className="mt-1 text-2xl font-black">{formatDate(selectedNight.watchedOn)}</h2></div><button type="button" onClick={() => setSelectedNight(null)} aria-label="Close movie night details" className="grid size-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><AppIcon name="close" className="size-5" /></button></div><div className="mt-6 grid gap-4">{selectedNight.movies.map((movie) => <section key={movie.id} className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-400/10"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-wide text-violet-600 dark:text-violet-300">Movie {movie.position}</p><h3 className="mt-1 text-xl font-black">{movie.title}</h3></div><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-800 dark:bg-amber-400/20 dark:text-amber-100">Family average {ratingLabel(averageRating(movie))}</span></div><p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Picked by <span className="font-black">{movie.pickerName ?? "a family member"}</span></p><div className="mt-4 grid gap-2 sm:grid-cols-2">{movie.ratings.map((rating) => <div key={rating.id} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm font-bold dark:bg-white/10"><span>{rating.memberName}</span><span className="text-amber-700 dark:text-amber-200">{rating.rating} / 5</span></div>)}</div></section>)}</div><div className="mt-6 flex justify-end"><button type="button" onClick={() => void deleteMovieNight(selectedNight)} disabled={deletingId === selectedNight.id} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:hover:bg-rose-400/10"><AppIcon name="trash" className="size-4" />{deletingId === selectedNight.id ? "Deleting…" : "Delete record"}</button></div></article></div>}
  </section>;
}

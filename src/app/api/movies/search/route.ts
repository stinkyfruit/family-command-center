type TmdbMovie = {
  id?: unknown;
  title?: unknown;
  release_date?: unknown;
  poster_path?: unknown;
};

function movieResult(movie: TmdbMovie) {
  if (typeof movie.id !== "number" || typeof movie.title !== "string") return null;
  const releaseDate = typeof movie.release_date === "string" ? movie.release_date : "";
  const releaseYear = /^\d{4}/.test(releaseDate) ? Number(releaseDate.slice(0, 4)) : null;
  return {
    id: movie.id,
    title: movie.title,
    releaseYear,
    posterPath: typeof movie.poster_path === "string" && movie.poster_path.startsWith("/") ? movie.poster_path : null,
  };
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return Response.json({ error: "Search for at least two characters." }, { status: 400 });
  if (query.length > 80) return Response.json({ error: "Keep the movie search under 80 characters." }, { status: 400 });

  const accessToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!accessToken) return Response.json({ error: "Movie lookup is not configured yet." }, { status: 503 });

  const searchUrl = new URL("https://api.themoviedb.org/3/search/movie");
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("include_adult", "false");
  searchUrl.searchParams.set("language", "en-US");
  searchUrl.searchParams.set("page", "1");

  try {
    const response = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return Response.json({ error: response.status === 429 ? "Movie lookup is temporarily rate-limited. Try again in a moment." : "Movie lookup is unavailable right now." }, { status: response.status === 429 ? 429 : 502 });
    const payload = await response.json() as { results?: TmdbMovie[] };
    const results = (payload.results ?? []).map(movieResult).filter((movie): movie is NonNullable<ReturnType<typeof movieResult>> => Boolean(movie)).slice(0, 8);
    return Response.json({ results });
  } catch {
    return Response.json({ error: "Movie lookup is unavailable right now." }, { status: 502 });
  }
}

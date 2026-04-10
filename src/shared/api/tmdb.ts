import { TMDBResponse, MediaItem, MovieDetails, TVDetails, SeasonDetails, Genre } from "@/shared/types/media";

const BASE_URL = process.env.NEXT_PUBLIC_TMDB_BASE_URL || "https://api.themoviedb.org/3";
const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "";

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Trending
export async function getTrending(
  mediaType: "all" | "movie" | "tv" = "all",
  timeWindow: "day" | "week" = "week",
  page: number = 1
): Promise<TMDBResponse<MediaItem>> {
  return tmdbFetch(`/trending/${mediaType}/${timeWindow}`, { page: page.toString() });
}

// Search
export async function searchMulti(
  query: string,
  page: number = 1
): Promise<TMDBResponse<MediaItem>> {
  return tmdbFetch("/search/multi", { query, page: page.toString(), include_adult: "false" });
}

// Movie Details
export async function getMovieDetails(id: number): Promise<MovieDetails> {
  return tmdbFetch(`/movie/${id}`, { append_to_response: "credits,similar,videos" });
}

// TV Details
export async function getTVDetails(id: number): Promise<TVDetails> {
  return tmdbFetch(`/tv/${id}`, { append_to_response: "credits,similar,videos" });
}

// Season Details
export async function getSeasonDetails(tvId: number, seasonNumber: number): Promise<SeasonDetails> {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`);
}

// Discover Movies
export async function discoverMovies(
  page: number = 1,
  genreId?: number,
  sortBy: string = "popularity.desc"
): Promise<TMDBResponse<MediaItem>> {
  const params: Record<string, string> = {
    page: page.toString(),
    sort_by: sortBy,
    include_adult: "false",
  };
  if (genreId) params.with_genres = genreId.toString();
  return tmdbFetch("/discover/movie", params);
}

// Discover TV
export async function discoverTV(
  page: number = 1,
  genreId?: number,
  sortBy: string = "popularity.desc"
): Promise<TMDBResponse<MediaItem>> {
  const params: Record<string, string> = {
    page: page.toString(),
    sort_by: sortBy,
    include_adult: "false",
  };
  if (genreId) params.with_genres = genreId.toString();
  return tmdbFetch("/discover/tv", params);
}

// Genres
export async function getMovieGenres(): Promise<{ genres: Genre[] }> {
  return tmdbFetch("/genre/movie/list");
}

export async function getTVGenres(): Promise<{ genres: Genre[] }> {
  return tmdbFetch("/genre/tv/list");
}

// Popular
export async function getPopularMovies(page: number = 1): Promise<TMDBResponse<MediaItem>> {
  return tmdbFetch("/movie/popular", { page: page.toString() });
}

export async function getPopularTV(page: number = 1): Promise<TMDBResponse<MediaItem>> {
  return tmdbFetch("/tv/popular", { page: page.toString() });
}

// Top Rated
export async function getTopRatedMovies(page: number = 1): Promise<TMDBResponse<MediaItem>> {
  return tmdbFetch("/movie/top_rated", { page: page.toString() });
}

export async function getTopRatedTV(page: number = 1): Promise<TMDBResponse<MediaItem>> {
  return tmdbFetch("/tv/top_rated", { page: page.toString() });
}

// Filipino Content (Pinoy Power)
export async function getFilipinoMovies(page: number = 1): Promise<TMDBResponse<MediaItem>> {
  return tmdbFetch("/discover/movie", {
    page: page.toString(),
    with_original_language: "tl",
    sort_by: "popularity.desc",
    include_adult: "false"
  });
}

export async function getFilipinoTV(page: number = 1): Promise<TMDBResponse<MediaItem>> {
  return tmdbFetch("/discover/tv", {
    page: page.toString(),
    with_original_language: "tl",
    sort_by: "popularity.desc",
    include_adult: "false"
  });
}

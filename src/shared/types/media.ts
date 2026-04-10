// TMDB Media Types

export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  media_type?: "movie" | "tv";
  popularity: number;
  original_language: string;
  adult: boolean;
}

export interface MovieDetails extends MediaItem {
  runtime: number;
  tagline: string;
  status: string;
  budget: number;
  revenue: number;
  genres: Genre[];
  production_companies: ProductionCompany[];
  credits?: Credits;
  similar?: { results: MediaItem[] };
  videos?: { results: Video[] };
}

export interface TVDetails extends MediaItem {
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  tagline: string;
  status: string;
  genres: Genre[];
  seasons: Season[];
  created_by: Creator[];
  credits?: Credits;
  similar?: { results: MediaItem[] };
  videos?: { results: Video[] };
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  overview: string;
  air_date: string | null;
}

export interface SeasonDetails extends Season {
  episodes: Episode[];
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface Credits {
  cast: CastMember[];
  crew: CrewMember[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
}

export interface Creator {
  id: number;
  name: string;
  profile_path: string | null;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export type ContentType = "movie" | "tv";

export function getTitle(item: MediaItem): string {
  return item.title || item.name || "Unknown Title";
}

export function getReleaseYear(item: MediaItem): string {
  const date = item.release_date || item.first_air_date;
  return date ? new Date(date).getFullYear().toString() : "";
}

export function getPosterUrl(path: string | null, size: string = "w500"): string {
  if (!path) return "";
  return `${process.env.NEXT_PUBLIC_TMDB_IMAGE_URL}/${size}${path}`;
}

export function getBackdropUrl(path: string | null, size: string = "original"): string {
  if (!path) return "";
  return `${process.env.NEXT_PUBLIC_TMDB_IMAGE_URL}/${size}${path}`;
}

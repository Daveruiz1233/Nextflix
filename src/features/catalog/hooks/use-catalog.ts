"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  getTrending,
  searchMulti,
  discoverMovies,
  discoverTV,
  getMovieGenres,
  getTVGenres,
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
} from "@/shared/api/tmdb";

export function useTrending(timeWindow: "day" | "week" = "week") {
  return useQuery({
    queryKey: ["trending", timeWindow],
    queryFn: () => getTrending("all", timeWindow),
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => searchMulti(query),
    enabled: query.length >= 2,
  });
}

export function usePopularMovies() {
  return useQuery({
    queryKey: ["popular", "movies"],
    queryFn: () => getPopularMovies(),
  });
}

export function usePopularTV() {
  return useQuery({
    queryKey: ["popular", "tv"],
    queryFn: () => getPopularTV(),
  });
}

export function useTopRatedMovies() {
  return useQuery({
    queryKey: ["toprated", "movies"],
    queryFn: () => getTopRatedMovies(),
  });
}

export function useGenres() {
  return useQuery({
    queryKey: ["genres"],
    queryFn: async () => {
      const [movieGenres, tvGenres] = await Promise.all([
        getMovieGenres(),
        getTVGenres(),
      ]);

      // Merge and deduplicate
      const genreMap = new Map<number, string>();
      [...movieGenres.genres, ...tvGenres.genres].forEach((g) => {
        genreMap.set(g.id, g.name);
      });

      return Array.from(genreMap.entries()).map(([id, name]) => ({ id, name }));
    },
  });
}

export function useDiscover(contentType: "movie" | "tv", genreId?: number) {
  return useInfiniteQuery({
    queryKey: ["discover", contentType, genreId],
    queryFn: ({ pageParam }) => {
      if (contentType === "movie") {
        return discoverMovies(pageParam, genreId);
      }
      return discoverTV(pageParam, genreId);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
  });
}

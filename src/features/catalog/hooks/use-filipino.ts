"use client";

import { useQuery } from "@tanstack/react-query";
import { getFilipinoMovies, getFilipinoTV } from "@/shared/api/tmdb";

export function useFilipinoMovies() {
  return useQuery({
    queryKey: ["filipino-movies"],
    queryFn: () => getFilipinoMovies(),
  });
}

export function useFilipinoTV() {
  return useQuery({
    queryKey: ["filipino-tv"],
    queryFn: () => getFilipinoTV(),
  });
}

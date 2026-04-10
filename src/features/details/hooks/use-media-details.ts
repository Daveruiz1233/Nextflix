"use client";

import { useQuery } from "@tanstack/react-query";
import { getMovieDetails, getTVDetails } from "@/shared/api/tmdb";
import { ContentType, MovieDetails, TVDetails } from "@/shared/types/media";

export function useMediaDetails(id: number, type: ContentType) {
  return useQuery<MovieDetails | TVDetails>({
    queryKey: ["details", type, id],
    queryFn: () => {
      if (type === "movie") return getMovieDetails(id);
      return getTVDetails(id);
    },
    enabled: !!id,
  });
}

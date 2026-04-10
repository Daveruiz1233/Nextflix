"use client";

import { useQuery } from "@tanstack/react-query";
import { getSeasonDetails } from "@/shared/api/tmdb";

export function useEpisodes(tvId: number, seasonNumber: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ["season", tvId, seasonNumber],
    queryFn: () => getSeasonDetails(tvId, seasonNumber),
    enabled: enabled && !!tvId && seasonNumber >= 0,
  });
}

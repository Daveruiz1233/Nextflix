"use client";

import { useState, useEffect } from "react";

import { useTrending, usePopularMovies, usePopularTV, useTopRatedMovies } from "./hooks";
import { useFilipinoMovies, useFilipinoTV } from "./hooks/use-filipino";
import { HeroBanner, MediaRow } from "./components";
import { FullPageSpinner } from "@/shared/components";
import { MediaItem } from "@/shared/types/media";
import { motion } from "framer-motion";
import { Film, Film as FilmIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function CatalogPage() {
  const { data: trending, isLoading: trendingLoading, error: trendingError } = useTrending();
  const { data: popularMovies, isLoading: popularMoviesLoading } = usePopularMovies();
  const { data: popularTV, isLoading: popularTVLoading } = usePopularTV();
  const { data: topRatedMovies } = useTopRatedMovies();
  const { data: pinoyMovies, isLoading: pinoyMoviesLoading } = useFilipinoMovies();
  const { data: pinoyTV, isLoading: pinoyTVLoading } = useFilipinoTV();

  const isAnyLoading = trendingLoading || popularMoviesLoading || popularTVLoading || pinoyMoviesLoading || pinoyTVLoading;
  const hasData = !!(trending?.results?.length || popularMovies?.results?.length || popularTV?.results?.length);
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;

  // DIAGNOSTIC LOGIC

  // Combine Pinoy movies and TV for a single row
  const pinoyHits = [
    ...(pinoyMovies?.results || []).map(m => ({ ...m, media_type: "movie" as const })),
    ...(pinoyTV?.results || []).map(t => ({ ...t, media_type: "tv" as const }))
  ]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 20);

  // Show spinner only on initial load with no error
  if (trendingLoading && !trendingError) return <FullPageSpinner />;

  return (
    <div className="relative min-h-screen bg-nf-bg pb-20 overflow-x-hidden">

      {/* Hero Section with extra padding-top to account for fixed header if needed */}
      {trending?.results && trending.results.length > 0 && (
        <HeroBanner items={trending.results.filter(i => i.backdrop_path)} />
      )}

      {/* Content area */}
      <div className={cn("relative z-10 px-4 md:px-8 lg:px-12", hasData ? "mt-4 md:-mt-8 lg:-mt-12" : "pt-8")}>
        
        {/* API Key Missing Notice */}
        {!hasData && !trendingLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-nf-accent/10 flex items-center justify-center mb-6">
              <FilmIcon className="w-10 h-10 text-nf-accent" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Welcome to NEXTFLIX</h2>
            <p className="text-nf-text-muted max-w-md mb-2">
              To browse movies and TV shows, add your TMDB API key to your .env.local file.
            </p>
          </motion.div>
        )}

        {hasData && (
          <div className="flex flex-col gap-10">
            {popularMovies?.results && (
              <MediaRow
                title="Popular Movies"
                items={popularMovies.results}
                contentType="movie"
              />
            )}

            {popularTV?.results && (
              <MediaRow
                title="Popular TV Shows"
                items={popularTV.results}
                contentType="tv"
              />
            )}

            {topRatedMovies?.results && (
              <MediaRow
                title="Top Rated"
                items={topRatedMovies.results}
                contentType="movie"
              />
            )}

            {trending?.results && (
              <MediaRow
                title="Trending This Week"
                items={trending.results.filter(i => i.media_type === "movie" || i.media_type === "tv")}
              />
            )}

            {/* Filipino Hits Row - Pinoy Power at the bottom! */}
            {pinoyHits.length > 0 && (
              <MediaRow
                title="Pinoy Power: Filipino Hits"
                items={pinoyHits as MediaItem[]}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

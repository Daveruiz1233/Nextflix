"use client";

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
  const { data: popularMovies } = usePopularMovies();
  const { data: popularTV } = usePopularTV();
  const { data: topRatedMovies } = useTopRatedMovies();
  const { data: pinoyMovies } = useFilipinoMovies();
  const { data: pinoyTV } = useFilipinoTV();

  const hasData = !!(trending?.results?.length || popularMovies?.results?.length || popularTV?.results?.length);

  // Combine Pinoy movies and TV for a single row
  const pinoyHits = [...(pinoyMovies?.results || []), ...(pinoyTV?.results || [])]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 20);

  // Show spinner only on initial load with no error
  if (trendingLoading && !trendingError) return <FullPageSpinner />;

  return (
    <div className="min-h-[100dvh] pb-10">
      {/* Hero Banner - only show when data available */}
      {trending?.results && trending.results.length > 0 && (
        <HeroBanner items={trending.results.filter(i => i.backdrop_path)} />
      )}

      {/* Content area */}
      <div className={cn("relative z-10 px-4 md:px-8 lg:px-12", hasData ? "-mt-16 md:-mt-20" : "pt-8")}>
        
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
            {/* Filipino Hits Row - Pinoy Power! */}
            {pinoyHits.length > 0 && (
              <MediaRow
                title="Pinoy Power: Filipino Hits"
                items={pinoyHits as MediaItem[]}
              />
            )}

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
          </div>
        )}
      </div>
    </div>
  );
}

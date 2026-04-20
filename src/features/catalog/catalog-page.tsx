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
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasData && isAnyLoading) setShowDiagnostics(true);
    }, 5000); // Show diagnostics after 5 seconds of hanging
    return () => clearTimeout(timer);
  }, [hasData, isAnyLoading]);

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
      {/* 🛠️ SHIELD DIAGNOSTICS OVERLAY */}
      {showDiagnostics && (
        <div className="fixed top-20 left-4 right-4 z-[9999] p-4 rounded-xl border border-white/20 bg-black/99 backdrop-blur-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-red-500 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              SHIELD DIAGNOSTICS
            </h3>
            <button onClick={() => setShowDiagnostics(false)} className="text-white/40 hover:text-white px-2 py-1 text-xs">Close</button>
          </div>
          <div className="space-y-2 text-[10px] font-mono leading-tight">
            <div className="flex justify-between">
              <span className="text-white/60">TMDB API KEY:</span>
              <span className={apiKey ? "text-green-400" : "text-red-400"}>
                {apiKey ? `OK (**${apiKey.slice(-4)})` : "MISSING"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">TRENDING ERR:</span>
              <span className="text-red-400 text-right max-w-[150px] truncate">
                {trendingError ? (trendingError as any).message : "NONE"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">DEVICE AGENT:</span>
              <span className="text-blue-400 truncate max-w-[150px]">
                {typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full mt-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-white transition-colors border border-white/5"
          >
            HARD REBOOT / RELOAD
          </button>
        </div>
      )}

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

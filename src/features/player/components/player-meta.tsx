"use client";

import { motion } from "framer-motion";
import { Star, Calendar, Clock } from "lucide-react";
import { getTitle, getReleaseYear, ContentType } from "@/shared/types/media";
import { isMovieDetails, isTVDetails, MediaDetails } from "@/features/details/types";

interface PlayerMetaProps {
  details: MediaDetails;
  type: ContentType;
  className?: string;
}

export function PlayerMeta({ details, type, className }: PlayerMetaProps) {
  const title = getTitle(details);
  const year = getReleaseYear(details);

  const runtime = isMovieDetails(details)
    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
    : isTVDetails(details)
      ? `${details.number_of_seasons} Season${details.number_of_seasons > 1 ? "s" : ""}`
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      {/* Genres */}
      {details.genres && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {details.genres.slice(0, 3).map((genre) => (
            <span
              key={genre.id}
              className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/10 text-white/70"
            >
              {genre.name}
            </span>
          ))}
        </div>
      )}

      <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">
        {title}
      </h1>

      {/* Meta row */}
      <div className="flex items-center flex-wrap gap-3 mt-2 text-sm text-nf-text-muted">
        {details.vote_average > 0 && (
          <span className="flex items-center gap-1 text-yellow-400">
            <Star className="w-3.5 h-3.5 fill-yellow-400" />
            {details.vote_average.toFixed(1)}
          </span>
        )}
        {year && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {year}
          </span>
        )}
        {runtime && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {runtime}
          </span>
        )}
        <span className="uppercase text-xs font-medium px-2 py-0.5 rounded bg-white/10">
          {type === "tv" ? "Series" : "Movie"}
        </span>
      </div>

      {/* Overview */}
      <p className="mt-3 text-sm text-nf-text/70 line-clamp-3">
        {details.overview}
      </p>
    </motion.div>
  );
}

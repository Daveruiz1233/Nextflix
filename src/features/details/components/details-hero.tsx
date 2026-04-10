"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Play, ArrowLeft, Star, Clock, Calendar } from "lucide-react";
import { getTitle, getBackdropUrl, getReleaseYear, ContentType } from "@/shared/types/media";
import { MediaDetails, isMovieDetails, isTVDetails } from "../types";
import { GlassPanel } from "@/shared/components";

interface DetailsHeroProps {
  details: MediaDetails;
  type: ContentType;
}

export function DetailsHero({ details, type }: DetailsHeroProps) {
  const title = getTitle(details);
  const year = getReleaseYear(details);
  const backdropUrl = getBackdropUrl(details.backdrop_path);

  const runtime = isMovieDetails(details)
    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
    : isTVDetails(details)
      ? `${details.number_of_seasons} Season${details.number_of_seasons > 1 ? "s" : ""}`
      : null;

  return (
    <div className="relative w-full min-h-[55dvh] md:min-h-[65dvh]">
      {/* Backdrop */}
      {backdropUrl && (
        <Image
          src={backdropUrl}
          alt={title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-nf-bg via-nf-bg/60 to-nf-bg/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-nf-bg/70 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Genres */}
          {details.genres && (
            <div className="flex flex-wrap gap-2 mb-3">
              {details.genres.slice(0, 4).map((genre) => (
                <span
                  key={genre.id}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80 backdrop-blur-sm"
                >
                  {genre.name}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white max-w-3xl leading-tight">
            {title}
          </h1>

          {details.tagline && (
            <p className="mt-2 text-nf-text-muted italic text-sm md:text-base">
              &ldquo;{details.tagline}&rdquo;
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center flex-wrap gap-4 mt-4 text-sm text-nf-text-muted">
            {details.vote_average > 0 && (
              <span className="flex items-center gap-1.5 text-yellow-400">
                <Star className="w-4 h-4 fill-yellow-400" />
                {details.vote_average.toFixed(1)}
                <span className="text-nf-text-dim">({details.vote_count.toLocaleString()})</span>
              </span>
            )}
            {year && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {year}
              </span>
            )}
            {runtime && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {runtime}
              </span>
            )}
          </div>

          {/* Overview */}
          <p className="mt-4 text-sm md:text-base text-nf-text/80 max-w-2xl line-clamp-4 md:line-clamp-none">
            {details.overview}
          </p>

          {/* CTA */}
          <div className="flex items-center gap-3 mt-6">
            <Link
              href={`/watch?type=${type}&id=${details.id}`}
              className="flex items-center gap-2 px-8 py-3.5 rounded-lg bg-nf-accent hover:bg-nf-accent-hover text-white font-semibold transition-all shadow-lg shadow-nf-accent/30 hover:shadow-nf-accent/50 min-h-[48px]"
            >
              <Play className="w-5 h-5 fill-white" />
              Watch Now
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

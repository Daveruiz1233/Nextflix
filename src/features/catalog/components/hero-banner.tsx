"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Play, Info, Star } from "lucide-react";
import { MediaItem, getTitle, getReleaseYear, getBackdropUrl } from "@/shared/types/media";
import { useState, useEffect } from "react";

interface HeroBannerProps {
  items: MediaItem[];
}

export function HeroBanner({ items }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const featured = items.slice(0, 5);

  // Auto-rotate every 8 seconds
  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (featured.length === 0) return null;

  const current = featured[currentIndex];
  const title = getTitle(current);
  const year = getReleaseYear(current);
  const backdropUrl = getBackdropUrl(current.backdrop_path);
  const type = current.media_type || "movie";

  return (
    <div className="relative w-full h-[50dvh] md:h-[60dvh] lg:h-[70dvh] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
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
          <div className="absolute inset-0 bg-gradient-to-t from-nf-bg via-nf-bg/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-nf-bg/80 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 lg:p-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white max-w-2xl leading-tight">
              {title}
            </h1>

            <div className="flex items-center gap-3 mt-3 text-sm text-nf-text-muted">
              {current.vote_average > 0 && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-4 h-4 fill-yellow-400" />
                  {current.vote_average.toFixed(1)}
                </span>
              )}
              {year && <span>{year}</span>}
              <span className="uppercase text-xs font-medium px-2 py-0.5 rounded bg-white/10">
                {type === "tv" ? "TV Series" : "Movie"}
              </span>
            </div>

            <p className="mt-3 text-sm md:text-base text-nf-text/80 max-w-xl line-clamp-3">
              {current.overview}
            </p>

            <div className="flex items-center gap-3 mt-5">
              <Link
                href={`/watch?type=${type}&id=${current.id}`}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-nf-accent hover:bg-nf-accent-hover text-white font-semibold transition-colors min-h-[44px]"
              >
                <Play className="w-5 h-5 fill-white" />
                Play
              </Link>
              <Link
                href={`/details?type=${type}&id=${current.id}`}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors backdrop-blur-sm min-h-[44px]"
              >
                <Info className="w-5 h-5" />
                More Info
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Slide indicators */}
        {featured.length > 1 && (
          <div className="flex items-center gap-2 mt-6">
            {featured.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1 rounded-full transition-all duration-300 min-w-[20px] ${
                  idx === currentIndex
                    ? "bg-nf-accent w-8"
                    : "bg-white/30 w-5 hover:bg-white/50"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { MediaItem, getTitle, getReleaseYear, getPosterUrl } from "@/shared/types/media";

interface MediaCardProps {
  item: MediaItem;
  contentType?: "movie" | "tv";
  index?: number;
  className?: string;
}

export function MediaCard({ item, contentType, index = 0, className }: MediaCardProps) {
  const title = getTitle(item);
  const year = getReleaseYear(item);
  const posterUrl = getPosterUrl(item.poster_path, "w342");
  const type = contentType || item.media_type || "movie";

  return (
    <Link href={`/details?type=${type}&id=${item.id}`} className={cn("block group", className)}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        whileHover={{ scale: 1.05, y: -4 }}
        whileTap={{ scale: 0.98 }}
        className="relative overflow-hidden rounded-lg bg-nf-card cursor-pointer"
      >
        {/* Poster Image */}
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-nf-surface flex items-center justify-center">
              <span className="text-nf-text-dim text-xs">No Image</span>
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Rating Badge */}
          {item.vote_average > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-medium text-white">
                {item.vote_average.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="text-sm font-medium text-nf-text line-clamp-1 group-hover:text-white transition-colors">
            {title}
          </h3>
          {year && (
            <p className="text-xs text-nf-text-muted mt-0.5">{year}</p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

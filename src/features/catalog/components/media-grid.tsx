"use client";

import { MediaCard } from "@/shared/components";
import { MediaItem, ContentType } from "@/shared/types/media";
import { motion } from "framer-motion";

interface MediaGridProps {
  items: MediaItem[];
  contentType?: ContentType;
  className?: string;
}

export function MediaGrid({ items, contentType, className }: MediaGridProps) {
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center py-20"
      >
        <p className="text-nf-text-muted text-lg">No results found</p>
      </motion.div>
    );
  }

  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 ${className}`}
    >
      {items.map((item, index) => (
        <MediaCard
          key={item.id}
          item={item}
          contentType={contentType}
          index={index}
        />
      ))}
    </div>
  );
}

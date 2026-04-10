"use client";

import { motion } from "framer-motion";
import { MediaCard } from "@/shared/components";
import { MediaItem } from "@/shared/types/media";

interface MediaGridProps {
  items: MediaItem[];
  className?: string;
}

export function MediaGrid({ items, className }: MediaGridProps) {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-nf-text-dim">
        <p className="text-lg">No contents found</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 ${className}`}>
      {items.map((item, index) => (
        <motion.div
          key={`${item.id}-${index}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <MediaCard item={item} />
        </motion.div>
      ))}
    </div>
  );
}

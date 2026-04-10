"use client";

import { MediaItem, ContentType, getTitle } from "@/shared/types/media";
import { MediaCard } from "@/shared/components";
import { HorizontalScroll } from "@/shared/components";
import { motion } from "framer-motion";

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  contentType?: ContentType;
  className?: string;
}

export function MediaRow({ title, items, contentType, className }: MediaRowProps) {
  if (items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <h2 className="text-lg md:text-xl font-semibold text-white mb-3 px-1">
        {title}
      </h2>
      <HorizontalScroll>
        {items.map((item, index) => (
          <div key={item.id} className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] snap-start">
            <MediaCard item={item} contentType={contentType} index={index} />
          </div>
        ))}
      </HorizontalScroll>
    </motion.section>
  );
}

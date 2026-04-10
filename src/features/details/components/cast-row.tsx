"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { CastMember, getPosterUrl } from "@/shared/types/media";
import { HorizontalScroll } from "@/shared/components";

interface CastRowProps {
  cast: CastMember[];
  className?: string;
}

export function CastRow({ cast, className }: CastRowProps) {
  if (!cast || cast.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={className}
    >
      <h2 className="text-lg font-semibold text-white mb-3">Cast</h2>
      <HorizontalScroll>
        {cast.slice(0, 20).map((member) => (
          <div
            key={member.id}
            className="flex-shrink-0 w-[100px] md:w-[120px] text-center snap-start"
          >
            <div className="relative w-[80px] h-[80px] md:w-[100px] md:h-[100px] mx-auto rounded-full overflow-hidden bg-nf-surface">
              {member.profile_path ? (
                <Image
                  src={getPosterUrl(member.profile_path, "w185")}
                  alt={member.name}
                  fill
                  sizes="100px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-nf-text-dim text-lg font-bold">
                  {member.name.charAt(0)}
                </div>
              )}
            </div>
            <p className="mt-2 text-xs font-medium text-white line-clamp-1">{member.name}</p>
            <p className="text-xs text-nf-text-dim line-clamp-1">{member.character}</p>
          </div>
        ))}
      </HorizontalScroll>
    </motion.section>
  );
}

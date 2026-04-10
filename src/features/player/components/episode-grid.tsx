"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Image from "next/image";
import { Episode, getPosterUrl } from "@/shared/types/media";
import { HorizontalScroll } from "@/shared/components";
import { Play, Clock } from "lucide-react";
import type { LayoutMode } from "@/shared/hooks";

interface EpisodeGridProps {
  episodes: Episode[];
  selected: number;
  onChange: (episodeNumber: number) => void;
  layoutMode: LayoutMode;
  className?: string;
}

export function EpisodeGrid({ episodes, selected, onChange, layoutMode, className }: EpisodeGridProps) {
  if (!episodes || episodes.length === 0) return null;

  const episodeCards = episodes.map((ep) => (
    <EpisodeCard
      key={ep.id}
      episode={ep}
      isSelected={ep.episode_number === selected}
      onSelect={() => onChange(ep.episode_number)}
      layoutMode={layoutMode}
    />
  ));

  // Stacked layout: horizontal scroll
  if (layoutMode === "stacked") {
    return (
      <div className={className}>
        <h3 className="text-sm font-medium text-nf-text-muted mb-2">Episodes</h3>
        <HorizontalScroll showArrows={false}>
          {episodes.map((ep) => (
            <div key={ep.id} className="flex-shrink-0 w-[200px] snap-start">
              <EpisodeCard
                episode={ep}
                isSelected={ep.episode_number === selected}
                onSelect={() => onChange(ep.episode_number)}
                layoutMode={layoutMode}
              />
            </div>
          ))}
        </HorizontalScroll>
      </div>
    );
  }

  // Side-by-side layout: 4-column grid
  return (
    <div className={className}>
      <h3 className="text-sm font-medium text-nf-text-muted mb-3">Episodes</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-hide">
        {episodeCards}
      </div>
    </div>
  );
}

interface EpisodeCardProps {
  episode: Episode;
  isSelected: boolean;
  onSelect: () => void;
  layoutMode: LayoutMode;
}

function EpisodeCard({ episode, isSelected, onSelect, layoutMode }: EpisodeCardProps) {
  const stillUrl = getPosterUrl(episode.still_path, "w300");

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "w-full text-left rounded-lg overflow-hidden transition-all",
        isSelected
          ? "ring-2 ring-nf-accent bg-nf-accent/10"
          : "bg-white/5 hover:bg-white/8 border border-transparent hover:border-white/10"
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full bg-nf-surface">
        {stillUrl ? (
          <Image
            src={stillUrl}
            alt={episode.name}
            fill
            sizes="200px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-6 h-6 text-nf-text-dim" />
          </div>
        )}

        {/* Episode number overlay */}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white">
          E{episode.episode_number}
        </div>

        {/* Playing indicator */}
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="w-8 h-8 rounded-full bg-nf-accent flex items-center justify-center">
              <Play className="w-4 h-4 fill-white text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs font-medium text-white line-clamp-1">
          {episode.name}
        </p>
        {episode.runtime && (
          <p className="flex items-center gap-1 text-[10px] text-nf-text-dim mt-1">
            <Clock className="w-3 h-3" />
            {episode.runtime}m
          </p>
        )}
      </div>
    </motion.button>
  );
}

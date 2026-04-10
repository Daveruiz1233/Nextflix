"use client";

import { cn } from "@/lib/utils";
import { Genre } from "@/shared/types/media";
import { HorizontalScroll } from "@/shared/components";

interface GenrePillsProps {
  genres: Genre[];
  selectedGenre: number | null;
  onSelect: (genreId: number | null) => void;
  className?: string;
}

export function GenrePills({ genres, selectedGenre, onSelect, className }: GenrePillsProps) {
  return (
    <div className={className}>
      <HorizontalScroll showArrows={false}>
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[44px] snap-start",
            selectedGenre === null
              ? "bg-nf-accent text-white"
              : "bg-white/5 text-nf-text-muted hover:bg-white/10 hover:text-white"
          )}
        >
          All
        </button>
        {genres.map((genre) => (
          <button
            key={genre.id}
            onClick={() => onSelect(genre.id === selectedGenre ? null : genre.id)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap min-h-[44px] snap-start",
              selectedGenre === genre.id
                ? "bg-nf-accent text-white"
                : "bg-white/5 text-nf-text-muted hover:bg-white/10 hover:text-white"
            )}
          >
            {genre.name}
          </button>
        ))}
      </HorizontalScroll>
    </div>
  );
}

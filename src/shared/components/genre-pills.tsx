"use client";

import { cn } from "@/lib/utils";
import { HorizontalScroll } from "@/shared/components";
import { Genre } from "@/shared/types/media";

interface GenrePillsProps {
  genres: Genre[];
  selectedGenre: number | null;
  onSelect: (genreId: number | null) => void;
  className?: string;
}

export function GenrePills({ genres, selectedGenre, onSelect, className }: GenrePillsProps) {
  return (
    <div className={cn("w-full", className)}>
      <HorizontalScroll showArrows={false}>
        <div className="flex items-center gap-2 pb-2">
          <button
            onClick={() => onSelect(null)}
            className={cn(
              "flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-all min-h-[40px] border",
              selectedGenre === null
                ? "bg-nf-accent border-nf-accent text-white shadow-lg shadow-nf-accent/20"
                : "bg-white/5 border-white/10 text-nf-text-muted hover:bg-white/10 hover:text-white"
            )}
          >
            All Genres
          </button>
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => onSelect(genre.id)}
              className={cn(
                "flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-all min-h-[40px] border",
                selectedGenre === genre.id
                  ? "bg-nf-accent border-nf-accent text-white shadow-lg shadow-nf-accent/20"
                  : "bg-white/5 border-white/10 text-nf-text-muted hover:bg-white/10 hover:text-white"
              )}
            >
              {genre.name}
            </button>
          ))}
        </div>
      </HorizontalScroll>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { SOURCES, EmbedSource } from "@/shared/types/source";
import { HorizontalScroll } from "@/shared/components";

interface SourceSelectorProps {
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function SourceSelector({ selectedId, onSelect, className }: SourceSelectorProps) {
  return (
    <div className={className}>
      <h3 className="text-sm font-medium text-nf-text-muted mb-2">Source</h3>
      <HorizontalScroll showArrows={false}>
        {SOURCES.map((source) => (
          <button
            key={source.id}
            onClick={() => onSelect(source.id)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap min-h-[40px] snap-start",
              selectedId === source.id
                ? "bg-nf-accent text-white shadow-lg shadow-nf-accent/20"
                : "bg-white/5 text-nf-text-muted hover:bg-white/10 hover:text-white border border-white/5"
            )}
          >
            {source.label}
          </button>
        ))}
      </HorizontalScroll>
    </div>
  );
}

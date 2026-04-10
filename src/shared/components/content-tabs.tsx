"use client";

import { cn } from "@/lib/utils";

type ContentType = "movie" | "tv";

interface ContentTabsProps {
  activeTab: ContentType;
  onTabChange: (tab: ContentType) => void;
  className?: string;
}

export function ContentTabs({ activeTab, onTabChange, className }: ContentTabsProps) {
  return (
    <div className={cn("inline-flex items-center p-1 bg-white/5 rounded-full border border-white/10", className)}>
      <button
        onClick={() => onTabChange("movie")}
        className={cn(
          "px-6 py-2 rounded-full text-sm font-medium transition-all min-h-[36px]",
          activeTab === "movie"
            ? "bg-nf-accent text-white shadow-md shadow-nf-accent/20"
            : "text-nf-text-dim hover:text-white"
        )}
      >
        Movies
      </button>
      <button
        onClick={() => onTabChange("tv")}
        className={cn(
          "px-6 py-2 rounded-full text-sm font-medium transition-all min-h-[36px]",
          activeTab === "tv"
            ? "bg-nf-accent text-white shadow-md shadow-nf-accent/20"
            : "text-nf-text-dim hover:text-white"
        )}
      >
        TV Shows
      </button>
    </div>
  );
}

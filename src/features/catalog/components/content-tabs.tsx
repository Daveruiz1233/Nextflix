"use client";

import { cn } from "@/lib/utils";
import { ContentType } from "@/shared/types/media";

interface ContentTabsProps {
  selected: ContentType | "all";
  onChange: (value: ContentType | "all") => void;
  className?: string;
}

const TABS = [
  { value: "all" as const, label: "All" },
  { value: "movie" as const, label: "Movies" },
  { value: "tv" as const, label: "TV Shows" },
];

export function ContentTabs({ selected, onChange, className }: ContentTabsProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-lg bg-white/5", className)}>
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-all min-h-[40px]",
            selected === tab.value
              ? "bg-nf-accent text-white shadow-lg shadow-nf-accent/20"
              : "text-nf-text-muted hover:text-white hover:bg-white/5"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

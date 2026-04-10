"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Season } from "@/shared/types/media";

interface SeasonDropdownProps {
  seasons: Season[];
  selected: number;
  onChange: (season: number) => void;
  className?: string;
}

export function SeasonDropdown({ seasons, selected, onChange, className }: SeasonDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter out special seasons (season 0 = specials)
  const validSeasons = seasons.filter((s) => s.season_number > 0);
  const currentSeason = validSeasons.find((s) => s.season_number === selected);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <h3 className="text-sm font-medium text-nf-text-muted mb-2">Season</h3>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full max-w-[240px] px-4 py-3 rounded-lg glass text-white text-sm font-medium hover:bg-white/10 transition-colors min-h-[44px]"
      >
        <span>{currentSeason?.name || `Season ${selected}`}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-nf-text-muted transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1 left-0 w-full max-w-[240px] max-h-[300px] overflow-y-auto rounded-lg glass-heavy z-50 py-1"
          >
            {validSeasons.map((season) => (
              <button
                key={season.season_number}
                onClick={() => {
                  onChange(season.season_number);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-3 text-sm transition-colors min-h-[44px]",
                  season.season_number === selected
                    ? "bg-nf-accent/20 text-nf-accent font-medium"
                    : "text-white hover:bg-white/5"
                )}
              >
                <div className="font-medium">{season.name}</div>
                <div className="text-xs text-nf-text-dim mt-0.5">
                  {season.episode_count} episodes
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

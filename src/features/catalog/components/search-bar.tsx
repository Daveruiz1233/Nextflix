"use client";

import { Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { useRef } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SearchBar({ value, onChange, className }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${className}`}
    >
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-nf-text-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search movies and TV shows..."
          className="w-full h-12 pl-12 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-nf-text-dim focus:outline-none focus:border-nf-accent/50 focus:ring-1 focus:ring-nf-accent/30 transition-all text-sm"
        />
        {value && (
          <button
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-4 p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-nf-text-muted" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

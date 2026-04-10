"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search movies, actors, genres...",
  className,
}: SearchBarProps) {
  return (
    <div className={cn("relative group w-full", className)}>
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <Search className="w-5 h-5 text-nf-text-dim group-focus-within:text-nf-accent transition-colors" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 pl-12 pr-12 text-white text-sm placeholder:text-nf-text-dim focus:outline-none focus:ring-2 focus:ring-nf-accent/50 focus:bg-white/10 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute inset-y-0 right-4 flex items-center text-nf-text-dim hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

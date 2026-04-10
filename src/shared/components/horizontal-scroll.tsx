"use client";

import { cn } from "@/lib/utils";
import { useRef, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
  showArrows?: boolean;
  gap?: string;
}

export function HorizontalScroll({
  children,
  className,
  showArrows = true,
  gap = "gap-3",
}: HorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.6;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative group/scroll">
      {/* Scroll arrows — hidden on mobile */}
      {showArrows && (
        <>
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200 hover:bg-black/80"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200 hover:bg-black/80"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className={cn(
          "flex overflow-x-auto scrollbar-hide snap-x snap-mandatory",
          gap,
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

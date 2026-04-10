"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

interface HeaderProps {
  showSearch?: boolean;
}

export function Header({ showSearch = true }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-4 md:px-8 lg:px-12",
        "h-16 md:h-20 lg:h-24 flex items-center justify-between",
        isScrolled 
          ? "bg-nf-bg/95 backdrop-blur-xl shadow-2xl border-b border-white/5" 
          : "bg-gradient-to-b from-black/90 via-black/40 to-transparent"
      )}
    >
      {/* Branding - Universal Back-to-Home Button */}
      <Link 
        href="/" 
        className="flex items-center group relative outline-none"
        aria-label="NEXTFLIX Home"
      >
        <motion.span 
          initial={false}
          animate={{ 
            scale: isHome ? 1.1 : 1
          }}
          className={cn(
            "font-black tracking-tighter text-nf-accent transition-all duration-300 select-none",
            isHome 
              ? "text-4xl md:text-3xl lg:text-4xl" // Noticeable on mobile homepage
              : "text-xl md:text-2xl", // Sub-pages
            "drop-shadow-[0_2px_10px_rgba(229,9,20,0.4)] group-hover:drop-shadow-[0_2px_15px_rgba(229,9,20,0.6)]"
          )}
        >
          NEXTFLIX
        </motion.span>
      </Link>

      {/* Search Button */}
      {showSearch && (
        <Link
          href="/search"
          className={cn(
            "flex items-center justify-center p-3 rounded-full transition-all duration-300 group",
            isScrolled ? "bg-white/5 hover:bg-white/10" : "bg-black/20 hover:bg-black/40 backdrop-blur-sm"
          )}
          aria-label="Search"
        >
          <Search className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
        </Link>
      )}
    </header>
  );
}

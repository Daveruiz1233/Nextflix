"use client";

import { useLayoutMode } from "@/shared/hooks";
import { useNavigationStore, NavTab } from "@/shared/hooks/use-navigation-store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Library, Download, Search, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home, href: "/" },
  { id: "library", label: "Library", icon: Library, href: "/library" },
  { id: "downloads", label: "Downloads", icon: Download, href: "/downloads" },
];

export function Navigation() {
  const layoutMode = useLayoutMode();
  const pathname = usePathname();
  const { isSidebarOpen, toggleSidebar } = useNavigationStore();

  if (layoutMode === "stacked") {
    return <MobileDock activePath={pathname} />;
  }

  return (
    <Sidebar
      activePath={pathname}
      isOpen={isSidebarOpen}
      onToggle={toggleSidebar}
    />
  );
}

// ═══════════════════════════════════════════
// SIDEBAR (Desktop / Landscape)
// ═══════════════════════════════════════════
interface SidebarProps {
  activePath: string;
  isOpen: boolean;
  onToggle: () => void;
}

function Sidebar({ activePath, isOpen, onToggle }: SidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 240 : 64 }}
      className="fixed left-0 top-0 bottom-0 z-[90] bg-nf-bg border-r border-white/5 pt-24 hidden lg:flex flex-col"
    >
      {/* Toggle Button - Thinner and more subtle */}
      <button
        onClick={onToggle}
        className={cn(
          "absolute -right-3 top-24 w-6 h-6 rounded-full bg-nf-accent flex items-center justify-center text-white shadow-lg z-10 transition-all duration-300",
          !isOpen && "opacity-0 group-hover:opacity-100" // Hide when closed unless hovered? Actually user said thinner
        )}
      >
        {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <div className="flex flex-col gap-2 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = activePath === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-3 py-3 rounded-xl transition-all min-h-[48px] group relative",
                isActive
                  ? "bg-nf-accent text-white shadow-lg shadow-nf-accent/20"
                  : "text-nf-text-muted hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-white" : "text-nf-text-dim"
                )}
              />
              <AnimatePresence mode="wait">
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-medium whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              
              {!isOpen && isActive && (
                <motion.div 
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                />
              )}
            </Link>
          );
        })}
      </div>
    </motion.aside>
  );
}

// ═══════════════════════════════════════════
// DOCK (Mobile / Portrait)
// ═══════════════════════════════════════════
interface MobileDockProps {
  activePath: string;
}

function MobileDock({ activePath }: MobileDockProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-8 pt-2 h-auto lg:hidden">
      <div className={cn(
        "mx-auto max-w-sm rounded-full px-6 py-4 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10",
        "bg-[#0f0f17]/95 backdrop-blur-3xl" // Increased opacity and blur as requested
      )}>
        {NAV_ITEMS.map((item) => {
          const isActive = activePath === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-300",
                isActive ? "text-nf-accent scale-110" : "text-nf-text-dim hover:text-white"
              )}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-bold tracking-wider uppercase">
                {item.label}
              </span>
            </Link>
          );
        })}
        {/* Search button also in dock for mobile for easy access */}
        <Link
          href="/search"
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300",
            activePath === "/search" ? "text-nf-accent scale-110" : "text-nf-text-dim hover:text-white"
          )}
        >
          <Search className="w-6 h-6" />
          <span className="text-[10px] font-bold tracking-wider uppercase">Search</span>
        </Link>
      </div>
    </div>
  );
}

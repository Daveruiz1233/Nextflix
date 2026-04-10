"use client";

import { useLayoutMode } from "@/shared/hooks";
import { useNavigationStore } from "@/shared/hooks/use-navigation-store";
import { Header } from "./header";
import { Navigation } from "./navigation";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const layoutMode = useLayoutMode();
  const { isSidebarOpen } = useNavigationStore();
  const pathname = usePathname();

  // Hide global elements on some routes if needed (e.g., fullscreen player)
  // For now, we keep them visible as requested: "NEXTFLIX branding should be VISIBLE"
  const isPlayerPage = pathname.startsWith("/watch");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-nf-bg font-sans">
      <Header />
      <Navigation />

      <main
        className={cn(
          "flex-1 transition-all duration-300",
          layoutMode === "side-by-side" && (isSidebarOpen ? "pl-[240px]" : "pl-[64px]"),
          layoutMode === "stacked" && "pb-24" // Space for bottom dock
        )}
      >
        <div className="relative z-0">{children}</div>
      </main>
    </div>
  );
}

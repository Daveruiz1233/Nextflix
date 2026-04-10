"use client";

import { useBreakpoint } from "./use-breakpoint";
import { useOrientation } from "./use-orientation";

export type LayoutMode = "stacked" | "side-by-side";

/**
 * Determines layout mode based on breakpoint and orientation.
 *
 * Stacked: portrait phones + portrait tablets (<1024px portrait)
 * Side-by-side: landscape tablets + desktop (≥1024px OR landscape)
 */
export function useLayoutMode(): LayoutMode {
  const breakpoint = useBreakpoint();
  const orientation = useOrientation();

  // Desktop is always side-by-side
  if (breakpoint === "desktop") return "side-by-side";

  // Tablet landscape = side-by-side
  if (breakpoint === "tablet" && orientation === "landscape") return "side-by-side";

  // Everything else (mobile + tablet portrait) = stacked
  return "stacked";
}

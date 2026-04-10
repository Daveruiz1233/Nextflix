/**
 * NEXTFLIX Feature Registry
 *
 * Central registry for all feature modules.
 * Each feature is self-contained with its own types, API, hooks, components, store, and page.
 */

export const features = {
  catalog: {
    name: "Catalog",
    description: "Browse trending movies and TV shows with search and genre filtering",
    route: "/",
  },
  details: {
    name: "Details",
    description: "View movie/TV show details, cast, and similar titles",
    route: "/[type]/[id]",
  },
  player: {
    name: "Player",
    description: "Watch content with sandboxed iframe player, source switching, and episode picker",
    route: "/watch/[type]/[id]",
  },
} as const;

export type FeatureName = keyof typeof features;

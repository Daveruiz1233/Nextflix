import { create } from "zustand";
import { ContentType } from "@/shared/types/media";

interface CatalogStore {
  searchQuery: string;
  selectedGenre: number | null;
  contentFilter: ContentType | "all";
  setSearchQuery: (query: string) => void;
  setSelectedGenre: (genreId: number | null) => void;
  setContentFilter: (filter: ContentType | "all") => void;
  reset: () => void;
}

export const useCatalogStore = create<CatalogStore>((set) => ({
  searchQuery: "",
  selectedGenre: null,
  contentFilter: "all",
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedGenre: (genreId) => set({ selectedGenre: genreId }),
  setContentFilter: (filter) => set({ contentFilter: filter }),
  reset: () => set({ searchQuery: "", selectedGenre: null, contentFilter: "all" }),
}));

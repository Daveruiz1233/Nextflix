"use client";

import { useState, useMemo } from "react";
import { 
  useSearch, 
  useGenres, 
  useDiscover 
} from "@/features/catalog/hooks/use-catalog";
import { 
  SearchBar, 
  GenrePills, 
  ContentTabs, 
  MediaGrid 
} from "@/shared/components";
import { useDebounce } from "@/shared/hooks";
import { motion, AnimatePresence } from "framer-motion";
import { Search as SearchIcon } from "lucide-react";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"movie" | "tv">("movie");
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  
  const debouncedQuery = useDebounce(query, 500);

  // Data fetching
  const { data: searchResults, isLoading: isSearchLoading } = useSearch(debouncedQuery);
  const { data: genres } = useGenres();
  const { data: discoverResults, isLoading: isDiscoverLoading } = useDiscover(
    activeTab,
    selectedGenre || undefined
  );

  // Memoized items to display
  const items = useMemo(() => {
    if (debouncedQuery) {
      return searchResults?.results || [];
    }
    // Flatten pages for infinite scroll data
    return discoverResults?.pages.flatMap((page) => page.results) || [];
  }, [debouncedQuery, searchResults, discoverResults]);

  const isLoading = debouncedQuery ? isSearchLoading : isDiscoverLoading;

  return (
    <div className="min-h-screen pt-24 md:pt-32 px-4 md:px-8 lg:px-12 pb-20">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        
        {/* Search Header */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              {debouncedQuery ? "Search Results" : "Discover Content"}
            </h1>
            <ContentTabs 
              activeTab={activeTab} 
              onTabChange={(tab) => {
                setActiveTab(tab);
                setSelectedGenre(null); // Reset genre on tab change
              }} 
            />
          </div>

          <SearchBar 
            value={query} 
            onChange={setQuery} 
            placeholder={`Search ${activeTab === 'movie' ? 'Movies' : 'TV Shows'}...`}
            className="max-w-2xl"
          />
        </div>

        {/* Filters - only show when not searching */}
        {!debouncedQuery && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GenrePills
              genres={genres || []}
              selectedGenre={selectedGenre}
              onSelect={setSelectedGenre}
            />
          </motion.div>
        )}

        {/* Results Grid */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-40"
            >
              <div className="w-10 h-10 border-4 border-nf-accent border-t-transparent rounded-full animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {items.length > 0 ? (
                <MediaGrid items={items} />
              ) : (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <SearchIcon className="w-10 h-10 text-nf-text-dim" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No results found</h3>
                  <p className="text-nf-text-dim max-w-xs">
                    Try searching for something else or browse different genres.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLayoutMode } from "@/shared/hooks";
import { useMediaDetails } from "@/features/details/hooks";
import { isTVDetails, MediaDetails } from "@/features/details/types";
import { useEpisodes } from "./hooks";
import { usePlayerStore } from "./store";
import { SOURCES } from "@/shared/types/source";
import { ContentType, MediaItem } from "@/shared/types/media";
import { FullPageSpinner } from "@/shared/components";
import { MediaRow } from "@/features/catalog/components/media-row";
import {
  SandboxedPlayer,
  SourceSelector,
  SeasonDropdown,
  EpisodeGrid,
  PlayerMeta,
} from "./components";

interface PlayerPageProps {
  id: number;
  type: ContentType;
}

export function PlayerPage({ id, type }: PlayerPageProps) {
  const layoutMode = useLayoutMode();
  const { sourceId, season, episode, setSourceId, setSeason, setEpisode, reset } = usePlayerStore();

  const { data: details, isLoading } = useMediaDetails(id, type);

  const isTV = type === "tv";
  const tvDetails = details && isTVDetails(details) ? details : null;

  // Fetch episodes for current season (TV only)
  const { data: seasonData } = useEpisodes(id, season, isTV);

  // Reset store on mount
  useEffect(() => {
    reset();
  }, [id, type, reset]);

  // Build embed URL
  const embedUrl = useMemo(() => {
    const source = SOURCES.find((s) => s.id === sourceId) || SOURCES[0];
    if (isTV) {
      return source.getUrl(id, type, season, episode);
    }
    return source.getUrl(id, type);
  }, [id, type, sourceId, season, episode, isTV]);

  // iframe key for re-mounting on source/episode change
  const iframeKey = useMemo(
    () => `${sourceId}-${season}-${episode}-${id}-${type}-${Date.now()}`,
    [sourceId, season, episode, id, type]
  );

  if (isLoading) return <FullPageSpinner />;

  if (!details) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <p className="text-nf-text-muted text-lg">Content not found</p>
      </div>
    );
  }

  const similar = details.similar?.results || [];

  // ═══════════════════════════════════════════
  // STACKED LAYOUT — Mobile Portrait + Tablet Portrait
  // ═══════════════════════════════════════════
  if (layoutMode === "stacked") {
    return (
      <div className="min-h-[100dvh] bg-nf-bg pt-16">

        {/* Player — 40dvh */}
        <SandboxedPlayer
          src={embedUrl}
          iframeKey={iframeKey}
          layoutMode="stacked"
        />

        {/* Content below player */}
        <div className="px-4 py-4 flex flex-col gap-5">
          {/* Title + metadata */}
          <PlayerMeta details={details} type={type} />

          {/* Source selector */}
          <SourceSelector
            selectedId={sourceId}
            onSelect={setSourceId}
          />

          {/* Season/Episode picker — TV only */}
          {isTV && tvDetails && (
            <>
              <SeasonDropdown
                seasons={tvDetails.seasons}
                selected={season}
                onChange={setSeason}
              />
              {seasonData && (
                <EpisodeGrid
                  episodes={seasonData.episodes}
                  selected={episode}
                  onChange={setEpisode}
                  layoutMode="stacked"
                />
              )}
            </>
          )}

          {/* Similar Titles */}
          {similar.length > 0 && (
            <MediaRow
              title="Similar Titles"
              items={similar as MediaItem[]}
              contentType={type}
            />
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // SIDE-BY-SIDE LAYOUT — Tablet Landscape + Desktop
  // ═══════════════════════════════════════════
  return (
    <div className="min-h-[100dvh] bg-nf-bg pt-16">

      {/* Main content */}
      <div className="flex gap-6 p-6 lg:p-10">
        {/* Left column — Player */}
        <div className="flex-1 min-w-0">
          <SandboxedPlayer
            src={embedUrl}
            iframeKey={iframeKey}
            layoutMode="side-by-side"
          />
        </div>

        {/* Right panel — Info + Controls */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="w-[320px] lg:w-[380px] flex-shrink-0 flex flex-col gap-5 max-h-[calc(100dvh-5rem)] overflow-y-auto scrollbar-hide"
        >
          {/* Title + metadata */}
          <PlayerMeta details={details} type={type} />

          {/* Source selector */}
          <SourceSelector
            selectedId={sourceId}
            onSelect={setSourceId}
          />

          {/* Season/Episode picker — TV only */}
          {isTV && tvDetails && (
            <>
              <SeasonDropdown
                seasons={tvDetails.seasons}
                selected={season}
                onChange={setSeason}
              />
              {seasonData && (
                <EpisodeGrid
                  episodes={seasonData.episodes}
                  selected={episode}
                  onChange={setEpisode}
                  layoutMode="side-by-side"
                />
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Similar Titles — full width below */}
      {similar.length > 0 && (
        <div className="px-6 lg:px-10 pb-10">
          <MediaRow
            title="Similar Titles"
            items={similar as MediaItem[]}
            contentType={type}
          />
        </div>
      )}
    </div>
  );
}

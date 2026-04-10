"use client";

import { useMediaDetails } from "./hooks";
import { DetailsHero, CastRow } from "./components";
import { MediaRow } from "@/features/catalog/components/media-row";
import { FullPageSpinner } from "@/shared/components";
import { ContentType, MediaItem, MovieDetails, TVDetails } from "@/shared/types/media";

interface DetailsPageProps {
  id: number;
  type: ContentType;
}

export function DetailsPage({ id, type }: DetailsPageProps) {
  const { data: details, isLoading, error } = useMediaDetails(id, type);

  if (isLoading) return <FullPageSpinner />;

  if (error || !details) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="text-center">
          <p className="text-nf-text-muted text-lg">Failed to load details</p>
          <p className="text-nf-text-dim text-sm mt-2">{error?.message || "Unknown error"}</p>
        </div>
      </div>
    );
  }

  const castData = (details as MovieDetails | TVDetails).credits?.cast || [];
  const similarData = (details as MovieDetails | TVDetails).similar?.results || [];

  return (
    <div className="min-h-[100dvh]">
      <DetailsHero details={details} type={type} />

      <div className="px-4 md:px-8 lg:px-12 py-8 flex flex-col gap-8">
        {/* Cast */}
        <CastRow cast={castData} />

        {/* Similar Titles */}
        {similarData.length > 0 && (
          <MediaRow
            title="More Like This"
            items={similarData as MediaItem[]}
            contentType={type}
          />
        )}
      </div>
    </div>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DetailsPage } from "@/features/details";
import { ContentType } from "@/shared/types/media";
import { FullPageSpinner } from "@/shared/components";

function DetailsContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  // Validate content type
  if (type !== "movie" && type !== "tv") {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <p className="text-nf-text-muted text-lg">Invalid content type</p>
      </div>
    );
  }

  if (!id || isNaN(parseInt(id, 10))) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <p className="text-nf-text-muted text-lg">Content not found</p>
      </div>
    );
  }

  return <DetailsPage id={parseInt(id, 10)} type={type as ContentType} />;
}

export default function DetailsRoute() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <DetailsContent />
    </Suspense>
  );
}

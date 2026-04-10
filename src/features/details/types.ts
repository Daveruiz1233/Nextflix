import { ContentType, MovieDetails, TVDetails } from "@/shared/types/media";

export type MediaDetails = MovieDetails | TVDetails;

export interface DetailsPageProps {
  id: number;
  type: ContentType;
}

export function isMovieDetails(details: MediaDetails): details is MovieDetails {
  return "runtime" in details;
}

export function isTVDetails(details: MediaDetails): details is TVDetails {
  return "number_of_seasons" in details;
}

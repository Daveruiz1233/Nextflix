import { ContentType, MediaItem, Genre } from "@/shared/types/media";

export interface CatalogFilters {
  contentType: ContentType | "all";
  genreId: number | null;
  query: string;
  page: number;
}

export interface CatalogSection {
  title: string;
  items: MediaItem[];
  contentType?: ContentType;
}

import { ContentType } from "@/shared/types/media";

export interface PlayerState {
  sourceId: string;
  season: number;
  episode: number;
}

export interface PlayerPageProps {
  id: number;
  type: ContentType;
}

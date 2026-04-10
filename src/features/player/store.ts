import { create } from "zustand";
import { SOURCES } from "@/shared/types/source";

interface PlayerStore {
  sourceId: string;
  season: number;
  episode: number;
  setSourceId: (id: string) => void;
  setSeason: (season: number) => void;
  setEpisode: (episode: number) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  sourceId: SOURCES[0].id,
  season: 1,
  episode: 1,
  setSourceId: (id) => set({ sourceId: id }),
  setSeason: (season) => set({ season, episode: 1 }),
  setEpisode: (episode) => set({ episode }),
  reset: () => set({ sourceId: SOURCES[0].id, season: 1, episode: 1 }),
}));

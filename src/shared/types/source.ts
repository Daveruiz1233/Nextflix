import { ContentType } from "./media";

export interface EmbedSource {
  id: string;
  label: string;
  getUrl: (tmdbId: number, type: ContentType, season?: number, episode?: number) => string;
}

export const SOURCES: EmbedSource[] = [
  // ─── VidSrc 1 ────────────────────────────────────────
  // Docs: https://vidsrcme.ru/api/
  {
    id: "vidsrc1",
    label: "VidSrc 1",
    getUrl: (id, type, s, e) => {
      const baseUrl = "https://vidsrcme.ru/embed";
      if (type === "tv" && s !== undefined && e !== undefined) {
        return `${baseUrl}/tv?tmdb=${id}&season=${s}&episode=${e}`;
      }
      return `${baseUrl}/movie?tmdb=${id}`;
    },
  },
  // ─── VidSrc 2 ────────────────────────────────────────
  // Existing working source (vidsrc.cc)
  {
    id: "vidsrc2",
    label: "VidSrc 2",
    getUrl: (id, type, s, e) => {
      if (type === "tv" && s !== undefined && e !== undefined) {
        return `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`;
      }
      return `https://vidsrc.cc/v2/embed/${type}/${id}`;
    },
  },
  // ─── VidLink ─────────────────────────────────────────
  // Docs: https://vidlink.pro/
  {
    id: "vidlink",
    label: "VidLink",
    getUrl: (id, type, s, e) => {
      const params = new URLSearchParams({
        primaryColor: "E50914",
        autoplay: "true",
      });
      if (type === "tv" && s !== undefined && e !== undefined) {
        return `https://vidlink.pro/tv/${id}/${s}/${e}?${params.toString()}`;
      }
      return `https://vidlink.pro/movie/${id}?${params.toString()}`;
    },
  },
  // ─── VixSrc ──────────────────────────────────────────
  // Docs: https://vixsrc.to/
  {
    id: "vixsrc",
    label: "VixSrc",
    getUrl: (id, type, s, e) => {
      const params = new URLSearchParams({
        primaryColor: "E50914",
        autoplay: "true",
      });
      if (type === "tv" && s !== undefined && e !== undefined) {
        return `https://vixsrc.to/tv/${id}/${s}/${e}?${params.toString()}`;
      }
      return `https://vixsrc.to/movie/${id}?${params.toString()}`;
    },
  },
];

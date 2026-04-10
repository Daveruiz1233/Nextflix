import { SearchPage } from "@/features/search/search-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search — NEXTFLIX",
  description: "Search and discover movies and TV shows on NEXTFLIX.",
};

export default function Page() {
  return <SearchPage />;
}

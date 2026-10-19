import type { Listing } from "@/lib/marketplace";
import type { Rating } from "@/lib/ratings";

/** A public profile as the site-wide search lists it. */
export type ProfileResult = {
  /** What `/user/:handle` resolves them by. */
  handle: string | null;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  wallet: string | null;
  verified: boolean;
  rating: Rating | null;
};

export type SearchResults = {
  /** The first few matches; `totalListings` says how many there are in all. */
  listings: Listing[];
  totalListings: number;
  profiles: ProfileResult[];
};

export const EMPTY_RESULTS: SearchResults = { listings: [], totalListings: 0, profiles: [] };

/** Listings by title, write-up or seller, and profiles by username. */
export async function searchSite(q: string, signal?: AbortSignal): Promise<SearchResults> {
  const res = await fetch(`/backend/search?q=${encodeURIComponent(q)}`, {
    cache: "no-store",
    signal,
  });
  if (!res.ok) throw new Error("Search failed");
  return (await res.json()) as SearchResults;
}

/** The event the phone header's search button fires to open the search. */
export const OPEN_SEARCH_EVENT = "lnoc:open-search";

export function openSearch() {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}

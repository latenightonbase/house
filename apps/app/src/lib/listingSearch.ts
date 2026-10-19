import { categoryLabel } from "@/lib/listingCategories";
import type { Listing, ListingKind, PricingType } from "@/lib/marketplace";

/**
 * The marketplace's search: free text plus two type filters — what is being
 * sold (a service or a physical good) and how (flat fee or auction). Each type
 * filter is one-or-neither, and the two combine, so "goods at auction" is a
 * single search.
 *
 * It runs over the book the page already holds rather than calling the API —
 * the marketplace ships every live listing on first paint, so filtering it in
 * place answers on each keystroke.
 */
export type MarketSearch = {
  q: string;
  kind: ListingKind | null;
  pricing: PricingType | null;
};

export const EMPTY_SEARCH: MarketSearch = { q: "", kind: null, pricing: null };

export function isEmptySearch(search: MarketSearch) {
  return !search.q.trim() && !search.kind && !search.pricing;
}

/** Older rows predate the field; they were all media placements. */
export function listingKind(listing: Listing): ListingKind {
  return listing.kind ?? "SERVICE";
}

function haystack(listing: Listing) {
  return [
    listing.title,
    listing.description,
    listing.placement,
    listing.category !== "OTHER" ? categoryLabel(listing.category) : null,
    listing.creator.displayName,
    listing.creator.username,
    listing.tokenName ?? listing.currency,
  ]
    .filter(Boolean)
    .join(" \n ")
    .toLowerCase();
}

/** Every word has to appear somewhere — "ps5 sealed" finds the sealed PS5. */
export function matchesSearch(listing: Listing, search: MarketSearch) {
  if (search.kind && listingKind(listing) !== search.kind) return false;
  if (search.pricing && listing.pricingType !== search.pricing) return false;
  const words = search.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = haystack(listing);
  return words.every((word) => text.includes(word.replace(/^@/, "")));
}

/** `?q=…&type=good&pricing=auction` — what a shared marketplace link carries. */
export function searchFromParams(params: URLSearchParams): MarketSearch {
  const type = params.get("type")?.toUpperCase();
  const pricing = params.get("pricing")?.toUpperCase();
  return {
    q: params.get("q") ?? "",
    kind: type === "SERVICE" || type === "GOOD" ? type : null,
    pricing: pricing === "FIXED" || pricing === "AUCTION" ? pricing : null,
  };
}

export function searchToParams(search: MarketSearch): string {
  const params = new URLSearchParams();
  if (search.q.trim()) params.set("q", search.q.trim());
  if (search.kind) params.set("type", search.kind.toLowerCase());
  if (search.pricing) params.set("pricing", search.pricing.toLowerCase());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

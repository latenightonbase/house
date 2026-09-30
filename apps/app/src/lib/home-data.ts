import { getApiOrigin } from "@/lib/api-origin";
import type { AuctionState, Spotlight } from "@/lib/dailyAuction";
import type { Listing } from "@/lib/marketplace";

const REVALIDATE_SECONDS = 20;

/** How much seller inventory the home page ships in its first paint. */
export const HOME_LISTING_LIMIT = 24;

/** The marketplace page shows the whole book — this is the API's own ceiling. */
export const MARKETPLACE_LISTING_LIMIT = 100;

export type HomePageData = {
  listing: Listing | null;
  auction: AuctionState | null;
  spotlight: Spotlight | null;
  /** Seller inventory — the daily auction is filtered out by the API. */
  listings: Listing[];
};

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${getApiOrigin()}${path}`, {
      cache: "force-cache",
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Public homepage payload — cached briefly so artwork URLs land in the HTML. */
export async function loadHomePageData(): Promise<HomePageData> {
  const [daily, spotlightPayload, listingsPayload] = await Promise.all([
    getJson<{ listing: Listing | null; auction: AuctionState | null }>("/listings/daily"),
    getJson<{ spotlight: Spotlight | null }>("/listings/daily/spotlight"),
    getJson<{ listings: Listing[] }>(`/listings?limit=${HOME_LISTING_LIMIT}`),
  ]);

  return {
    listing: daily?.listing ?? null,
    auction: daily?.auction ?? null,
    spotlight: spotlightPayload?.spotlight ?? null,
    listings: listingsPayload?.listings ?? [],
  };
}

/** Every live seller listing, for the marketplace page's first paint. */
export async function loadMarketplaceListings(): Promise<Listing[]> {
  const payload = await getJson<{ listings: Listing[] }>(
    `/listings?limit=${MARKETPLACE_LISTING_LIMIT}`,
  );
  return payload?.listings ?? [];
}

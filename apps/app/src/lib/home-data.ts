import { getApiOrigin } from "@/lib/api-origin";
import type {
  AttentionAnalytics,
  AttentionMetrics,
  AuctionState,
  Spotlight,
} from "@/lib/dailyAuction";
import type { Listing } from "@/lib/marketplace";

const REVALIDATE_SECONDS = 20;

/** How much seller inventory the home page ships in its first paint. */
export const HOME_LISTING_LIMIT = 24;

export type HomePageData = {
  listing: Listing | null;
  auction: AuctionState | null;
  spotlight: Spotlight | null;
  /** Seller inventory — the daily auction is filtered out by the API. */
  listings: Listing[];
  /** Settled totals behind the stat strip; null when the call fails. */
  metrics: AttentionMetrics | null;
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
  const [daily, spotlightPayload, listingsPayload, analytics] = await Promise.all([
    getJson<{ listing: Listing | null; auction: AuctionState | null }>("/listings/daily"),
    getJson<{ spotlight: Spotlight | null }>("/listings/daily/spotlight"),
    getJson<{ listings: Listing[] }>(`/listings?limit=${HOME_LISTING_LIMIT}`),
    getJson<AttentionAnalytics>("/listings/daily/analytics"),
  ]);

  return {
    listing: daily?.listing ?? null,
    auction: daily?.auction ?? null,
    spotlight: spotlightPayload?.spotlight ?? null,
    listings: listingsPayload?.listings ?? [],
    metrics: analytics?.metrics ?? null,
  };
}

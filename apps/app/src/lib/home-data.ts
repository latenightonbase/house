import { getApiOrigin } from "@/lib/api-origin";
import type { Listing, RecentSale } from "@/lib/marketplace";

const REVALIDATE_SECONDS = 20;

/** How much seller inventory the home page ships in its first paint. */
export const HOME_LISTING_LIMIT = 24;

/** How many sales the home page's recently-sold strip shows. */
export const HOME_RECENT_SALES_LIMIT = 5;

/** The marketplace page shows the whole book — this is the API's own ceiling. */
export const MARKETPLACE_LISTING_LIMIT = 100;

export type HomePageData = {
  /** Live seller inventory. */
  listings: Listing[];
  /** Latest purchases and won auctions, with both parties. */
  recentSales: RecentSale[];
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
  const [listingsPayload, salesPayload] = await Promise.all([
    getJson<{ listings: Listing[] }>(`/listings?limit=${HOME_LISTING_LIMIT}`),
    getJson<{ sales: RecentSale[] }>(`/listings/recent-sales?limit=${HOME_RECENT_SALES_LIMIT}`),
  ]);

  return {
    listings: listingsPayload?.listings ?? [],
    recentSales: salesPayload?.sales ?? [],
  };
}

/** Every live seller listing, for the marketplace page's first paint. */
export async function loadMarketplaceListings(): Promise<Listing[]> {
  const payload = await getJson<{ listings: Listing[] }>(
    `/listings?limit=${MARKETPLACE_LISTING_LIMIT}`,
  );
  return payload?.listings ?? [];
}

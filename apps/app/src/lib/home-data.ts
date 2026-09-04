import { getApiOrigin } from "@/lib/api-origin";
import type { AuctionState, Spotlight } from "@/lib/dailyAuction";
import type { Listing } from "@/lib/marketplace";

const REVALIDATE_SECONDS = 20;

export type HomePageData = {
  listing: Listing | null;
  auction: AuctionState | null;
  spotlight: Spotlight | null;
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
  const [daily, spotlightPayload] = await Promise.all([
    getJson<{ listing: Listing | null; auction: AuctionState | null }>("/listings/daily"),
    getJson<{ spotlight: Spotlight | null }>("/listings/daily/spotlight"),
  ]);

  return {
    listing: daily?.listing ?? null,
    auction: daily?.auction ?? null,
    spotlight: spotlightPayload?.spotlight ?? null,
  };
}

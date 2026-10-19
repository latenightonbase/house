"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchListingDeals, type ListingDeal } from "@/lib/profileHistory";

/**
 * The signed-in user's deals on a listing, or an empty list for a visitor or
 * someone who never traded on it. `refreshKey` re-reads them — pass something
 * that changes when a sale lands (the listing's status, say) so a purchase made
 * on the page shows its "Rate the seller" straight away. `reload` re-reads
 * them on demand, after a review is saved.
 */
export function useListingDeals(
  listingId: string | null | undefined,
  enabled: boolean,
  refreshKey?: unknown,
) {
  const [deals, setDeals] = useState<ListingDeal[]>([]);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!listingId || !enabled) {
      setDeals([]);
      return;
    }
    let cancelled = false;
    fetchListingDeals(listingId)
      .then((next) => {
        if (!cancelled) setDeals(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [listingId, enabled, refreshKey, version]);

  return { deals, reload };
}

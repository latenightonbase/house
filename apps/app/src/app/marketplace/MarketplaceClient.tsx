"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { PageShell } from "@/components/PageShell";
import { CreateListingButton } from "@/components/CreateListingButton";
import { MarketplacePanel } from "@/components/home/MarketplacePanel";
import { MARKETPLACE_LISTING_LIMIT } from "@/lib/home-data";
import { fetchListings, type Listing } from "@/lib/marketplace";

const ListingCheckoutSheet = dynamic(
  () =>
    import("@/components/listing/ListingCheckoutSheet").then((m) => ({
      default: m.ListingCheckoutSheet,
    })),
  { ssr: false },
);

/** Same cadence as the home page, so a sold listing leaves both at once. */
const REFRESH_MS = 20_000;

/** The whole book of seller inventory, unpaged — the home page only previews it. */
export function MarketplaceClient({ initialListings }: { initialListings: Listing[] }) {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  // The listing outlives `checkoutOpen` so the sheet keeps its content while it
  // animates closed.
  const [checkoutListing, setCheckoutListing] = useState<Listing | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const load = useCallback(async () => {
    const market = await fetchListings({ limit: MARKETPLACE_LISTING_LIMIT }).catch(() => null);
    /** A failed refresh keeps the last good feed rather than emptying the market. */
    if (market) setListings(market);
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      if (!document.hidden) void load();
    }, REFRESH_MS);
    const onVisibility = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  return (
    <PageShell
      eyebrow="Media marketplace"
      title="Buy and sell"
      titleAccent="attention"
      intro="Every live placement on LNOC in one place — bid on auctions or buy outright from creators with an audience to offer."
      action={<CreateListingButton size="sm" label="List your attention" />}
    >
      <MarketplacePanel
        listings={listings}
        initialRows={Number.POSITIVE_INFINITY}
        onCheckout={(next) => {
          setCheckoutListing(next);
          setCheckoutOpen(true);
        }}
      />

      {checkoutListing ? (
        <ListingCheckoutSheet
          listing={checkoutListing}
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          onSettled={() => void load()}
        />
      ) : null}
    </PageShell>
  );
}

"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { CreateListingButton } from "@/components/CreateListingButton";
import { MarketplacePanel } from "@/components/home/MarketplacePanel";
import { MARKETPLACE_LISTING_LIMIT } from "@/lib/home-data";
import { fetchListings, isListingLive, type Listing } from "@/lib/marketplace";
import { searchFromParams, searchToParams, type MarketSearch } from "@/lib/listingSearch";

const ListingCheckoutSheet = dynamic(
  () =>
    import("@/components/listing/ListingCheckoutSheet").then((m) => ({
      default: m.ListingCheckoutSheet,
    })),
  { ssr: false },
);

type PanelProps = Omit<ComponentProps<typeof MarketplacePanel>, "search" | "onSearchChange">;

/**
 * The panel with its search kept in the address bar. Changes are written with
 * `history.replaceState`, which Next folds back into `useSearchParams`, so a
 * filter change does not re-run the page or add a history entry.
 */
function UrlSearchPanel(props: PanelProps) {
  const params = useSearchParams();
  const pathname = usePathname();
  const search = useMemo(() => searchFromParams(new URLSearchParams(params.toString())), [params]);
  const onSearchChange = useCallback(
    (next: MarketSearch) => window.history.replaceState(null, "", `${pathname}${searchToParams(next)}`),
    [pathname],
  );
  return <MarketplacePanel {...props} search={search} onSearchChange={onSearchChange} />;
}

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
    /**
     * A failed refresh keeps the last good feed rather than emptying the market,
     * less whatever has ended since it was fetched.
     */
    setListings((current) => market ?? current.filter((listing) => isListingLive(listing)));
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

  const panelProps: PanelProps = {
    listings,
    onCheckout: (next) => {
      setCheckoutListing(next);
      setCheckoutOpen(true);
    },
  };

  return (
    <PageShell
      eyebrow="Media marketplace"
      title="Buy and sell"
      titleAccent="attention"
      intro="Every live placement on LNOC in one place — bid on auctions or buy outright from creators with an audience to offer."
      action={<CreateListingButton size="sm" label="List your item" />}
    >
      {/* Reading the address bar opts out of static rendering, so the first
          paint is the unfiltered panel and the search applies once hydrated. */}
      <Suspense fallback={<MarketplacePanel {...panelProps} />}>
        <UrlSearchPanel {...panelProps} />
      </Suspense>

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

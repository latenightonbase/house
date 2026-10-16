"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useOpenConnect } from "@/components/connect-intent";
import { useSession } from "@/components/SessionProvider";
import { HOME_LISTING_LIMIT, HOME_RECENT_SALES_LIMIT, type HomePageData } from "@/lib/home-data";
import { fetchListings, fetchRecentSales, type Listing, type RecentSale } from "@/lib/marketplace";
import { HomeIntro } from "@/components/home/HomeIntro";
import { MarketplacePanel } from "@/components/home/MarketplacePanel";
import { ClosingSoonPanel } from "@/components/home/ClosingSoonPanel";
import { RecentSalesPanel } from "@/components/home/RecentSalesPanel";
const ListingCheckoutSheet = dynamic(
  () =>
    import("@/components/listing/ListingCheckoutSheet").then((m) => ({
      default: m.ListingCheckoutSheet,
    })),
  { ssr: false },
);

/** Poll cadence for the market feeds — fast enough to feel live, cheap enough to leave on. */
const REFRESH_MS = 20_000;

function AuthRequiredBanner() {
  const searchParams = useSearchParams();
  const { status } = useSession();
  const openConnect = useOpenConnect();
  const authRequired = searchParams.get("auth") === "required";

  if (!authRequired || status === "authenticated") return null;

  return (
    <div className="tile border-warning/30 bg-warning/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p className="text-[13px] text-warning">Connect your wallet to continue.</p>
      <button
        type="button"
        onClick={() => openConnect()}
        className="btn-primary h-9 px-4 text-[12px] shrink-0"
      >
        Connect wallet
      </button>
    </div>
  );
}

/**
 * The home page is a board, not a scroll, laid on one column rule: two thirds
 * and one third. The market's front row sits beside a rail of what is about to
 * sell and what just did.
 */
export default function HomeClient({
  listings: initialListings,
  recentSales: initialRecentSales,
}: HomePageData) {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [recentSales, setRecentSales] = useState<RecentSale[]>(initialRecentSales);
  // The listing outlives `checkoutOpen` so the sheet keeps its content while it
  // animates closed.
  const [checkoutListing, setCheckoutListing] = useState<Listing | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const load = useCallback(async () => {
    const [market, sales] = await Promise.all([
      fetchListings({ limit: HOME_LISTING_LIMIT }).catch(() => null),
      fetchRecentSales(HOME_RECENT_SALES_LIMIT).catch(() => null),
    ]);
    /** A failed refresh keeps the last good feed rather than emptying the market. */
    if (market) setListings(market);
    if (sales) setRecentSales(sales);
  }, []);

  useEffect(() => {
    // The page ships a cached snapshot, so the first refresh happens on mount
    // rather than a whole interval later. Without it a listing that sold since
    // the last revalidation stayed on the home page for up to REFRESH_MS — long
    // enough for someone to click through to a listing that is already gone.
    void load();

    const id = setInterval(() => {
      if (!document.hidden) void load();
    }, REFRESH_MS);

    // The interval deliberately skips while the tab is hidden, which leaves a
    // returning tab up to an interval behind. Catch it up on the way back.
    const onVisibility = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  function handleCheckout(next: Listing) {
    setCheckoutListing(next);
    setCheckoutOpen(true);
  }

  return (
    <div className="w-full space-y-4 pb-4">
      <Suspense fallback={null}>
        <AuthRequiredBanner />
      </Suspense>

      <HomeIntro />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <MarketplacePanel listings={listings} onCheckout={handleCheckout} previewHref="/marketplace" />
        {/* Under the market until there is a third column to hold it. Kept
            stacked even then: side by side, a short closing-soon list left a
            hole beside the sales ledger. */}
        <div className="grid grid-cols-1 items-start gap-4 xl:sticky xl:top-24">
          <ClosingSoonPanel listings={listings} onCheckout={handleCheckout} />
          <RecentSalesPanel sales={recentSales} />
        </div>
      </div>

      {checkoutListing ? (
        <ListingCheckoutSheet
          listing={checkoutListing}
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          onSettled={() => void load()}
        />
      ) : null}
    </div>
  );
}

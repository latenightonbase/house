"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useOpenConnect } from "@/components/connect-intent";
import { useSession } from "@/components/SessionProvider";
import {
  fetchDailyAuction,
  fetchSpotlight,
  isAuctionLeader,
  type AuctionState,
  type Spotlight,
} from "@/lib/dailyAuction";
import { HOME_LISTING_LIMIT, type HomePageData } from "@/lib/home-data";
import { fetchListings, type Listing } from "@/lib/marketplace";
import { TodaysAttention, TodaysAttentionEmpty } from "@/components/home/TodaysAttention";
import { LiveAuctionPanel } from "@/components/home/LiveAuctionPanel";
import { WinnerBenefits } from "@/components/home/WinnerBenefits";
import { AuctionEmpty } from "@/components/home/AuctionEmpty";
import { MarketStatStrip } from "@/components/home/MarketStatStrip";
import { MarketplacePanel } from "@/components/home/MarketplacePanel";
import { ClosingSoonPanel } from "@/components/home/ClosingSoonPanel";
const BidDialog = dynamic(
  () => import("@/components/home/BidDialog").then((m) => ({ default: m.BidDialog })),
  { ssr: false },
);
const EditListingDialog = dynamic(
  () => import("@/components/home/EditListingDialog").then((m) => ({ default: m.EditListingDialog })),
  { ssr: false },
);

/** Poll cadence for the live bid state — fast enough to feel live, cheap enough to leave on. */
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
 * The home page is a board, not a scroll. Stats set the scale, the billboard and
 * the show's own auction share the top row, and the open market sits level with
 * them in the second — so a seller's listing is on screen the day it goes live
 * and a buyer never has to scroll to learn the market exists.
 */
export default function HomeClient({
  listing: initialListing,
  auction: initialAuction,
  spotlight: initialSpotlight,
  listings: initialListings,
  metrics,
}: HomePageData) {
  const { status, user } = useSession();
  const openConnect = useOpenConnect();

  const [spotlight, setSpotlight] = useState<Spotlight | null>(initialSpotlight);
  const [listing, setListing] = useState<Listing | null>(initialListing);
  const [auction, setAuction] = useState<AuctionState | null>(initialAuction);
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [bidOpen, setBidOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    const [daily, current, market] = await Promise.all([
      fetchDailyAuction().catch(() => ({ listing: null, auction: null })),
      fetchSpotlight().catch(() => null),
      fetchListings({ limit: HOME_LISTING_LIMIT }).catch(() => null),
    ]);
    setListing(daily.listing);
    setAuction(daily.auction);
    setSpotlight(current);
    /** A failed refresh keeps the last good feed rather than emptying the market. */
    if (market) setListings(market);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) void load();
    }, REFRESH_MS);

    return () => {
      clearInterval(id);
    };
  }, [load]);

  function handlePlaceBid() {
    if (status !== "authenticated") {
      openConnect();
      return;
    }
    setBidOpen(true);
  }

  function handleEditListing() {
    if (status !== "authenticated") {
      openConnect();
      return;
    }
    setEditOpen(true);
  }

  const canEditListing = isAuctionLeader(user, auction?.leader?.wallet);

  return (
    <div className="w-full space-y-4 pb-4">
      <Suspense fallback={null}>
        <AuthRequiredBanner />
      </Suspense>

      <MarketStatStrip
        listings={listings}
        metrics={metrics}
        dailyAuctionLive={Boolean(listing)}
      />

      {/* Top row: what won yesterday, and what is being fought over today. */}
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {spotlight ? <TodaysAttention spotlight={spotlight} /> : <TodaysAttentionEmpty />}

        {listing ? (
          <LiveAuctionPanel
            listing={listing}
            auction={auction}
            onPlaceBid={handlePlaceBid}
            onEditListing={canEditListing ? handleEditListing : undefined}
          />
        ) : (
          <AuctionEmpty />
        )}
      </div>

      {/* Second row: the open market, on the same footing as the row above it. */}
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <MarketplacePanel listings={listings} />
        <ClosingSoonPanel listings={listings} />
      </div>

      <WinnerBenefits />

      {listing && bidOpen ? (
        <BidDialog
          listing={listing}
          auction={auction}
          open={bidOpen}
          onClose={() => setBidOpen(false)}
          onBidPlaced={(next) => {
            setAuction(next);
            void load();
          }}
        />
      ) : null}
      {listing && editOpen ? (
        <EditListingDialog
          listing={listing}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={(next) => {
            if (next) setAuction(next);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

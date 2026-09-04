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
import type { HomePageData } from "@/lib/home-data";
import type { Listing } from "@/lib/marketplace";
import { TodaysAttention, TodaysAttentionEmpty } from "@/components/home/TodaysAttention";
import { LiveAuctionPanel } from "@/components/home/LiveAuctionPanel";
import { WinnerBenefits } from "@/components/home/WinnerBenefits";
import { AuctionEmpty } from "@/components/home/AuctionEmpty";
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

export default function HomeClient({
  listing: initialListing,
  auction: initialAuction,
  spotlight: initialSpotlight,
}: HomePageData) {
  const { status, user } = useSession();
  const openConnect = useOpenConnect();

  const [spotlight, setSpotlight] = useState<Spotlight | null>(initialSpotlight);
  const [listing, setListing] = useState<Listing | null>(initialListing);
  const [auction, setAuction] = useState<AuctionState | null>(initialAuction);
  const [bidOpen, setBidOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    const [daily, current] = await Promise.all([
      fetchDailyAuction().catch(() => ({ listing: null, auction: null })),
      fetchSpotlight().catch(() => null),
    ]);
    setListing(daily.listing);
    setAuction(daily.auction);
    setSpotlight(current);
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

      {spotlight ? <TodaysAttention spotlight={spotlight} /> : <TodaysAttentionEmpty />}

      {listing ? (
        <>
          <LiveAuctionPanel
            listing={listing}
            auction={auction}
            onPlaceBid={handlePlaceBid}
            onEditListing={canEditListing ? handleEditListing : undefined}
          />
          <WinnerBenefits />
          {bidOpen ? (
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
          {editOpen ? (
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
        </>
      ) : (
        <AuctionEmpty />
      )}
    </div>
  );
}

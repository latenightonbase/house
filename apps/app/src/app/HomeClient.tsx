"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useSession } from "@/components/SessionProvider";
import {
  fetchDailyAuction,
  fetchSpotlight,
  isAuctionLeader,
  type AuctionState,
  type Spotlight,
} from "@/lib/dailyAuction";
import type { Listing } from "@/lib/marketplace";
import { TodaysAttention, TodaysAttentionEmpty } from "@/components/home/TodaysAttention";
import { LiveAuctionPanel } from "@/components/home/LiveAuctionPanel";
import { WinnerBenefits } from "@/components/home/WinnerBenefits";
import { AuctionEmpty } from "@/components/home/AuctionEmpty";
import { BidDialog } from "@/components/home/BidDialog";
import { EditListingDialog } from "@/components/home/EditListingDialog";

/** Poll cadence for the live bid state — fast enough to feel live, cheap enough to leave on. */
const REFRESH_MS = 20_000;

export default function HomeClient() {
  const searchParams = useSearchParams();
  const { status, user } = useSession();
  const { openConnectModal } = useConnectModal();
  const authRequired = searchParams.get("auth") === "required";

  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [loading, setLoading] = useState(true);
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
    let cancelled = false;
    load().finally(() => !cancelled && setLoading(false));

    // Keeps the leader and bid tally current while the tab is open.
    const id = setInterval(() => {
      if (!document.hidden) void load();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [load]);

  function handlePlaceBid() {
    if (status !== "authenticated") {
      openConnectModal?.();
      return;
    }
    setBidOpen(true);
  }

  function handleEditListing() {
    if (status !== "authenticated") {
      openConnectModal?.();
      return;
    }
    setEditOpen(true);
  }

  const canEditListing = isAuctionLeader(user, auction?.leader?.wallet);

  return (
    <div className="w-full space-y-4 pb-4">
      {authRequired && status !== "authenticated" ? (
        <div className="tile border-warning/30 bg-warning/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[13px] text-warning">Connect your wallet to continue.</p>
          <button
            type="button"
            onClick={() => openConnectModal?.()}
            className="btn-primary h-9 px-4 text-[12px] shrink-0"
          >
            Connect wallet
          </button>
        </div>
      ) : null}

      {loading ? (
        <>
          <div className="panel-glow h-[420px] animate-pulse" />
          <div className="panel-glow h-[300px] animate-pulse" />
        </>
      ) : (
        <>
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
              <EditListingDialog
                listing={listing}
                open={editOpen}
                onClose={() => setEditOpen(false)}
                onSaved={(next) => {
                  if (next) setAuction(next);
                  void load();
                }}
              />
            </>
          ) : (
            <AuctionEmpty />
          )}
        </>
      )}
    </div>
  );
}

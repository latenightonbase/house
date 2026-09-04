"use client";

import { useState } from "react";
import { Info, Pencil, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useCountdown } from "@/lib/useCountdown";
import type { AuctionState } from "@/lib/dailyAuction";
import type { Listing } from "@/lib/marketplace";
import { isUnoptimizedSrc } from "@/lib/imageSrc";
import { cn, walletFallbackAvatar } from "@/lib/utils";
import Image from "next/image";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function CountdownUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[clamp(1.5rem,4.5vw,2.25rem)] font-bold text-white numeric leading-none">
        {value}
      </span>
      <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-caption">
        {label}
      </span>
    </div>
  );
}

function StatTile({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("tile px-4 py-4 flex flex-col items-center text-center", className)}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-primary-light">
        {label}
      </p>
      <div className="mt-2.5 w-full">{children}</div>
    </div>
  );
}

function CurrentLeaderCard({
  leader,
  onEdit,
}: {
  leader: NonNullable<AuctionState["leader"]>;
  onEdit?: () => void;
}) {
  const [bgFailed, setBgFailed] = useState(false);

  const projectName = leader.project?.name ?? leader.name;
  const uploaded = leader.project?.avatarUrl ?? leader.avatarUrl;
  const artwork = !bgFailed && uploaded ? uploaded : null;
  const bidderAvatar =
    leader.bidder.avatarUrl || walletFallbackAvatar(leader.bidder.wallet);

  return (
    <div
      className={cn(
        "relative h-full min-h-[13.5rem] overflow-hidden rounded-xl border border-line",
        !artwork && "bg-[radial-gradient(120%_90%_at_70%_20%,rgba(168,85,247,0.45),transparent_55%),linear-gradient(160deg,#1a0b2e_0%,#2a1148_50%,#0a0410_100%)]",
      )}
    >
      {artwork ? (
        <>
          <Image
            src={artwork}
            alt=""
            fill
            sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
            unoptimized={isUnoptimizedSrc(artwork)}
            onError={() => setBgFailed(true)}
            className="object-cover grayscale"
          />
          {/* Violet night wash — same tokens as the billboard and empty-state card. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_15%,rgba(168,85,247,0.34),transparent_56%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/20"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-primary/30"
          />
        </>
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/20"
        />
      )}

      <div className="relative z-10 flex h-full min-h-[13.5rem] w-full min-w-0 flex-col justify-between p-4">
        <div className="flex items-center gap-2">
          <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/75">
            <Trophy className="w-3 h-3 text-warning" aria-hidden="true" />
            Current leader
          </p>
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-black/35 px-2 py-1 text-[11px] font-semibold text-white/90 hover:bg-black/55 hover:text-white"
            >
              <Pencil className="w-3 h-3" aria-hidden="true" />
              Edit listing
            </button>
          ) : null}
        </div>

        <div className="min-w-0 max-w-full">
          <div className="max-w-full overflow-x-auto">
            <p className="display w-max max-w-none whitespace-nowrap text-[clamp(1.4rem,3.4vw,2rem)] uppercase text-white">
              {projectName}
            </p>
          </div>
          <div className="mt-2.5 flex items-center gap-2 min-w-0">
            <Image
              src={bidderAvatar}
              width={20}
              height={20}
              alt=""
              unoptimized={isUnoptimizedSrc(bidderAvatar)}
              className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-white/25"
            />
            <span className="truncate text-[12px] text-white/80">{leader.bidder.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * "Tomorrow's Attention Auction" — the live bidding surface. Bid amount, clock
 * and leader read from the API; the clock is the only thing that ticks, so the
 * rest re-renders only when a bid lands.
 */
export function LiveAuctionPanel({
  listing,
  auction,
  onPlaceBid,
  onEditListing,
}: {
  listing: Listing;
  auction: AuctionState | null;
  onPlaceBid: () => void;
  onEditListing?: () => void;
}) {
  const countdown = useCountdown(listing.endDate);
  const currentBid = auction?.currentBid ?? listing.price;
  const reserve = auction?.reservePrice ?? listing.price;
  const leader = auction?.leader ?? null;
  const ended = countdown?.ended ?? false;

  return (
    <section className="panel-glow p-5 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 eyebrow text-live">
            <span className="live-dot" aria-hidden="true" />
            {ended ? "Settling" : "Live now"}
          </p>
          <h2 className="mt-2.5 display text-[clamp(1.5rem,4vw,2.5rem)] uppercase text-white">
            Tomorrow&apos;s Attention Auction
          </h2>
          <p className="mt-2.5 text-[14px] text-caption leading-relaxed">
            Win the next 24-hour billboard + Late Night spotlight on the show.
          </p>
        </div>

        <Link
          href={`/listings/${listing.id}`}
          className="btn-outline-accent shrink-0 sm:ml-auto inline-flex items-center justify-center gap-2 h-10 px-4 text-[11px] uppercase tracking-[0.13em]"
        >
          View auction details
          <Info className="w-[14px] h-[14px]" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 items-between xl:grid-cols-3">
        
        <div className="flex flex-col gap-3">
          <StatTile label="Current bid">
            <p className="text-[clamp(1.75rem,5vw,2.5rem)] font-bold text-primary-bright numeric leading-none">
              ${currentBid.toLocaleString()}
            </p>
            <p className="mt-2.5 text-[11px] text-caption">
              {auction ? (
                <>
                  {auction.bidCount} {auction.bidCount === 1 ? "bid" : "bids"}
                  <span className="mx-1.5 text-line-strong">•</span>
                  {auction.bidderCount} {auction.bidderCount === 1 ? "bidder" : "bidders"}
                </>
              ) : (
                "No bids yet"
              )}
            </p>
          </StatTile>

          <StatTile label={ended ? "Auction closed" : "Auction ends in"}>
            {countdown ? (
              <div className="flex items-start justify-center gap-2 sm:gap-3">
                <CountdownUnit value={pad(countdown.hours)} label="Hrs" />
                <span className="text-[clamp(1.5rem,4.5vw,2.25rem)] font-bold text-line-strong leading-none">
                  :
                </span>
                <CountdownUnit value={pad(countdown.minutes)} label="Min" />
                <span className="text-[clamp(1.5rem,4.5vw,2.25rem)] font-bold text-line-strong leading-none">
                  :
                </span>
                <CountdownUnit value={pad(countdown.seconds)} label="Sec" />
              </div>
            ) : (
              <div className="h-[3.25rem] flex items-center justify-center">
                <span className="text-[13px] text-caption">—</span>
              </div>
            )}
          </StatTile>

        </div>

        {leader ? (
          <CurrentLeaderCard
            leader={leader}
            onEdit={!ended && onEditListing ? onEditListing : undefined}
          />
        ) : (
          <div className="tile h-full px-4 py-4 flex flex-col">
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-primary-light">
              <Trophy className="w-3 h-3 text-warning" aria-hidden="true" />
              Current leader
            </p>
            <p className="mt-3 text-[14px] font-semibold text-white">No bids yet</p>
            <p className="mt-2 text-[11px] text-caption leading-relaxed">
              Open at ${reserve.toLocaleString()} — the lead is yours for the taking.
            </p>
          </div>
        )}

        <div className="flex flex-col justify-end w-full gap-2.5 pl-10">
          <button
            type="button"
            onClick={onPlaceBid}
            disabled={ended}
            className="gradient-button inline-flex items-center justify-center gap-2.5 h-14 rounded-lg text-white text-[13px] uppercase tracking-[0.14em] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-[18px] h-[18px]" aria-hidden="true" />
            {ended ? "Auction closed" : "Place bid"}
          </button>
          <p className="text-center text-[11px] text-caption">
            Reserve price: ${reserve.toLocaleString()} {listing.tokenName || listing.currency}
          </p>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { ArrowRight, Pencil, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useCountdown } from "@/lib/useCountdown";
import type { AuctionState } from "@/lib/dailyAuction";
import type { Listing } from "@/lib/marketplace";
import { isUnoptimizedSrc } from "@/lib/imageSrc";
import { cn, walletFallbackAvatar } from "@/lib/utils";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Who is winning, with their pitch artwork behind them. Kept to a strip rather
 * than a card — in the panel's column the clock and the bid have to stay the
 * two loudest things.
 */
function LeaderStrip({
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
  const bidderAvatar = leader.bidder.avatarUrl || walletFallbackAvatar(leader.bidder.wallet);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-line",
        !artwork &&
          "bg-[radial-gradient(120%_90%_at_70%_20%,rgba(168,85,247,0.35),transparent_58%),linear-gradient(160deg,#1a0b2e_0%,#2a1148_55%,#0a0410_100%)]",
      )}
    >
      {artwork ? (
        <>
          <Image
            src={artwork}
            alt=""
            fill
            sizes="(min-width: 1280px) 22rem, 100vw"
            unoptimized={isUnoptimizedSrc(artwork)}
            onError={() => setBgFailed(true)}
            className="object-cover grayscale"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_15%,rgba(168,85,247,0.34),transparent_56%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/30"
          />
        </>
      ) : null}

      <div className="relative z-10 flex items-center gap-3 p-3.5">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/70">
            <Trophy className="h-3 w-3 text-warning" aria-hidden="true" />
            Current leader
          </p>
          <p className="mt-1.5 truncate text-[15px] font-bold text-white">{projectName}</p>
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <Image
              src={bidderAvatar}
              width={16}
              height={16}
              alt=""
              unoptimized={isUnoptimizedSrc(bidderAvatar)}
              className="h-4 w-4 shrink-0 rounded-full object-cover ring-1 ring-white/25"
            />
            <span className="truncate text-[11px] text-white/75">{leader.bidder.name}</span>
          </div>
        </div>

        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/20 bg-black/35 px-2 py-1 text-[11px] font-semibold text-white/90 transition-colors hover:bg-black/55 hover:text-white"
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            Edit
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The show's own lot, in the column the eye lands on after the billboard. It
 * stays the loudest single panel on the page — gradient CTA, ticking clock, the
 * only live dot — while the market fills the rows beneath it.
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
    <section className="panel-glow flex flex-col p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-live">
            <span className="live-dot" aria-hidden="true" />
            {ended ? "Settling" : "Live now"}
          </p>
          <h2 className="mt-2 display text-[clamp(1.25rem,3.4vw,1.75rem)] uppercase text-white">
            Tomorrow&apos;s Attention Auction
          </h2>
        </div>
      </header>

      <p className="mt-2 text-[12px] leading-relaxed text-caption">
        Win the next 24-hour billboard + Late Night spotlight on the show.
      </p>

      {/* Bid and clock share a line so the panel finishes near the billboard's
          height — stacked, this column ran a third taller than the row beside it. */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="tile px-3 py-3.5 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-primary-light">
            Current bid
          </p>
          <p className="numeric mt-2 text-[clamp(1.5rem,4.5vw,2.125rem)] font-bold leading-none text-primary-bright">
            ${currentBid.toLocaleString()}
          </p>
          <p className="mt-2 text-[10px] text-caption">
            {auction ? (
              <>
                {auction.bidCount} {auction.bidCount === 1 ? "bid" : "bids"}
                <span className="mx-1 text-line-strong">•</span>
                {auction.bidderCount} {auction.bidderCount === 1 ? "bidder" : "bidders"}
              </>
            ) : (
              "No bids yet"
            )}
          </p>
        </div>

        <div className="tile px-3 py-3.5 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-primary-light">
            {ended ? "Closed" : "Ends in"}
          </p>
          <p className="numeric mt-2 text-[clamp(1.25rem,3.6vw,1.75rem)] font-bold leading-none text-white">
            {countdown
              ? `${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`
              : "—"}
          </p>
          <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-caption">
            Hrs · Min · Sec
          </p>
        </div>
      </div>

      <div className="mt-2.5">
        {leader ? (
          <LeaderStrip leader={leader} onEdit={!ended && onEditListing ? onEditListing : undefined} />
        ) : (
          <div className="tile px-3.5 py-3.5">
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary-light">
              <Trophy className="h-3 w-3 text-warning" aria-hidden="true" />
              Current leader
            </p>
            <p className="mt-1.5 text-[13px] font-semibold text-white">No bids yet</p>
            <p className="mt-1 text-[11px] leading-relaxed text-caption">
              Open at ${reserve.toLocaleString()} — the lead is yours for the taking.
            </p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onPlaceBid}
          disabled={ended}
          className="gradient-button inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-lg text-[12px] font-bold uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Zap className="h-[17px] w-[17px]" aria-hidden="true" />
          {ended ? "Auction closed" : "Place bid"}
        </button>
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-caption">
            Reserve ${reserve.toLocaleString()} {listing.tokenName || listing.currency}
          </p>
          <Link
            href={`/listings/${listing.id}`}
            className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-primary-light transition-colors hover:text-white"
          >
            Auction details
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

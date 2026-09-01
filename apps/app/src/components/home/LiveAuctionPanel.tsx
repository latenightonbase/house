"use client";

import { Info, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useCountdown } from "@/lib/useCountdown";
import type { AuctionState } from "@/lib/dailyAuction";
import type { Listing } from "@/lib/marketplace";
import { cn } from "@/lib/utils";

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

/**
 * "Tomorrow's Attention Auction" — the live bidding surface. Bid amount, clock
 * and leader read from the API; the clock is the only thing that ticks, so the
 * rest re-renders only when a bid lands.
 */
export function LiveAuctionPanel({
  listing,
  auction,
  onPlaceBid,
}: {
  listing: Listing;
  auction: AuctionState | null;
  onPlaceBid: () => void;
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

        <StatTile label="Current leader">
          {leader ? (
            <>
              <div className="flex items-center justify-center gap-2 min-w-0">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-warning/15 border border-warning/30 shrink-0">
                  <Trophy className="w-3.5 h-3.5 text-warning" aria-hidden="true" />
                </span>
                <span className="text-[14px] font-semibold text-white truncate">
                  {leader.name}
                </span>
              </div>
              <p className="mt-2 text-[20px] font-bold text-primary-bright numeric">
                ${leader.amount.toLocaleString()}
              </p>
              <p className="mt-1.5 text-[11px] text-caption">Outbid to take the lead.</p>
            </>
          ) : (
            <>
              <p className="text-[14px] font-semibold text-white">No bids yet</p>
              <p className="mt-2 text-[11px] text-caption">
                Open at ${reserve.toLocaleString()} — the lead is yours for the taking.
              </p>
            </>
          )}
        </StatTile>

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

"use client";

import { Trophy } from "lucide-react";
import { BrandAvatar } from "@/components/ui";
import type { Listing, ListingBidder } from "@/lib/marketplace";
import { formatListingAmount } from "@/lib/tokenPrices";
import { cn, shortAddress, walletFallbackAvatar } from "@/lib/utils";
import { RatingBadge } from "@/components/reviews/RatingBadge";

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * The bids so far: who a bidder is up against and by how much. Compact enough
 * for the checkout sheet; the listing page wraps the same list in a card.
 */
export function BidHistory({
  listing,
  bidders,
}: {
  listing: Listing;
  bidders: ListingBidder[] | null;
}) {
  if (bidders === null) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (bidders.length === 0) {
    return (
      <p className="px-1 py-3 text-center text-[12px] text-caption">
        No bids yet — yours would open the auction.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-line/70">
      {bidders.map((bidder) => (
        <li key={bidder.wallet} className="flex items-center gap-3 py-2.5">
          <BrandAvatar
            src={bidder.avatarUrl || walletFallbackAvatar(bidder.wallet)}
            alt={bidder.name}
            fallbackSeed={bidder.wallet}
            size={28}
          />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-white">
              <span className="truncate">{bidder.name}</span>
              <RatingBadge rating={bidder.rating} />
              {bidder.leading && (
                <span className="badge badge-warning shrink-0">
                  <Trophy className="mr-1 h-2.5 w-2.5" aria-hidden="true" />
                  Leading
                </span>
              )}
            </p>
            <p className="truncate text-[11px] text-caption">
              {[
                shortAddress(bidder.wallet),
                bidder.bidCount > 1 ? `${bidder.bidCount} bids` : null,
                timeAgo(bidder.lastBidAt),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <p
            className={cn(
              "numeric shrink-0 text-[14px] font-bold",
              bidder.leading ? "text-primary-bright" : "text-white",
            )}
          >
            {formatListingAmount(listing, bidder.amount)}
          </p>
        </li>
      ))}
    </ol>
  );
}

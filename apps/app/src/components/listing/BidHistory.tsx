"use client";

import { Trophy } from "lucide-react";
import { BrandAvatar } from "@/components/ui";
import type { ListingBidder } from "@/lib/marketplace";
import { cn, shortAddress, walletFallbackAvatar } from "@/lib/utils";

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * The bids so far, compact enough to sit inside a checkout sheet. The listing
 * page has the full project cards; here a bidder only needs to see who they are
 * up against and by how much.
 */
export function BidHistory({ bidders }: { bidders: ListingBidder[] | null }) {
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
              <span className="truncate">{bidder.project?.name ?? bidder.name}</span>
              {bidder.leading && (
                <span className="badge badge-warning shrink-0">
                  <Trophy className="mr-1 h-2.5 w-2.5" aria-hidden="true" />
                  Leading
                </span>
              )}
            </p>
            {/* The title line already carries the bidder's name when there is no
                project, so the meta line only repeats it under a project. */}
            <p className="truncate text-[11px] text-caption">
              {[
                bidder.project?.name ? bidder.name : null,
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
            ${bidder.amount.toLocaleString()}
          </p>
        </li>
      ))}
    </ol>
  );
}

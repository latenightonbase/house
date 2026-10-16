"use client";

import { Users } from "lucide-react";
import { Card } from "@/components/ui";
import type { Listing, ListingBidder } from "@/lib/marketplace";
import { BidHistory } from "./BidHistory";

export function AuctionBidders({
  listing,
  bidders,
  loading,
}: {
  /** Bids are in the listing's own token, not dollars. */
  listing: Listing;
  bidders: ListingBidder[] | null;
  loading?: boolean;
}) {
  if (loading || bidders === null) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-40 animate-pulse rounded bg-white/[0.04]" />
        <div className="card h-36 animate-pulse bg-white/[0.03]" />
      </div>
    );
  }

  if (bidders.length === 0) {
    return (
      <Card className="px-5 py-8 text-center">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-primary/30 bg-primary/10">
          <Users className="w-5 h-5 text-primary-light" aria-hidden="true" />
        </span>
        <p className="mt-4 text-[15px] font-semibold text-white">No bids yet</p>
        <p className="mt-1.5 text-[13px] text-caption max-w-sm mx-auto leading-relaxed">
          The first bid opens this list — everyone who bids on the auction shows up here.
        </p>
      </Card>
    );
  }

  return (
    <section className="space-y-3" aria-labelledby="auction-bidders-heading">
      <div className="flex items-end justify-between gap-3">
        <h2 id="auction-bidders-heading" className="text-[15px] font-bold text-white">
          Bids on this auction
        </h2>
        <p className="text-[12px] text-caption">
          {bidders.length} {bidders.length === 1 ? "bidder" : "bidders"}
        </p>
      </div>
      <Card className="px-4 py-1.5">
        <BidHistory listing={listing} bidders={bidders} />
      </Card>
    </section>
  );
}

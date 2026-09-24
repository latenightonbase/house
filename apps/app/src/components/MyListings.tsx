"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Tile } from "@/components/ui";
import { fetchMyListings, type Listing, type ListingStatus } from "@/lib/marketplace";
import { relativeEndLabel } from "@/lib/utils";
import type { BadgeVariant } from "@/components/ui";

/** How each state reads to the seller who owns the listing. */
const STATUS_COPY: Record<ListingStatus, { label: string; variant: BadgeVariant; hint: string }> = {
  PENDING_REVIEW: {
    label: "In review",
    variant: "warning",
    hint: "Waiting on the LNOC team. Nothing on-chain yet.",
  },
  DRAFT: {
    label: "Approved",
    variant: "positive",
    hint: "Approved — open it to sign the transaction that publishes it.",
  },
  REJECTED: {
    label: "Not approved",
    variant: "negative",
    hint: "Turned down. Open it to see why.",
  },
  ACTIVE: { label: "Live", variant: "accent", hint: "On the marketplace." },
  SOLD: { label: "Sold", variant: "neutral", hint: "This one is done." },
  CANCELLED: { label: "Cancelled", variant: "neutral", hint: "No longer listed." },
};

/** The seller's own listings in every state — the only place review status shows. */
export function MyListings() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchMyListings()
      .then(setListings)
      .catch(() => setFailed(true));
  }, []);

  if (failed || listings?.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[15px] font-bold text-foreground">Your listings</h2>
        <p className="text-[12px] text-caption mt-0.5">
          Everything you have submitted, and where each one stands.
        </p>
      </div>

      {listings === null ? (
        <div className="card h-24 animate-pulse bg-white/[0.03]" />
      ) : (
        <div className="space-y-2">
          {listings.map((listing) => {
            const state = STATUS_COPY[listing.status];
            return (
              <Link key={listing.id} href={`/listings/${listing.id}`} className="block">
                <Tile className="px-4 py-3 flex items-start gap-3 hover:border-line-strong transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-white truncate">
                      {listing.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-caption">
                      ${listing.price.toLocaleString()} ·{" "}
                      {listing.pricingType === "AUCTION" ? "Auction" : "Flat price"}
                      {listing.endDate ? ` · ${relativeEndLabel(listing.endDate)}` : ""}
                    </p>
                    <p className="mt-1 text-[11px] text-caption leading-relaxed">{state.hint}</p>
                  </div>
                  <Badge variant={state.variant} className="shrink-0">
                    {state.label}
                  </Badge>
                </Tile>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

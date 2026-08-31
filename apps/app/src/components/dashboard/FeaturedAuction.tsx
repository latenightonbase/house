"use client";

import { useState } from "react";
import { BadgeCheck, Gavel } from "lucide-react";
import { Button, Panel } from "@/components/ui";
import { brandMarkDataUri } from "@/lib/brandMark";
import { relativeEndLabel } from "@/lib/utils";
import type { Listing } from "@/lib/marketplace";

interface FeaturedAuctionProps {
  listing: Listing;
  onView?: (listingId: string) => void;
}

/** Discover's daily auction — the live SUPERADMIN listing, not seeded display data. */
export function FeaturedAuction({ listing, onView }: FeaturedAuctionProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const cover =
    !coverFailed && listing.creator.avatarUrl
      ? listing.creator.avatarUrl
      : brandMarkDataUri(listing.creator.displayName || listing.title, true);

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-5">
        <div className="shrink-0 w-24 sm:w-32 mx-auto sm:mx-0">
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt={listing.title}
              onError={() => setCoverFailed(true)}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="min-w-0 flex-1 flex flex-col text-center sm:text-left">
          <span className="panel-label flex items-center justify-center sm:justify-start gap-1.5">
            <Gavel className="w-3 h-3" />
            Daily auction
          </span>

          <h2 className="mt-1.5 text-2xl font-bold text-white tracking-tight flex items-center justify-center sm:justify-start gap-1.5">
            <span className="truncate">{listing.title}</span>
            {listing.creator.verified && (
              <BadgeCheck className="w-5 h-5 text-primary shrink-0" aria-label="Verified" />
            )}
          </h2>

          {listing.description && (
            <p className="mt-3 text-[13px] text-caption leading-relaxed max-w-md">
              {listing.description}
            </p>
          )}

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <p className="text-[11px] text-caption">Minimum bid</p>
              <p className="text-xl font-bold text-white numeric">
                ${listing.price.toLocaleString()}
              </p>
              {listing.endDate ? (
                <p className="mt-0.5 text-[11px] text-caption">
                  Closes {relativeEndLabel(listing.endDate)}
                </p>
              ) : null}
            </div>
            <Button
              variant="gradient"
              onClick={() => onView?.(listing.id)}
              className="sm:ml-auto"
            >
              Place a bid
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

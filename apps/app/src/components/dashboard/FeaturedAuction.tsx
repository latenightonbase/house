"use client";

import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Button, Panel, PlatformIcon } from "@/components/ui";
import { brandMarkDataUri } from "@/lib/brandMark";
import type { Auction } from "@/lib/marketplace";

interface FeaturedAuctionProps {
  auction: Auction;
  onView?: (auctionId: string) => void;
}

/** The dashboard's anchor panel: the top creator, their reach, and a clear way to book them. */
export function FeaturedAuction({ auction, onView }: FeaturedAuctionProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const cover =
    !coverFailed && (auction.imageUrl || auction.hostedBy.avatarUrl)
      ? (auction.imageUrl || auction.hostedBy.avatarUrl)!
      : brandMarkDataUri(auction.hostedBy.displayName || auction.title, true);

  const stats = [auction.avgViews && `${auction.avgViews} avg views`, auction.engagement && `${auction.engagement} engagement`]
    .filter(Boolean)
    .join(" · ");
  const firstName = auction.hostedBy.displayName.split(/[\s-]+/)[0] || "now";

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-5">
        <div className="shrink-0 w-24 sm:w-32 mx-auto sm:mx-0">
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt={auction.title}
              onError={() => setCoverFailed(true)}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="min-w-0 flex-1 flex flex-col text-center sm:text-left">
          <span className="panel-label">Featured creator</span>

          <h2 className="mt-1.5 text-2xl font-bold text-white tracking-tight flex items-center justify-center sm:justify-start gap-1.5">
            <span className="truncate">{auction.hostedBy.displayName}</span>
            {auction.hostedBy.verified && (
              <BadgeCheck className="w-5 h-5 text-primary shrink-0" aria-label="Verified" />
            )}
          </h2>

          {auction.reach.length > 0 && (
            <div className="mt-2 flex items-center justify-center sm:justify-start flex-wrap gap-x-3 gap-y-1.5 text-[13px] text-caption">
              {auction.reach.map((r) => (
                <span key={r.platform} className="flex items-center gap-1.5">
                  <PlatformIcon platform={r.platform} className="w-3.5 h-3.5" />
                  <span className="text-white font-medium numeric">{r.value}</span>
                </span>
              ))}
            </div>
          )}

          {stats && <p className="mt-1.5 text-[13px] text-caption">{stats}</p>}

          {auction.description && (
            <p className="mt-3 text-[13px] text-caption leading-relaxed max-w-md">
              {auction.description}
            </p>
          )}

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <p className="text-[11px] text-caption">Starting at</p>
              <p className="text-xl font-bold text-white numeric">
                ${auction.minimumBid.toLocaleString()}
              </p>
            </div>
            <Button
              variant="gradient"
              onClick={() => onView?.(auction.id)}
              className="sm:ml-auto"
            >
              Book {firstName}
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

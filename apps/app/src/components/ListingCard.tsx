"use client";

import { BadgeCheck } from "lucide-react";
import { BrandAvatar, Button, Card, PlatformIcon } from "@/components/ui";
import type { Listing } from "@/lib/marketplace";

/**
 * One unit of fixed-price media inventory. Reads as a service listing —
 * what you get, from whom, for how much — not as a tradeable instrument.
 */
export function ListingCard({
  listing,
  onOpenCreator,
}: {
  listing: Listing;
  onOpenCreator?: (id: string) => void;
}) {
  const soldOut = listing.slotsAvailable <= 0;

  return (
    <Card className="p-4 flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 text-caption">
          <PlatformIcon platform={listing.platform} className="w-3.5 h-3.5" />
          <span className="text-[11px] truncate">{listing.placement}</span>
        </div>
        {soldOut ? (
          <span className="text-[11px] text-caption shrink-0">Sold out</span>
        ) : (
          <span className="text-[11px] text-caption shrink-0">
            {listing.slotsAvailable} left
          </span>
        )}
      </div>

      <div>
        <h3 className="text-[14px] font-semibold text-foreground leading-snug">
          {listing.title}
        </h3>
        {listing.description && (
          <p className="mt-1 text-[12px] text-caption leading-relaxed line-clamp-2">
            {listing.description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onOpenCreator?.(listing.creator.id)}
        className="flex items-center gap-2.5 min-w-0 text-left"
      >
        <BrandAvatar
          src={listing.creator.avatarUrl}
          alt={listing.creator.displayName}
          size={30}
        />
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-white truncate flex items-center gap-1">
            {listing.creator.displayName}
            {listing.creator.verified && (
              <BadgeCheck className="w-3 h-3 text-primary shrink-0" />
            )}
          </p>
          <p className="text-[11px] text-caption truncate">{listing.creator.reach} reach</p>
        </div>
      </button>

      <div className="mt-auto flex items-end justify-between gap-3 pt-1">
        <div>
          <p className="text-[11px] text-caption">Price</p>
          <p className="text-lg font-bold text-white numeric">
            ${listing.price.toLocaleString()}
          </p>
          {listing.turnaroundDays && (
            <p className="text-[11px] text-caption mt-0.5">
              ~{listing.turnaroundDays}d turnaround
            </p>
          )}
        </div>
        <Button size="sm" disabled={soldOut} className="shrink-0">
          {soldOut ? "Sold out" : "Book"}
        </Button>
      </div>
    </Card>
  );
}

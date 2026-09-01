"use client";

import { BadgeCheck, Gavel } from "lucide-react";
import { Badge, BrandAvatar, Button, Card, PlatformIcon } from "@/components/ui";
import { categoryMeta } from "@/lib/listingCategories";
import type { Listing } from "@/lib/marketplace";
import { relativeEndLabel, walletFallbackAvatar } from "@/lib/utils";

/**
 * One unit of media on sale. Reads as a service listing — what you get, from
 * whom, for how much — not as a tradeable instrument. Auction listings carry
 * the same shape, differing only in how the price is described.
 */
export function ListingCard({
  listing,
  onOpenCreator,
  onBook,
}: {
  listing: Listing;
  onOpenCreator?: (id: string) => void;
  onBook?: (id: string) => void;
}) {
  const isAuction = listing.pricingType === "AUCTION";
  const soldOut = !isAuction && listing.slotsAvailable <= 0;
  const meta = categoryMeta(listing.category);
  const CategoryIcon = meta.icon;

  return (
    <Card className="p-4 flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 text-caption">
          {listing.platform ? (
            <PlatformIcon platform={listing.platform} className="w-3.5 h-3.5" />
          ) : (
            <CategoryIcon className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="text-[11px] truncate">{listing.placement ?? meta.label}</span>
        </div>
        {isAuction ? (
          <Badge variant="accent" className="shrink-0">
            <Gavel className="w-2.5 h-2.5 mr-1" />
            Auction
          </Badge>
        ) : soldOut ? (
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
          src={listing.creator.avatarUrl || walletFallbackAvatar(listing.creator.wallet)}
          alt={listing.creator.displayName}
          fallbackSeed={listing.creator.wallet}
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
          <p className="text-[11px] text-caption">{isAuction ? "Minimum bid" : "Price"}</p>
          <p className="text-lg font-bold text-white numeric">
            ${listing.price.toLocaleString()}
          </p>
          <p className="text-[11px] text-caption mt-0.5">
            {listing.endDate
              ? relativeEndLabel(listing.endDate)
              : listing.turnaroundDays
                ? `~${listing.turnaroundDays}d turnaround`
                : meta.label}
          </p>
        </div>
        <Button
          size="sm"
          disabled={soldOut}
          className="shrink-0"
          onClick={() => onBook?.(listing.id)}
        >
          {isAuction ? "Place bid" : soldOut ? "Sold out" : "Book"}
        </Button>
      </div>
    </Card>
  );
}

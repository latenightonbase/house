import { BadgeCheck, Clock, Gavel } from "lucide-react";
import { BrandAvatar, PlatformIcon } from "@/components/ui";
import type { Countdown } from "@/lib/useCountdown";
import { categoryMeta } from "@/lib/listingCategories";
import type { Listing } from "@/lib/marketplace";
import { cn, relativeEndLabel, walletFallbackAvatar } from "@/lib/utils";

/**
 * Listings run from a cent to five figures, so the decimals follow the size of
 * the number rather than a fixed rule — $0.014 keeps its precision, $25,000
 * does not grow a ".00".
 */
export function money(amount: number) {
  return amount.toLocaleString(undefined, { maximumFractionDigits: amount < 1 ? 4 : 2 });
}

/** Under a day left reads as urgent — the one place a listing borrows warning. */
export function endsSoon(endDate?: string) {
  if (!endDate) return false;
  const ms = new Date(endDate).getTime() - Date.now();
  return ms > 0 && ms < 24 * 3_600_000;
}

/** A clock past a day stops being a clock — days and hours carry it better. */
export function countdownLabel(countdown: Countdown | null) {
  if (!countdown) return "—";
  if (countdown.ended) return "Closed";
  if (countdown.hours >= 24) {
    const days = Math.floor(countdown.hours / 24);
    return `${days}d ${countdown.hours % 24}h`;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`;
}

/**
 * What a listing leads with. An auction that has bids quotes the bid, not the
 * reserve — quoting the reserve once bidding has started reads as a lower price
 * than the buyer can actually get it for.
 */
export function priceLine(listing: Listing) {
  if (listing.pricingType === "AUCTION") {
    const hasBids = (listing.bidCount ?? 0) > 0 && listing.highestBid != null;
    return {
      label: hasBids ? "Current bid" : "Opening bid",
      amount: hasBids ? listing.highestBid! : listing.price,
      note: hasBids
        ? `${listing.bidCount} ${listing.bidCount === 1 ? "bid" : "bids"}`
        : "No bids yet",
      cta: "Place bid",
      soldOut: false,
    };
  }
  const soldOut = listing.slotsAvailable <= 0;
  return {
    label: "Price",
    amount: listing.price,
    note: soldOut
      ? "Sold out"
      : `${listing.slotsAvailable} slot${listing.slotsAvailable === 1 ? "" : "s"} left`,
    cta: soldOut ? "Sold out" : "Book",
    soldOut,
  };
}

/** Category or platform glyph, plus the seller's own placement label. */
export function TypeRow({ listing, className }: { listing: Listing; className?: string }) {
  const meta = categoryMeta(listing.category);
  const CategoryIcon = meta.icon;
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5 text-caption", className)}>
      {listing.platform ? (
        <PlatformIcon platform={listing.platform} className="h-3 w-3 shrink-0" />
      ) : (
        <CategoryIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em]">
        {listing.placement ?? meta.label}
      </span>
    </span>
  );
}

export function KindBadge({ listing }: { listing: Listing }) {
  if (listing.pricingType === "AUCTION") {
    return (
      <span className="badge badge-accent shrink-0">
        <Gavel className="mr-1 h-2.5 w-2.5" aria-hidden="true" />
        Auction
      </span>
    );
  }
  return <span className="badge badge-neutral shrink-0">Buy now</span>;
}

/** A seller with no linked socials reports zero followers — that line is dropped. */
function hasReach(listing: Listing) {
  const reach = listing.creator.reach?.trim();
  return Boolean(reach) && reach !== "0";
}

export function Seller({
  listing,
  size = 24,
  showReach = true,
}: {
  listing: Listing;
  size?: number;
  showReach?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <BrandAvatar
        src={listing.creator.avatarUrl || walletFallbackAvatar(listing.creator.wallet)}
        alt={listing.creator.displayName}
        fallbackSeed={listing.creator.wallet}
        size={size}
      />
      <span className="min-w-0">
        <span className="flex items-center gap-1 truncate text-[12px] font-medium text-white">
          {listing.creator.displayName}
          {listing.creator.verified && (
            <BadgeCheck className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
          )}
        </span>
        {showReach && hasReach(listing) && (
          <span className="block truncate text-[10px] text-caption">
            {listing.creator.reach} reach
          </span>
        )}
      </span>
    </span>
  );
}

export function EndLabel({ listing, className }: { listing: Listing; className?: string }) {
  if (!listing.endDate) {
    return listing.turnaroundDays ? (
      <span className={cn("text-[11px] text-caption", className)}>
        ~{listing.turnaroundDays}d turnaround
      </span>
    ) : (
      <span className={cn("text-[11px] text-caption", className)}>No deadline</span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px]",
        endsSoon(listing.endDate) ? "text-warning" : "text-caption",
        className,
      )}
    >
      <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
      {relativeEndLabel(listing.endDate)}
    </span>
  );
}

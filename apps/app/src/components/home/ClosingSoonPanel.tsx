"use client";

import Link from "next/link";
import { Flame, Sparkles } from "lucide-react";
import { PosterThumb } from "@/components/listing/ListingPoster";
import { categoryMeta } from "@/lib/listingCategories";
import type { Listing } from "@/lib/marketplace";
import { useCountdown } from "@/lib/useCountdown";
import { cn } from "@/lib/utils";
import { countdownLabel, endsSoon, money, priceLine, UsdNote } from "./listingParts";
import { RatingBadge } from "@/components/reviews/RatingBadge";
import { UserLink } from "@/components/UserLink";

/** Five rows: enough to fill the rail beside the market preview without a scroll. */
const MAX_ROWS = 5;

function Row({
  listing,
  live,
  onCheckout,
}: {
  listing: Listing;
  live: boolean;
  onCheckout: (listing: Listing) => void;
}) {
  const countdown = useCountdown(live ? listing.endDate : null);
  const price = priceLine(listing);
  const urgent = endsSoon(listing.endDate);
  const CategoryIcon = categoryMeta(listing.category).icon;

  // The row opens checkout through a button laid over it, so the seller's name
  // can sit on top as a link to their profile — see `ListingCard`.
  return (
    <div className="group relative flex w-full items-center text-left gap-3 rounded-xl border border-transparent px-2.5 py-3 transition-colors hover:border-line-strong hover:bg-white/[0.03] has-[>button:focus-visible]:border-primary/60">
      <button
        type="button"
        onClick={() => onCheckout(listing)}
        aria-haspopup="dialog"
        aria-label={`${price.cta}: ${listing.title}, ${money(listing, price.amount)}`}
        className="absolute inset-0 z-[1] cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
      />
      {/* The poster when there is one; the same generated artwork as its card otherwise. */}
      <PosterThumb
        src={listing.posterUrl}
        alt={`Poster for ${listing.title}`}
        size={38}
        placeholder={<CategoryIcon className="h-4 w-4 opacity-60" />}
        fallbackSeed={listing.id}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{listing.title}</p>
        {/* Seller only — the price caption above already says auction or not, and
            a placement label here would only fight the title for the width. */}
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-caption">
          <UserLink handle={listing.creator.handle} raised className="truncate">
            {listing.creator.displayName}
          </UserLink>
          <RatingBadge rating={listing.creator.rating} size="xs" />
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-caption">
          {price.label}
        </p>
        <p className="numeric whitespace-nowrap text-[14px] font-bold leading-tight text-white">
          {money(listing, price.amount)}
        </p>
        <UsdNote listing={listing} amount={price.amount} className="block" />
        {live ? (
          <p
            className={cn(
              "numeric mt-0.5 text-[11px]",
              urgent ? "text-warning" : "text-caption",
            )}
          >
            {countdownLabel(countdown)}
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] text-caption">{price.note}</p>
        )}
      </div>
    </div>
  );
}

/**
 * The urgency half of the rail beside the market. It shows whatever is actually
 * about to close; with nothing on a clock it falls back to what landed most
 * recently, so a new seller's listing is surfaced on its first day either way.
 * The supply-side ask lives in the market itself, as the tile that fills a
 * short row.
 */
export function ClosingSoonPanel({
  listings,
  onCheckout,
}: {
  listings: Listing[];
  onCheckout: (listing: Listing) => void;
}) {
  const closing = listings
    .filter((listing) => listing.endDate && new Date(listing.endDate).getTime() > Date.now())
    .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime());

  const live = closing.length > 0;
  const rows = (
    live
      ? closing
      : [...listings].sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
        )
  ).slice(0, MAX_ROWS);

  return (
    <section className="card min-w-0 p-4 sm:p-5">
      <header className="flex items-center gap-2">
        {live ? (
          <Flame className="h-[15px] w-[15px] shrink-0 text-warning" aria-hidden="true" />
        ) : (
          <Sparkles className="h-[15px] w-[15px] shrink-0 text-primary-light" aria-hidden="true" />
        )}
        <h2 className="panel-label text-primary-light">{live ? "Closing soon" : "Just listed"}</h2>
        {rows.length > 0 && (
          <Link
            href="/marketplace"
            className="ml-auto shrink-0 text-[11px] font-medium text-caption transition-colors hover:text-white"
          >
            View all <span aria-hidden="true">→</span>
          </Link>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="mt-3 flex items-center justify-center rounded-xl border border-dashed border-line px-4 py-6 text-center">
          <p className="max-w-[16rem] text-[12px] leading-relaxed text-caption">
            Seller listings show up here as soon as the first one goes live.
          </p>
        </div>
      ) : (
        <div className="-mx-1 mt-2 flex flex-col divide-y divide-line/70">
          {rows.map((listing) => (
            <Row key={listing.id} listing={listing} live={live} onCheckout={onCheckout} />
          ))}
        </div>
      )}

    </section>
  );
}

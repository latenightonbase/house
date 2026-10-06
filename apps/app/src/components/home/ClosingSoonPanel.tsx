"use client";

import { Flame, Sparkles } from "lucide-react";
import { CreateListingButton } from "@/components/CreateListingButton";
import { PosterThumb } from "@/components/listing/ListingPoster";
import { BrandAvatar } from "@/components/ui";
import type { Listing } from "@/lib/marketplace";
import { useCountdown } from "@/lib/useCountdown";
import { cn, walletFallbackAvatar } from "@/lib/utils";
import { countdownLabel, endsSoon, money, priceLine, UsdNote } from "./listingParts";

/** Five keeps the rail short enough to stay in view beside the market. */
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

  return (
    <button
      type="button"
      onClick={() => onCheckout(listing)}
      aria-haspopup="dialog"
      className="group flex w-full items-center text-left gap-3 rounded-xl border border-transparent px-2.5 py-3 transition-colors hover:border-line-strong hover:bg-white/[0.03] focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
    >
      {/* The poster when there is one; the seller's face otherwise. */}
      {listing.posterUrl ? (
        <PosterThumb
          src={listing.posterUrl}
          alt={`Poster for ${listing.title}`}
          size={38}
          placeholder={null}
        />
      ) : (
        <BrandAvatar
          src={listing.creator.avatarUrl || walletFallbackAvatar(listing.creator.wallet)}
          alt={listing.creator.displayName}
          fallbackSeed={listing.creator.wallet}
          shape="square"
          size={38}
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{listing.title}</p>
        {/* Seller only — the price caption above already says auction or not, and
            a placement label here would only fight the title for the width. */}
        <p className="mt-0.5 truncate text-[11px] text-caption">{listing.creator.displayName}</p>
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
    </button>
  );
}

/**
 * The urgency rail beside the market. It shows whatever is actually about
 * to close; with nothing on a clock it falls back to what landed most recently,
 * so a new seller's listing is surfaced on its first day either way.
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
    <section className="card flex min-w-0 flex-col p-4 sm:p-5">
      <header className="flex items-center gap-2">
        {live ? (
          <Flame className="h-[15px] w-[15px] shrink-0 text-warning" aria-hidden="true" />
        ) : (
          <Sparkles className="h-[15px] w-[15px] shrink-0 text-primary-light" aria-hidden="true" />
        )}
        <h2 className="panel-label text-primary-light">{live ? "Closing soon" : "Just listed"}</h2>
        {rows.length > 0 && (
          <a
            href="#marketplace"
            className="ml-auto shrink-0 text-[11px] font-medium text-caption transition-colors hover:text-white"
          >
            View all <span aria-hidden="true">→</span>
          </a>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-xl border border-dashed border-line px-4 py-8 text-center">
          <p className="max-w-[16rem] text-[12px] leading-relaxed text-caption">
            Seller listings show up here as soon as the first one goes live.
          </p>
        </div>
      ) : (
        <div className="-mx-1 mt-2 flex flex-1 flex-col divide-y divide-line/70">
          {rows.map((listing) => (
            <Row key={listing.id} listing={listing} live={live} onCheckout={onCheckout} />
          ))}
        </div>
      )}

      {/* The supply-side ask, on the same screen as the demand-side one. */}
      <div className="mt-auto border-t border-line pt-3.5">
        <CreateListingButton
          variant="accent-outline"
          size="sm"
          className="w-full"
          label="List your attention"
        />
        <p className="mt-2 text-center text-[11px] leading-relaxed text-caption">
          Sell a placement of your own — approved listings appear here.
        </p>
      </div>
    </section>
  );
}

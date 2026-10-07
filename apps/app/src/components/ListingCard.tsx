"use client";

import { ListingPoster } from "@/components/listing/ListingPoster";
import {
  ActionPill,
  EndLabel,
  KindBadge,
  money,
  priceLine,
  Seller,
  TypeRow,
  UsdNote,
} from "@/components/home/listingParts";
import { categoryMeta } from "@/lib/listingCategories";
import type { Listing } from "@/lib/marketplace";
import { cn } from "@/lib/utils";

/**
 * A listing without artwork still gets the full-size box, so a grid of mixed
 * listings keeps its rhythm — filled with its category glyph over the violet
 * wash the panels use, rather than an empty grey hole.
 */
function PosterPlaceholder({ listing }: { listing: Listing }) {
  const CategoryIcon = categoryMeta(listing.category).icon;
  return (
    <span
      className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.22),transparent_65%)] bg-surface-2"
      aria-hidden="true"
    >
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
        <CategoryIcon className="h-6 w-6 text-primary-light" />
      </span>
    </span>
  );
}

/**
 * One piece of seller inventory as a buyer meets it in the market. The poster
 * leads at full card width in a square box — sellers use it to pitch what they
 * are selling, so it is given the room to be read. A square poster fills the
 * box edge to edge; any other shape is shown whole, with the gaps filled by a
 * blurred copy of itself. The write-up gets enough lines beneath it to say
 * something. Price and the call to action sit on the card's floor so
 * they line up across a row of cards.
 *
 * With `onCheckout` the whole card is the button that opens checkout (the pill
 * is only its label, so nothing interactive nests); without it — the seller's
 * own preview — it is inert.
 */
export function ListingCard({
  listing,
  onCheckout,
  priority = false,
  className,
}: {
  listing: Listing;
  onCheckout?: (listing: Listing) => void;
  priority?: boolean;
  className?: string;
}) {
  const price = priceLine(listing);
  const interactive = Boolean(onCheckout);

  const body = (
    <>
      <span className="relative block overflow-hidden border-b border-line">
        {listing.posterUrl ? (
          <ListingPoster
            src={listing.posterUrl}
            alt={`Poster for ${listing.title}`}
            sizes="(min-width: 1280px) 320px, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.02]"
            fallback={
              <span className="block aspect-square w-full">
                <PosterPlaceholder listing={listing} />
              </span>
            }
          />
        ) : (
          <span className="block aspect-square w-full">
            <PosterPlaceholder listing={listing} />
          </span>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-md bg-black/55 backdrop-blur-sm">
          <KindBadge listing={listing} />
        </span>
      </span>

      <span className="flex flex-1 flex-col gap-2.5 p-3.5">
        <span className="block min-w-0">
          <TypeRow listing={listing} />
          <span className="mt-1.5 line-clamp-2 block text-[15px] font-semibold leading-snug text-foreground">
            {listing.title}
          </span>
          {listing.description && (
            <span className="mt-1.5 line-clamp-3 block whitespace-pre-line text-[12.5px] leading-relaxed text-caption">
              {listing.description}
            </span>
          )}
        </span>

        <span className="flex min-w-0 items-center justify-between gap-3">
          <Seller listing={listing} size={22} showReach={false} />
          <EndLabel listing={listing} className="shrink-0" />
        </span>

        <span className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
          <span className="min-w-0">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-caption">
              {price.label}
            </span>
            <span className="numeric block whitespace-nowrap text-[17px] font-bold leading-tight text-white">
              {money(listing, price.amount)}
            </span>
            <span className="flex flex-wrap items-baseline gap-x-2 text-[10px] text-caption">
              <UsdNote listing={listing} amount={price.amount} />
              <span>{price.note}</span>
            </span>
          </span>
          <ActionPill listing={listing} className="h-8 px-3" />
        </span>
      </span>
    </>
  );

  const shell = cn(
    "group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left transition-colors",
    className,
  );

  if (!interactive) return <div className={shell}>{body}</div>;

  return (
    <button
      type="button"
      onClick={() => onCheckout?.(listing)}
      aria-label={`${price.cta}: ${listing.title}, ${money(listing, price.amount)}`}
      aria-haspopup="dialog"
      className={cn(
        shell,
        "hover:border-line-strong hover:bg-white/[0.02]",
        "focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
      )}
    >
      {body}
    </button>
  );
}

"use client";

import { ListingFallbackArt, ListingPoster } from "@/components/listing/ListingPoster";
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
import { clipText, cn } from "@/lib/utils";

/** Card descriptions are a teaser; the full write-up is in checkout. */
const DESCRIPTION_MAX = 50;

/**
 * A listing without artwork still gets the full-size box, so a grid of mixed
 * listings keeps its rhythm: a low-contrast identicon generated from the
 * listing. If that fails to load, a faint category glyph stands in.
 */
function PosterPlaceholder({ listing }: { listing: Listing }) {
  const CategoryIcon = categoryMeta(listing.category).icon;
  return (
    <ListingFallbackArt
      seed={listing.id}
      sizes="(min-width: 1280px) 320px, (min-width: 640px) 50vw, 100vw"
      fallback={<CategoryIcon className="h-7 w-7 text-white/20" strokeWidth={1.5} />}
    />
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
 * With `onCheckout` the whole card opens checkout: a transparent button laid
 * over it, rather than a button wrapping it, so the seller's name can sit on
 * top as its own link to their profile (a link can't nest inside a button).
 * The pill is only a label. Without `onCheckout` — the seller's own preview —
 * the card is inert.
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
          {listing.description?.trim() && (
            <span className="mt-1.5 block text-[12.5px] leading-relaxed text-caption">
              {clipText(listing.description, DESCRIPTION_MAX)}
            </span>
          )}
        </span>

        <span className="flex min-w-0 items-center justify-between gap-3">
          <Seller listing={listing} size={22} />
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
          <ActionPill listing={listing} className="h-9 px-3.5" />
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
    <div
      className={cn(
        shell,
        "relative hover:border-line-strong hover:bg-white/[0.02]",
        "has-[>button:focus-visible]:border-primary/60",
      )}
    >
      <button
        type="button"
        onClick={() => onCheckout?.(listing)}
        aria-label={`${price.cta}: ${listing.title}, ${money(listing, price.amount)}`}
        aria-haspopup="dialog"
        className="absolute inset-0 z-[1] cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45"
      />
      {body}
    </div>
  );
}

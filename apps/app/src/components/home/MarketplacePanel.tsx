"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Store } from "lucide-react";
import { CreateListingButton } from "@/components/CreateListingButton";
import { Select, Tabs, type TabItem } from "@/components/ui";
import { categoryLabel } from "@/lib/listingCategories";
import type { Listing, PricingType } from "@/lib/marketplace";
import { cn } from "@/lib/utils";
import { ListingCard } from "@/components/ListingCard";

type Kind = "all" | PricingType;
type Sort = "newest" | "ending" | "price-asc" | "price-desc";

const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "ending", label: "Ending soonest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

/**
 * Grid columns by container width: 1, then 2 at `@lg`, 3 at `@4xl`, 4 at `@6xl`.
 * Every responsive class below is keyed to these four, so they are spelled out
 * literally for Tailwind to find.
 */
const COLUMN_COUNTS = [1, 2, 3, 4] as const;

/**
 * In preview the grid shows a single row at every width: the first two cards
 * always (one column stacks two), the third from three columns, the fourth
 * from four. Anything past that is behind "View all".
 */
const PREVIEW_CARD_CLASS = ["contents", "contents", "hidden @4xl:contents", "hidden @6xl:contents"];
const PREVIEW_LIMIT = PREVIEW_CARD_CLASS.length;

/** The invitation tile's footprint per column count, by how many cells it fills. */
const FILLER_SPAN: Record<number, Record<number, string>> = {
  2: { 0: "@lg:hidden", 1: "@lg:flex @lg:col-span-1" },
  3: { 0: "@4xl:hidden", 1: "@4xl:flex @4xl:col-span-1", 2: "@4xl:flex @4xl:col-span-2" },
  4: {
    0: "@6xl:hidden",
    1: "@6xl:flex @6xl:col-span-1",
    2: "@6xl:flex @6xl:col-span-2",
    3: "@6xl:flex @6xl:col-span-3",
  },
};

/** How many cards land on screen at a given column count. */
function cardsAt(columns: number, count: number, preview: boolean) {
  if (!preview) return count;
  return Math.min(count, Math.max(columns, 2));
}

/**
 * Classes that size the invitation tile to exactly the empty cells of the last
 * row at each column count, and hide it where the row is already full. On a
 * single column there is no gap to fill, so it never shows there.
 */
function fillerClass(count: number, preview: boolean) {
  return [
    "hidden",
    ...COLUMN_COUNTS.slice(1).map((columns) => {
      const remainder = cardsAt(columns, count, preview) % columns;
      return FILLER_SPAN[columns][remainder === 0 ? 0 : columns - remainder];
    }),
  ].join(" ");
}

/** The number a row leads with, so sorting by price sorts by what is shown. */
function shownPrice(listing: Listing) {
  if (listing.pricingType === "AUCTION" && (listing.bidCount ?? 0) > 0) {
    return listing.highestBid ?? listing.price;
  }
  return listing.price;
}

function endTime(listing: Listing) {
  return listing.endDate ? new Date(listing.endDate).getTime() : Number.POSITIVE_INFINITY;
}

function createdTime(listing: Listing) {
  return listing.createdAt ? new Date(listing.createdAt).getTime() : 0;
}

function sortListings(listings: Listing[], sort: Sort) {
  const next = [...listings];
  switch (sort) {
    case "ending":
      return next.sort((a, b) => endTime(a) - endTime(b));
    case "price-asc":
      return next.sort((a, b) => shownPrice(a) - shownPrice(b));
    case "price-desc":
      return next.sort((a, b) => shownPrice(b) - shownPrice(a));
    default:
      return next.sort((a, b) => createdTime(b) - createdTime(a));
  }
}

function TabLabel({ label, count }: { label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <span className="numeric text-[11px] font-semibold opacity-60">{count}</span>
    </span>
  );
}

function CategoryChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
        active
          ? "border-primary/60 bg-primary/20 text-white"
          : "border-line bg-surface-2 text-caption hover:border-line-strong hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

/** Nothing has been listed yet — the seller-side invitation, not an error. */
function MarketEmpty() {
  return (
    <div className="tile border-dashed px-5 py-9 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
        <Store className="h-[18px] w-[18px] text-primary-light" aria-hidden="true" />
      </span>
      <p className="mt-3.5 text-[14px] font-semibold text-white">The market is open</p>
      <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-caption">
        No seller inventory is live yet. List a placement of your own, priced in USDG, LNOC or any token,
        and it shows up here the moment you sign for it.
      </p>
      <div className="mt-4 flex justify-center">
        <CreateListingButton variant="accent-outline" size="sm" label="List your item" />
      </div>
    </div>
  );
}

/**
 * The seller-side ask, sized to the gap a short last row leaves — so a thin
 * market reads as a market with room in it rather than a grid with holes.
 */
function ListYoursTile({ className }: { className: string }) {
  return (
    <div
      className={cn(
        "tile min-h-[14rem] flex-col items-center justify-center border-dashed px-5 py-8 text-center",
        className,
      )}
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
        <Plus className="h-[18px] w-[18px] text-primary-light" aria-hidden="true" />
      </span>
      <p className="mt-3.5 text-[14px] font-semibold text-white">Your placement here</p>
      <p className="mx-auto mt-1.5 max-w-[16rem] text-[12px] leading-relaxed text-caption">
        Have an audience? List a placement, priced in USDG, LNOC or any token and paid out to your
        wallet.
      </p>
      <CreateListingButton
        variant="accent-outline"
        size="sm"
        className="mt-4"
        label="List your item"
      />
    </div>
  );
}

/**
 * The market as a grid of poster-led cards. Sellers pitch with their artwork
 * and write-up, so both get real room rather than a thumbnail and one
 * truncated line. The grid sizes itself to the panel (container queries), so
 * the same panel works in the home page's two-thirds column and full width on
 * the marketplace page.
 */
export function MarketplacePanel({
  listings,
  onCheckout,
  previewHref,
}: {
  listings: Listing[];
  onCheckout: (listing: Listing) => void;
  /**
   * Shows a single row of cards and links here for the rest — the home page's
   * preview. Without it the panel lists the whole book.
   */
  previewHref?: string;
}) {
  const [kind, setKind] = useState<Kind>("all");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const preview = Boolean(previewHref);

  const auctionCount = listings.filter((l) => l.pricingType === "AUCTION").length;
  const fixedCount = listings.length - auctionCount;

  /** Only worth offering when both kinds are on sale — one kind needs no filter. */
  const kinds: TabItem<Kind>[] =
    auctionCount > 0 && fixedCount > 0
      ? [
          { value: "all", label: <TabLabel label="All" count={listings.length} /> },
          { value: "AUCTION", label: <TabLabel label="Auctions" count={auctionCount} /> },
          { value: "FIXED", label: <TabLabel label="Buy now" count={fixedCount} /> },
        ]
      : [];

  /**
   * Only categories with inventory — an empty filter is a dead end. "Other" is
   * no longer offered to sellers, so the few older rows in it are not given a
   * chip of their own; they still show under "All categories".
   */
  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const listing of listings) {
      if (listing.category === "OTHER") continue;
      seen.set(listing.category, (seen.get(listing.category) ?? 0) + 1);
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
  }, [listings]);

  const visible = useMemo(() => {
    const filtered = listings.filter(
      (listing) =>
        (kind === "all" || listing.pricingType === kind) &&
        (category === "all" || listing.category === category),
    );
    return sortListings(filtered, sort);
  }, [listings, kind, category, sort]);

  const shown = preview ? visible.slice(0, PREVIEW_LIMIT) : visible;

  return (
    <section id="marketplace" className="card flex min-w-0 flex-col p-4 scroll-mt-24 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-light">
            <Store className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Marketplace
            <span className="text-line-strong" aria-hidden="true">•</span>
            <span className="numeric text-caption">
              {listings.length} live {listings.length === 1 ? "listing" : "listings"}
            </span>
          </p>
          <h2 className="mt-2 display text-[clamp(1.25rem,3.4vw,1.75rem)] uppercase text-white">
            Buy attention <span className="text-primary-bright">direct</span>
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-caption max-sm:hidden">
            Placements sold by creators, priced in USDG, LNOC or any token and settled on-chain.
          </p>
        </div>

        {/* Shrinkable and wrapping: on a phone the controls take their own lines
            rather than pushing the panel past the viewport. */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2.5 sm:ml-auto sm:justify-end">
          {kinds.length > 0 ? (
            <Tabs items={kinds} value={kind} onChange={setKind} />
          ) : null}
          {/* The sort control takes its own wrapped line on a phone, where the
              tabs already fill one; its caption goes with it, because the
              selected option ("Newest first") says what the control is. */}
          {listings.length > 1 ? (
            <label className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
              <span className="panel-label hidden shrink-0 sm:block">Sort</span>
              <Select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="h-9 w-full min-w-0 text-[12px] sm:w-auto sm:min-w-[9.5rem]"
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          {previewHref && listings.length > 2 ? (
            <Link
              href={previewHref}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 text-[12px] font-semibold text-primary-light transition-colors hover:text-white"
            >
              View all {listings.length}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </header>

      {listings.length === 0 ? (
        <div className="mt-4">
          <MarketEmpty />
        </div>
      ) : (
        <>
          {categories.length > 1 && (
            <div className="scrollbar-none -mx-1 mt-3 flex min-w-0 gap-2 overflow-x-auto border-t border-line px-1 pt-3">
              <CategoryChip active={category === "all"} onClick={() => setCategory("all")}>
                All categories
              </CategoryChip>
              {categories.map((value) => (
                <CategoryChip
                  key={value}
                  active={category === value}
                  onClick={() => setCategory(value)}
                >
                  {categoryLabel(value)}
                </CategoryChip>
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <div className="tile mt-4 border-dashed px-5 py-9 text-center">
              <p className="text-[13px] font-semibold text-white">Nothing matches that filter</p>
              <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-relaxed text-caption">
                There is live inventory, just not in this slice of the market.
              </p>
              <button
                type="button"
                onClick={() => {
                  setKind("all");
                  setCategory("all");
                }}
                className="btn-outline-accent mt-4 h-9 px-4 text-[12px]"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="@container mt-4 min-w-0">
              <div className="grid min-w-0 grid-cols-1 gap-3 @lg:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4 sm:gap-4">
                {shown.map((listing, index) => (
                  <div key={listing.id} className={preview ? PREVIEW_CARD_CLASS[index] : "contents"}>
                    <ListingCard listing={listing} onCheckout={onCheckout} priority={index < 3} />
                  </div>
                ))}
                <ListYoursTile className={fillerClass(shown.length, preview)} />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

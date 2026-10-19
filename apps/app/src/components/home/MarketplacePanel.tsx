"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Gavel, Package, Plus, Sparkles, Store, Tag, X } from "lucide-react";
import { CreateListingButton } from "@/components/CreateListingButton";
import { Select } from "@/components/ui";
import { categoryLabel } from "@/lib/listingCategories";
import {
  EMPTY_SEARCH,
  isEmptySearch,
  matchesSearch,
  searchToParams,
  type MarketSearch,
} from "@/lib/listingSearch";
import type { Listing } from "@/lib/marketplace";
import { cn } from "@/lib/utils";
import { ListingCard } from "@/components/ListingCard";

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

/** In preview the grid shows four cards at every width; the rest is behind "View all". */
const PREVIEW_LIMIT = 4;

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
function cardsAt(count: number, preview: boolean) {
  return preview ? Math.min(count, PREVIEW_LIMIT) : count;
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
      const remainder = cardsAt(count, preview) % columns;
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

function CategoryChip({
  active,
  children,
  onClick,
  count,
  icon,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  count?: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
        active
          ? "border-primary/60 bg-primary/20 text-white"
          : "border-line bg-surface-2 text-caption hover:border-line-strong hover:text-white",
      )}
    >
      {icon}
      {children}
      {count != null && <span className="numeric opacity-60">{count}</span>}
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
  search: controlledSearch,
  onSearchChange,
}: {
  listings: Listing[];
  onCheckout: (listing: Listing) => void;
  /**
   * Shows a single row of cards and links here for the rest — the home page's
   * preview. Without it the panel lists the whole book.
   */
  previewHref?: string;
  /**
   * The search, when the page owns it — the marketplace keeps it in the
   * address bar so a search is a link someone can share, and so the site-wide
   * search's "See all" lands here already filtered. Without it (the home
   * preview) the panel keeps its own.
   */
  search?: MarketSearch;
  onSearchChange?: (search: MarketSearch) => void;
}) {
  const [localSearch, setLocalSearch] = useState<MarketSearch>(EMPTY_SEARCH);
  const search = controlledSearch ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const preview = Boolean(previewHref);

  const patch = (next: Partial<MarketSearch>) => setSearch({ ...search, ...next });

  /**
   * Counts on each type chip, taken with the other filters applied — so the
   * number on "Auction" is how many results pressing it would leave.
   */
  const typeCounts = useMemo(() => {
    const count = (next: Partial<MarketSearch>) =>
      listings.filter(
        (l) =>
          matchesSearch(l, { ...search, ...next }) &&
          (category === "all" || l.category === category),
      ).length;
    return {
      SERVICE: count({ kind: "SERVICE" }),
      GOOD: count({ kind: "GOOD" }),
      FIXED: count({ pricing: "FIXED" }),
      AUCTION: count({ pricing: "AUCTION" }),
    };
  }, [listings, search, category]);

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
        matchesSearch(listing, search) &&
        (category === "all" || listing.category === category),
    );
    return sortListings(filtered, sort);
  }, [listings, search, category, sort]);

  const shown = preview ? visible.slice(0, PREVIEW_LIMIT) : visible;
  const filtering = !isEmptySearch(search) || category !== "all";
  const viewAllHref = previewHref ? `${previewHref}${searchToParams(search)}` : undefined;

  return (
    <section id="marketplace" className="card flex min-w-0 flex-col p-4 scroll-mt-24 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-light">
            <Store className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Marketplace
            <span className="text-line-strong" aria-hidden="true">•</span>
            <span className="numeric text-caption">
              {filtering ? `${visible.length} of ` : ""}
              {listings.length} live {listings.length === 1 ? "listing" : "listings"}
            </span>
          </p>
          <h2 className="mt-2 display text-[clamp(1.25rem,3.4vw,1.75rem)] uppercase text-white">
            Latest <span className="text-primary-bright">Listings</span>
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-caption max-sm:hidden">
            Placements sold by creators, priced in USDG, LNOC or any token and settled on-chain.
          </p>
        </div>

        {/* Shrinkable and wrapping: on a phone the controls take their own lines
            rather than pushing the panel past the viewport. */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2.5 sm:ml-auto sm:justify-end">
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
          {viewAllHref && visible.length > PREVIEW_LIMIT ? (
            <Link
              href={viewAllHref}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 text-[12px] font-semibold text-primary-light transition-colors hover:text-white"
            >
              View all {visible.length}
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
          <div role="search" className="mt-3 space-y-2.5 border-t border-line pt-3">
            {/* Text search lives in the site-wide bar; its "See all" lands here
                with the words in the address bar, shown as a removable chip. */}
            {search.q.trim() && (
              <p className="flex min-w-0 items-center gap-2 text-[12px] text-caption">
                <span className="min-w-0 truncate">
                  Results for <span className="font-semibold text-white">“{search.q.trim()}”</span>
                </span>
                <button
                  type="button"
                  onClick={() => patch({ q: "" })}
                  aria-label="Clear search"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] transition-colors hover:border-line-strong hover:text-white"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Clear
                </button>
              </p>
            )}

            <div
              role="group"
              aria-label="Filter by type"
              className="flex min-w-0 flex-wrap items-center gap-2"
            >
              <CategoryChip
                active={!search.kind && !search.pricing}
                onClick={() => patch({ kind: null, pricing: null })}
              >
                All types
              </CategoryChip>
              <CategoryChip
                active={search.kind === "SERVICE"}
                onClick={() => patch({ kind: search.kind === "SERVICE" ? null : "SERVICE" })}
                icon={<Sparkles className="h-3 w-3" aria-hidden="true" />}
                count={typeCounts.SERVICE}
              >
                Services
              </CategoryChip>
              <CategoryChip
                active={search.kind === "GOOD"}
                onClick={() => patch({ kind: search.kind === "GOOD" ? null : "GOOD" })}
                icon={<Package className="h-3 w-3" aria-hidden="true" />}
                count={typeCounts.GOOD}
              >
                Goods
              </CategoryChip>
              <span className="h-4 w-px shrink-0 bg-line max-sm:hidden" aria-hidden="true" />
              <CategoryChip
                active={search.pricing === "FIXED"}
                onClick={() => patch({ pricing: search.pricing === "FIXED" ? null : "FIXED" })}
                icon={<Tag className="h-3 w-3" aria-hidden="true" />}
                count={typeCounts.FIXED}
              >
                Flat fee
              </CategoryChip>
              <CategoryChip
                active={search.pricing === "AUCTION"}
                onClick={() => patch({ pricing: search.pricing === "AUCTION" ? null : "AUCTION" })}
                icon={<Gavel className="h-3 w-3" aria-hidden="true" />}
                count={typeCounts.AUCTION}
              >
                Auction
              </CategoryChip>
            </div>
          </div>

          {categories.length > 1 && (
            <div className="scrollbar-none -mx-1 mt-2.5 flex min-w-0 gap-2 overflow-x-auto px-1">
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
              <p className="text-[13px] font-semibold text-white">
                {search.q.trim() ? `Nothing matches “${search.q.trim()}”` : "Nothing matches that filter"}
              </p>
              <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-relaxed text-caption">
                There is live inventory, just not in this slice of the market.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch(EMPTY_SEARCH);
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
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onCheckout={onCheckout}
                    priority={index < 3}
                  />
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

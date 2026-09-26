"use client";

import { useMemo, useState } from "react";
import { ArrowDown, Store } from "lucide-react";
import { CreateListingButton } from "@/components/CreateListingButton";
import { Select, Tabs, type TabItem } from "@/components/ui";
import { categoryLabel } from "@/lib/listingCategories";
import type { Listing, PricingType } from "@/lib/marketplace";
import { cn } from "@/lib/utils";
import { ListingRow, ListingRowHeader } from "./ListingRow";

type Kind = "all" | PricingType;
type Sort = "newest" | "ending" | "price-asc" | "price-desc";

const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "ending", label: "Ending soonest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

/** Rows shown before "show all" — a screenful, not the whole book. */
const INITIAL_ROWS = 6;

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
        No seller inventory is live yet. List a placement of your own and it shows up here the
        moment it is approved and published.
      </p>
      <div className="mt-4 flex justify-center">
        <CreateListingButton variant="accent-outline" size="sm" label="List your attention" />
      </div>
    </div>
  );
}

/**
 * The market, sitting level with the daily auction rather than under it. Rows
 * are dense on purpose: a buyer should see what is for sale without scrolling,
 * and a seller's listing should be visible the day it goes live.
 */
export function MarketplacePanel({ listings }: { listings: Listing[] }) {
  const [kind, setKind] = useState<Kind>("all");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [expanded, setExpanded] = useState(false);

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

  /** Only categories with inventory — an empty filter is a dead end. */
  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const listing of listings) {
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

  const shown = expanded ? visible : visible.slice(0, INITIAL_ROWS);
  const hidden = visible.length - shown.length;

  return (
    <section id="marketplace" className="card flex min-w-0 flex-col p-4 scroll-mt-24 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex min-w-0 items-center gap-2">
          <Store className="h-[15px] w-[15px] shrink-0 text-primary-light" aria-hidden="true" />
          <h2 className="panel-label text-primary-light">Marketplace</h2>
          <span className="numeric text-[11px] text-caption">
            {listings.length} live {listings.length === 1 ? "listing" : "listings"}
          </span>
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
          {/* An empty market carries its own invitation below, so the header
              does not repeat it. */}
          {kinds.length === 0 && listings.length === 1 ? (
            <CreateListingButton variant="accent-outline" size="sm" label="List your attention" />
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
            <div className="mt-4 flex min-w-0 flex-1 flex-col">
              <ListingRowHeader />
              <div className="-mx-1 mt-1 min-w-0 divide-y divide-line/70">
                {shown.map((listing) => (
                  <ListingRow key={listing.id} listing={listing} />
                ))}
              </div>

              {hidden > 0 && (
                <div className="mt-3 flex justify-center border-t border-line pt-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-caption transition-colors hover:text-white"
                  >
                    Show {hidden} more {hidden === 1 ? "listing" : "listings"}
                    <ArrowDown className="h-[14px] w-[14px]" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

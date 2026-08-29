"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { CreateListingButton } from "@/components/CreateListingButton";
import { Panel, PanelHeader, Tabs, type TabItem } from "@/components/ui";
import { LISTING_CATEGORIES, categoryMeta, type ListingCategory } from "@/lib/listingCategories";
import type { Listing } from "@/lib/marketplace";
import { cn } from "@/lib/utils";

type SaleFilter = "all" | "FIXED" | "AUCTION";

const SALE_FILTERS: TabItem<SaleFilter>[] = [
  { value: "all", label: "Everything" },
  { value: "FIXED", label: "Buy now" },
  { value: "AUCTION", label: "Open for bids" },
];

/** Category order follows the picker, so browsing matches how sellers file things. */
const CATEGORY_ORDER = LISTING_CATEGORIES.map((c) => c.value);

/** How many cards a category shows before "View all" takes over. */
const PER_CATEGORY = 3;

/**
 * The discover page's inventory: everything creators have listed, split by
 * how it sells and then filed under its category.
 */
export function MediaListings({
  listings,
  loading = false,
}: {
  listings: Listing[];
  loading?: boolean;
}) {
  const router = useRouter();
  const [sale, setSale] = useState<SaleFilter>("all");
  const [category, setCategory] = useState<ListingCategory | "all">("all");

  const bySale = useMemo(
    () => (sale === "all" ? listings : listings.filter((l) => l.pricingType === sale)),
    [listings, sale],
  );

  const presentCategories = useMemo(() => {
    const seen = new Set(bySale.map((l) => l.category));
    return CATEGORY_ORDER.filter((c) => seen.has(c));
  }, [bySale]);

  const grouped = useMemo(() => {
    const visible = category === "all" ? presentCategories : [category];
    return visible
      .map((c) => ({ category: c, items: bySale.filter((l) => l.category === c) }))
      .filter((group) => group.items.length > 0);
  }, [bySale, category, presentCategories]);

  return (
    <Panel className="space-y-4">
      <PanelHeader
        label="Media on sale"
        icon={<Store className="w-3.5 h-3.5" />}
        action={<CreateListingButton size="sm" variant="accent-outline" />}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <Tabs items={SALE_FILTERS} value={sale} onChange={setSale} />
        <span className="text-[11px] text-caption">
          {loading ? "Loading…" : `${bySale.length} listing${bySale.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {presentCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <CategoryChip
            label="All categories"
            active={category === "all"}
            onClick={() => setCategory("all")}
          />
          {presentCategories.map((c) => (
            <CategoryChip
              key={c}
              label={categoryMeta(c).label}
              count={bySale.filter((l) => l.category === c).length}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[210px] rounded-lg bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="py-6 text-center space-y-3">
          <p className="text-sm text-caption">
            Nothing listed here yet. Be the first to sell a slot.
          </p>
          <CreateListingButton size="sm" />
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ category: c, items }) => {
            const meta = categoryMeta(c);
            const Icon = meta.icon;
            const shown = category === "all" ? items.slice(0, PER_CATEGORY) : items;
            return (
              <section key={c} className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-3.5 h-3.5 text-caption shrink-0" />
                    <span className="panel-label">{meta.label}</span>
                    <span className="text-[11px] text-caption">{items.length}</span>
                  </div>
                  {category === "all" && items.length > PER_CATEGORY && (
                    <button
                      type="button"
                      onClick={() => setCategory(c)}
                      className="text-xs font-medium text-caption hover:text-white transition-colors"
                    >
                      View all →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {shown.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onOpenCreator={(id) => router.push(`/creators/${id}`)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
        active
          ? "border-primary/70 bg-primary/15 text-white"
          : "border-line bg-surface-2 text-caption hover:text-white hover:border-line-strong",
      )}
    >
      {label}
      {count != null && <span className="ml-1.5 text-caption/80">{count}</span>}
    </button>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ListingCard } from "@/components/ListingCard";
import { Panel, Tabs, type Platform, type TabItem } from "@/components/ui";
import { fetchListings, type Listing } from "@/lib/marketplace";

type Filter = "all" | Platform;

const FILTERS: TabItem<Filter>[] = [
  { value: "all", label: "All" },
  { value: "x", label: "X" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
];

export default function MarketplacePage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let cancelled = false;
    fetchListings({ limit: 60 })
      .then((data) => !cancelled && setListings(data))
      .catch(() => !cancelled && setListings([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(
    () => (filter === "all" ? listings : listings.filter((l) => l.platform === filter)),
    [listings, filter],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Marketplace"
        subtitle="Fixed-price media inventory. Pick a placement, pay the listed price — no bidding."
      />

      <Panel>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="panel-label">
            {loading ? "Loading" : `${rows.length} listing${rows.length === 1 ? "" : "s"}`}
          </span>
          <Tabs items={FILTERS} value={filter} onChange={setFilter} />
        </div>

        {loading ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[210px] rounded-lg bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-caption">
            No inventory listed on this platform yet.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {rows.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onOpenCreator={(id) => router.push(`/creators/${id}`)}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

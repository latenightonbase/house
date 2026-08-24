"use client";

import { formatMoney, type MarketStats } from "@/lib/marketplace";

/**
 * The market's headline. Every figure is denominated in attention — what was
 * spent on media, who is selling, how much inventory exists, how much brand
 * demand is open. Deliberately no token price, TVL or chart: the unit of
 * commerce here is attention, not tokens.
 */
export function MarketStrip({ stats }: { stats: MarketStats | null }) {
  const items = [
    { label: "Media Volume", value: stats ? formatMoney(stats.mediaVolume) : "—" },
    { label: "Creators", value: stats ? stats.creators.toLocaleString() : "—" },
    { label: "Listings", value: stats ? stats.listings.toLocaleString() : "—" },
    {
      label: "Active Campaigns",
      value: stats ? stats.activeCampaigns.toLocaleString() : "—",
    },
  ];

  return (
    <div className="card grid grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={[
            "px-4 py-3 lg:py-4",
            // 2x2 on mobile, single row on desktop — rules drawn to match.
            i % 2 === 1 ? "border-l border-line" : "",
            i >= 2 ? "border-t border-line lg:border-t-0" : "",
            i === 2 ? "lg:border-l lg:border-line" : "",
          ].join(" ")}
        >
          <p className="panel-label mb-1.5">{item.label}</p>
          <p className="text-xl lg:text-2xl font-bold text-white leading-none numeric">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

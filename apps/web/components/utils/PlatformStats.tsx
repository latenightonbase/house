"use client";

import { useEffect, useState } from "react";

interface Analytics {
  totalAuctions: number;
  auctionsWithBids: number;
  totalEarnings: number;
  uniqueBidders: number;
}

const compact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

export default function PlatformStats() {
  const [stats, setStats] = useState<Analytics | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/analytics");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data?.totalAuctions === "number") {
          setStats(data);
        }
      } catch {
        // Stats are decorative — a failure just leaves the placeholders in place.
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const items: { label: string; value: string }[] = [
    { label: "Auctions", value: stats ? compact(stats.totalAuctions) : "—" },
    { label: "With Bids", value: stats ? compact(stats.auctionsWithBids) : "—" },
    {
      label: "Volume",
      value: stats ? `$${compact(Math.round(stats.totalEarnings))}` : "—",
    },
    { label: "Bidders", value: stats ? compact(stats.uniqueBidders) : "—" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {items.map((item) => (
        <div key={item.label} className="tile px-3 py-2.5">
          <p className="panel-label mb-1">{item.label}</p>
          <p className="text-white font-bold text-lg leading-none tabular-nums">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

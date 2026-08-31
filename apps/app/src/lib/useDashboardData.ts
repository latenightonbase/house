"use client";

import { useEffect, useState } from "react";
import {
  fetchDailyListing,
  fetchListings,
  fetchMarketStats,
  type Listing,
  type MarketStats,
} from "@/lib/marketplace";

export interface DashboardData {
  stats: MarketStats | null;
  featured: Listing | null;
  listings: Listing[];
  loading: boolean;
  error: string | null;
}

const EMPTY: DashboardData = {
  stats: null,
  featured: null,
  listings: [],
  loading: true,
  error: null,
};

/** v1 Discover: market strip, daily auction, and buyable listings. */
export function useDashboardData(): DashboardData {
  const [data, setData] = useState<DashboardData>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchMarketStats(), fetchDailyListing(), fetchListings({ limit: 60 })])
      .then(([stats, featured, listings]) => {
        if (cancelled) return;
        setData({
          stats,
          featured,
          listings,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setData({
          ...EMPTY,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load dashboard data",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

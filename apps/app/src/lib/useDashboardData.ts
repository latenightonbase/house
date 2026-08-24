"use client";

import { useEffect, useState } from "react";
import {
  fetchAuctions,
  fetchBookings,
  fetchCreators,
  fetchLatestCampaign,
  fetchMarketStats,
  type Auction,
  type Booking,
  type Campaign,
  type Earner,
  type MarketStats,
} from "@/lib/marketplace";

export interface DashboardData {
  stats: MarketStats | null;
  featured: Auction | null;
  liveAuctions: Auction[];
  endingSoon: Auction | null;
  creators: Earner[];
  trendingCreator: Earner | null;
  mostBooked: Earner | null;
  newCampaign: Campaign | null;
  bookings: Booking[];
  loading: boolean;
  error: string | null;
}

const EMPTY: DashboardData = {
  stats: null,
  featured: null,
  liveAuctions: [],
  endingSoon: null,
  creators: [],
  trendingCreator: null,
  mostBooked: null,
  newCampaign: null,
  bookings: [],
  loading: true,
  error: null,
};

/** Fetches the marketplace panels in one shot and derives each spotlight from the same lists. */
export function useDashboardData(): DashboardData {
  const [data, setData] = useState<DashboardData>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchMarketStats(),
      // Fetch beyond the 3 shown in the Live Auctions panel so a pinned
      // `featured` auction is never excluded just for ending later.
      fetchAuctions({ status: "live", limit: 12 }),
      fetchCreators(8),
      fetchBookings(5),
      fetchLatestCampaign(),
    ])
      .then(([stats, allLiveAuctions, creators, bookings, newCampaign]) => {
        if (cancelled) return;

        const liveAuctions = allLiveAuctions.slice(0, 3);
        const endingSoon = allLiveAuctions[0] ?? null;
        const featured =
          allLiveAuctions.find((a) => a.featured) ??
          [...allLiveAuctions].sort((a, b) => b.highestBid - a.highestBid)[0] ??
          null;
        const trendingCreator =
          [...creators].sort(
            (a, b) => parseFloat(b.engagement ?? "0") - parseFloat(a.engagement ?? "0"),
          )[0] ?? null;
        const mostBooked =
          [...creators].sort((a, b) => b.bookingsThisMonth - a.bookingsThisMonth)[0] ?? null;

        setData({
          stats,
          featured,
          liveAuctions,
          endingSoon,
          creators,
          trendingCreator,
          mostBooked,
          newCampaign,
          bookings,
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

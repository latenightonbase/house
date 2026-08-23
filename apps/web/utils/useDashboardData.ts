"use client";

import { useEffect, useState } from "react";
import {
  DEMO_AUCTIONS,
  DEMO_BOOKINGS,
  DEMO_EARNERS,
  DEMO_ENDING_SOON,
  DEMO_FEATURED,
  DEMO_LIVE_AUCTIONS,
  DEMO_MOST_BOOKED,
  DEMO_NEW_CAMPAIGN,
  DEMO_RECENT_BIDS,
  DEMO_STATS,
  DEMO_TRENDING_CREATOR,
  DEMO_VIEWER,
} from "@/utils/demo/mockData";
import type {
  Auction,
  Booking,
  Campaign,
  Earner,
  PlatformAnalytics,
  RecentBid,
  Viewer,
} from "@/utils/types";

/**
 * THE SINGLE SEAM BETWEEN FAKE AND REAL DATA
 * ==========================================
 * Every dashboard component takes plain props; this hook is the only place
 * that decides where those props come from. To go live, flip `USE_DEMO_DATA`
 * to `false` and fill in the fetches in `loadLive()` — no component changes.
 */
const USE_DEMO_DATA = true;

export interface DashboardData {
  viewer: Viewer | null;
  stats: PlatformAnalytics | null;
  featured: Auction | null;
  liveAuctions: Auction[];
  allAuctions: Auction[];
  endingSoon: Auction | null;
  creators: Earner[];
  trendingCreator: Earner | null;
  mostBooked: (Earner & { bookingsThisMonth: number }) | null;
  newCampaign: Campaign | null;
  recentBids: RecentBid[];
  bookings: Booking[];
  loading: boolean;
  error: string | null;
}

const EMPTY: DashboardData = {
  viewer: null,
  stats: null,
  featured: null,
  liveAuctions: [],
  allAuctions: [],
  endingSoon: null,
  creators: [],
  trendingCreator: null,
  mostBooked: null,
  newCampaign: null,
  recentBids: [],
  bookings: [],
  loading: true,
  error: null,
};

const demoSnapshot: DashboardData = {
  viewer: DEMO_VIEWER,
  stats: DEMO_STATS,
  featured: DEMO_FEATURED,
  liveAuctions: DEMO_LIVE_AUCTIONS,
  allAuctions: DEMO_AUCTIONS,
  endingSoon: DEMO_ENDING_SOON,
  creators: DEMO_EARNERS,
  trendingCreator: DEMO_TRENDING_CREATOR,
  mostBooked: DEMO_MOST_BOOKED,
  newCampaign: DEMO_NEW_CAMPAIGN,
  recentBids: DEMO_RECENT_BIDS,
  bookings: DEMO_BOOKINGS,
  loading: false,
  error: null,
};

/**
 * Live wiring, kept alongside the demo path so the endpoints are documented
 * even while demo mode is on. Panels the API cannot serve yet fall back to
 * empty, and each panel renders its own empty state.
 */
async function loadLive(): Promise<DashboardData> {
  const [statsRes, auctionsRes, revenueRes, bidsRes] = await Promise.all([
    fetch("/api/analytics"),
    fetch("/api/auctions/getTopFive?page=1&limit=6&currency=all"),
    fetch("/api/leaderboard/top-revenue"),
    fetch("/api/leaderboard/recent-bids"),
  ]);

  const stats = statsRes.ok ? await statsRes.json() : null;
  const auctionsJson = auctionsRes.ok ? await auctionsRes.json() : null;
  const revenueJson = revenueRes.ok ? await revenueRes.json() : null;
  const bidsJson = bidsRes.ok ? await bidsRes.json() : null;

  const auctions: Auction[] = auctionsJson?.success ? auctionsJson.auctions : [];
  const creators: Earner[] = revenueJson?.success ? revenueJson.data : [];
  const recentBids: RecentBid[] = bidsJson?.success ? bidsJson.data : [];

  // Soonest to close drives the Ending Soon card.
  const endingSoon =
    [...auctions].sort((a, b) => a.hoursRemaining - b.hoursRemaining)[0] ?? null;

  return {
    viewer: null,
    stats,
    featured: auctions[0] ?? null,
    liveAuctions: auctions.slice(0, 3),
    allAuctions: auctions,
    endingSoon,
    creators,
    trendingCreator: creators[0] ?? null,
    mostBooked: null,
    newCampaign: null,
    recentBids,
    bookings: [],
    loading: false,
    error: null,
  };
}

export function useDashboardData(): DashboardData {
  const [data, setData] = useState<DashboardData>(
    USE_DEMO_DATA ? demoSnapshot : EMPTY
  );

  useEffect(() => {
    if (USE_DEMO_DATA) return;

    let cancelled = false;
    loadLive()
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setData({
            ...EMPTY,
            loading: false,
            error: err?.message || "Failed to load dashboard data",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

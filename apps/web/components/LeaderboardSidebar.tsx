'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { RiLoader5Fill, RiRefreshLine } from 'react-icons/ri';
import TopRevenueCard from './utils/TopRevenueCard';
import HighestBiddersCard from './utils/HighestBiddersCard';
import PastAuctionsCard from './utils/PastAuctionsCard';
import RecentBidsCard from './utils/RecentBidsCard';
import { ClockIcon, DiamondIcon, Trophy, TrophyIcon, ActivityIcon } from 'lucide-react';

interface TopRevenueUser {
  _id: string;
  totalRevenue: number;
  auctionCount: number;
  wallet: string;
  username?: string;
  display_name?: string;
  pfp_url?: string;
  socialId?: string;
}

interface HighestBid {
  _id: string;
  auctionId: string;
  bidAmount: number;
  usdcValue?: number;
  bidTimestamp: string;
  userId: string;
  wallet: string;
  username?: string;
  display_name?: string;
  pfp_url?: string;
  auctionName: string;
  currency: string;
}

interface TopBidder {
  wallet: string;
  username: string;
  fid: string;
  pfp_url: string | null;
  bidAmount: number;
  bidTimestamp: Date;
  _id: string;
}

interface HostInfo {
  _id: string;
  wallet: string;
  username?: string;
  display_name?: string;
  pfp_url?: string;
}

interface PastAuction {
  _id: string;
  auctionName: string;
  description?: string;
  endDate: string;
  currency: string;
  minimumBid: number;
  tokenAddress: string;
  blockchainAuctionId: string;
  imageUrl?: string;
  hostedBy: HostInfo;
  highestBid: number;
  topBidder: TopBidder | null;
  participantCount: number;
  hoursEnded: number;
  bidCount: number;
}

interface RecentBid {
  _id: string;
  bidderName: string;
  bidderPfp: string;
  bidderWallet: string;
  socialId: string;
  socialPlatform: string;
  auctionName: string;
  blockchainAuctionId: string;
  bidAmount: number;
  usdcValue: number;
  currency: string;
  bidTimestamp: string;
  source?: 'human' | 'bot' | null;
}

export default function LeaderboardSidebar() {
  const [topRevenue, setTopRevenue] = useState<TopRevenueUser[]>([]);
  const [highestBids, setHighestBids] = useState<HighestBid[]>([]);
  const [pastAuctions, setPastAuctions] = useState<PastAuction[]>([]);
  const [recentBids, setRecentBids] = useState<RecentBid[]>([]);
  
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingBids, setLoadingBids] = useState(true);
  const [loadingAuctions, setLoadingAuctions] = useState(true);
  const [loadingRecentBids, setLoadingRecentBids] = useState(true);
  
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchSidebarData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch all APIs in parallel for optimal performance
      const [revenueRes, bidsRes, auctionsRes, recentBidsRes] = await Promise.all([
        fetch('/api/leaderboard/top-revenue'),
        fetch('/api/leaderboard/highest-bids'),
        fetch('/api/auctions/getEnded?limit=1'),
        fetch('/api/leaderboard/recent-bids')
      ]);

      // Process revenue data
      if (revenueRes.ok) {
        const revenueData = await revenueRes.json();
        if (revenueData.success) {
          setTopRevenue(revenueData.data.slice(0, 3)); // Take only top 3
        }
      }
      setLoadingRevenue(false);

      // Process highest bids data
      if (bidsRes.ok) {
        const bidsData = await bidsRes.json();
        if (bidsData.success) {
          setHighestBids(bidsData.data.slice(0, 3)); // Take only top 3
        }
      }
      setLoadingBids(false);

      // Process past auctions data
      if (auctionsRes.ok) {
        const auctionsData = await auctionsRes.json();
        if (auctionsData.success) {
          setPastAuctions(auctionsData.auctions);
        }
      }
      setLoadingAuctions(false);

      // Process recent bids data
      if (recentBidsRes.ok) {
        const recentBidsData = await recentBidsRes.json();
        if (recentBidsData.success) {
          setRecentBids(recentBidsData.data);
        }
      }
      setLoadingRecentBids(false);

      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching sidebar data:', err);
      setError('Failed to load data');
      setLoadingRevenue(false);
      setLoadingBids(false);
      setLoadingAuctions(false);
      setLoadingRecentBids(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSidebarData();
  }, [fetchSidebarData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSidebarData();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [fetchSidebarData]);

  const handleManualRefresh = () => {
    setLoadingRevenue(true);
    setLoadingBids(true);
    setLoadingAuctions(true);
    setLoadingRecentBids(true);
    fetchSidebarData();
  };

  return (
    <aside className="w-full space-y-4 xl:sticky xl:top-8 xl:self-start max-xl:hidden">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <span className="panel-label">At a Glance</span>
        <button
          onClick={handleManualRefresh}
          className="p-1.5 text-caption hover:text-white hover:bg-white/[0.06] rounded-md transition-colors"
          title="Refresh data"
        >
          <RiRefreshLine className={loadingRevenue || loadingBids || loadingAuctions || loadingRecentBids ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="bg-negative/10 border border-negative/30 rounded-lg p-3 text-sm text-negative">
          {error}
        </div>
      )}

      {/* Top Revenue Earners */}
      <section className="card p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2.5">
          <span className="text-warning bg-warning/10 border border-warning/25 rounded-md p-1.5">
            <TrophyIcon className="w-4 h-4" />
          </span>
          Top Revenue Earners
        </h3>
        <TopRevenueCard users={topRevenue} loading={loadingRevenue} />
      </section>

      {/* Recent Bids */}
      <section className="card p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2.5">
          <span className="text-positive bg-positive/10 border border-positive/25 rounded-md p-1.5">
            <ActivityIcon className="w-4 h-4" />
          </span>
          Recent Activity
        </h3>
        <RecentBidsCard bids={recentBids} loading={loadingRecentBids} />
      </section>

      {/* Past Auctions */}
      <section className="card p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2.5">
          <span className="text-primary-light bg-primary/10 border border-primary/25 rounded-md p-1.5">
            <ClockIcon className="w-4 h-4" />
          </span>
          Last Ended Auctions
        </h3>
        <PastAuctionsCard auctions={pastAuctions} loading={loadingAuctions} />
      </section>

      {/* Last updated timestamp */}
      <div className="text-[11px] text-caption text-center">
        Last updated: {lastRefresh.toLocaleTimeString()}
      </div>
    </aside>
  );
}

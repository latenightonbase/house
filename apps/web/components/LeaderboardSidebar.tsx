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
    <div className="w-full ml-4 space-y-4 lg:sticky lg:top-4 lg:self-start max-lg:hidden">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">At a Glance</h2>
        <button
          onClick={handleManualRefresh}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Refresh data"
        >
          <RiRefreshLine className={`text-primary ${loadingRevenue || loadingBids || loadingAuctions || loadingRecentBids ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Top Revenue Earners */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="text-yellow-500 bg-yellow-500/20 rounded-lg p-2"><TrophyIcon className='w-6 h-6' /></span>
          Top Revenue Earners
        </h3>
        <TopRevenueCard users={topRevenue} loading={loadingRevenue} />
      </div>

      {/* Highest Bidders */}
      {/* <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="text-blue-500 bg-blue-500/20 rounded-lg p-2"><DiamondIcon className='w-6 h-6' /></span>
          Highest Bidders
        </h3>
        <HighestBiddersCard bids={highestBids} loading={loadingBids} />
      </div> */}

      {/* Recent Bids */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="text-green-500 bg-green-500/20 rounded-lg p-2"><ActivityIcon className='w-6 h-6' /></span>
          Recent Activity
        </h3>
        <RecentBidsCard bids={recentBids} loading={loadingRecentBids} />
      </div>

      {/* Past Auctions */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="text-gray-400 bg-gray-400/20 rounded-lg p-2"><ClockIcon className='w-6 h-6' /></span>
          Last Ended Auctions
        </h3>
        <PastAuctionsCard auctions={pastAuctions} loading={loadingAuctions} />
      </div>

      {/* Last updated timestamp */}
      <div className="text-xs text-caption text-center">
        Last updated: {lastRefresh.toLocaleTimeString()}
      </div>
    </div>
  );
}

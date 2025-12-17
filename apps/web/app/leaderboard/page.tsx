'use client'

import { useEffect, useState } from 'react'
import PageLayout from "@/components/UI/PageLayout"
import Heading from "@/components/UI/Heading"
import LeaderboardTable from "@/components/LeaderboardTable"
import { RiTrophyLine } from "react-icons/ri"
import { cn } from "@/lib/utils"

interface TopRevenueUser {
  _id: string;
  totalRevenue: number;
  auctionCount: number;
  wallet: string;
  username?: string;
  display_name?: string;
  pfp_url?: string;
  twitterProfile?: {
    username: string;
    name: string;
    profileImageUrl?: string;
  };
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
  twitterProfile?: {
    username: string;
    name: string;
    profileImageUrl?: string;
  };
  auctionName: string;
  currency: string;
}

export default function LeaderboardPage() {
  const [topRevenue, setTopRevenue] = useState<TopRevenueUser[]>([]);
  const [highestBids, setHighestBids] = useState<HighestBid[]>([]);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingBids, setLoadingBids] = useState(true);
  const [activeTab, setActiveTab] = useState<'revenue' | 'bids'>('revenue');

  useEffect(() => {
    const fetchTopRevenue = async () => {
      try {
        const response = await fetch('/api/leaderboard/top-revenue');
        const result = await response.json();
        if (result.success) {
          setTopRevenue(result.data);
        }
      } catch (error) {
        console.error('Error fetching top revenue:', error);
      } finally {
        setLoadingRevenue(false);
      }
    };

    const fetchHighestBids = async () => {
      try {
        const response = await fetch('/api/leaderboard/highest-bids');
        const result = await response.json();
        if (result.success) {
          setHighestBids(result.data);
        }
      } catch (error) {
        console.error('Error fetching highest bids:', error);
      } finally {
        setLoadingBids(false);
      }
    };

    fetchTopRevenue();
    fetchHighestBids();
  }, []);

  const formatWallet = (wallet: string) => {
    if (!wallet) return 'N/A';
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const formatNumber = (num: number) => {
    if (!num) return '0';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const revenueColumns = [
    {
      key: 'username',
      label: 'User',
      render: (value: string, row: TopRevenueUser) => (
        <div className="flex items-center gap-3 min-w-0">
          {row.pfp_url && (
            <img
              src={row.pfp_url}
              alt={row.display_name || row.username || 'User'}
              className="w-6 h-6 rounded-full flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">
              {row.display_name || row.username || formatWallet(row.wallet)}
            </div>
            {row.username && row.display_name && (
              <div className="text-xs text-caption truncate">@{row.username}</div>
            )}
          </div>
        </div>
      ),
      className: 'font-bold'
    },
    {
      key: 'totalRevenue',
      label: 'Revenue ($)',
      render: (value: number) => (
        <span className="font-semibold text-primary">${formatNumber(value)}</span>
      ),
      className: 'text-right'
    },
    {
      key: 'auctionCount',
      label: 'Auctions',
      render: (value: number) => (
        <span className="text-caption">{value}</span>
      ),
      className: 'text-right'
    }
  ];

  const bidsColumns = [
    {
      key: 'username',
      label: 'User',
      render: (value: string, row: HighestBid) => (
        <div className="flex items-center gap-3 min-w-0">
          {row.pfp_url && (
            <img
              src={row.pfp_url}
              alt={row.display_name || row.username || 'User'}
              className="w-6 h-6 aspect-square rounded-full flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">
              {row.display_name || row.username || formatWallet(row.wallet)}
            </div>
            {row.username && row.display_name && (
              <div className="text-xs text-caption truncate">@{row.username}</div>
            )}
          </div>
        </div>
      ),
      className: 'font-bold'
    },
    {
      key: 'auctionName',
      label: 'Auction',
      render: (value: string) => (
        <span className="font-medium truncate block">{value}</span>
      )
    },
    {
      key: 'bidAmount',
      label: 'Bid Amount',
      render: (value: number, row: HighestBid) => (
        <div>
          <div className="font-semibold text-primary">
            {formatNumber(value)} {row.currency}
          </div>
          {row.usdcValue && (
            <div className="text-xs text-caption">${formatNumber(row.usdcValue)}</div>
          )}
        </div>
      ),
      className: 'text-right'
    },
    {
      key: 'bidTimestamp',
      label: 'Date',
      render: (value: string) => (
        <span className="text-caption text-sm">{formatDate(value)}</span>
      ),
      className: 'text-right'
    }
  ];

  return (
    <PageLayout className="min-h-screen flex flex-col items-start justify-start">
      <div className="w-full max-w-7xl max-lg:mx-auto">
        <div className="flex items-center gap-4 mb-8 max-lg:mb-4">
          
 
            <Heading size="lg" >Leaderboard</Heading>

        </div>

        <div className="flex mb-6 overflow-x-hidden">
          <button
            onClick={() => setActiveTab('revenue')}
            className={cn(
              "px-4 py-2 font-medium transition-colors whitespace-nowrap flex-shrink-0",
              activeTab === 'revenue'
                ? "text-primary border-b-2 border-primary bg-white/5 rounded-md"
                : "text-caption hover:text-foreground"
            )}
          >
            🏆 Revenue
          </button>
          <button
            onClick={() => setActiveTab('bids')}
            className={cn(
              "px-4 py-2 font-medium transition-colors whitespace-nowrap flex-shrink-0",
              activeTab === 'bids'
                ? "text-primary border-b-2 border-primary bg-white/5 rounded-md"
                : "text-caption hover:text-foreground"
            )}
          >
            💎 Bids
          </button>
        </div>

        {activeTab === 'revenue' && (
          <LeaderboardTable
            title="Top Revenue Earners"
            columns={revenueColumns}
            data={topRevenue}
            loading={loadingRevenue}
            emptyMessage="No revenue data available yet"
          />
        )}

        {activeTab === 'bids' && (
          <LeaderboardTable
            title="Highest Bids"
            columns={bidsColumns}
            data={highestBids}
            loading={loadingBids}
            emptyMessage="No bids placed yet"
          />
        )}
      </div>
    </PageLayout>
  )
}


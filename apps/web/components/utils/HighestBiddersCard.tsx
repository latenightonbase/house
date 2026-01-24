'use client';
import React from 'react';
import { useNavigateWithLoader } from '@/utils/useNavigateWithLoader';

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

interface HighestBiddersCardProps {
  bids: HighestBid[];
  loading?: boolean;
}

const getRankBadgeColor = (index: number) => {
  switch (index) {
    case 0:
      return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'; // Gold
    case 1:
      return 'bg-gray-400/20 text-gray-400 border-gray-400/30'; // Silver
    case 2:
      return 'bg-orange-500/20 text-orange-500 border-orange-500/30'; // Bronze
    default:
      return 'bg-primary/20 text-primary border-primary/30';
  }
};

const formatBidAmount = (amount: number, currency: string): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M ${currency}`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(2)}K ${currency}`;
  }
  return `${amount.toLocaleString()} ${currency}`;
};

const formatUSDValue = (value?: number): string => {
  if (!value) return '';
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
};

export default function HighestBiddersCard({ bids, loading }: HighestBiddersCardProps) {
  const navigate = useNavigateWithLoader();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 bg-white/5 rounded-lg animate-pulse"
          >
            <div className="w-8 h-8 bg-secondary/20 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-secondary/20 rounded w-24 mb-2"></div>
              <div className="h-3 bg-secondary/20 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="text-center py-8 text-caption text-sm">
        No bids recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bids.map((bid, index) => (
        <div
          key={bid._id}
          onClick={() => navigate(`/user/${bid.userId}`)}
          className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-primary/30"
        >
          <div className={`flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold ${getRankBadgeColor(index)}`}>
            {index + 1}
          </div>
          
          <img
            src={bid.pfp_url || `https://api.dicebear.com/5.x/identicon/svg?seed=${bid.wallet}`}
            alt={bid.display_name || bid.username || 'User'}
            className="w-10 h-10 rounded-full border-2 border-primary/20"
          />
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {bid.display_name || bid.username || `${bid.wallet.slice(0, 6)}...${bid.wallet.slice(-4)}`}
            </div>
            {bid.username && bid.display_name && (
              <div className="text-xs text-caption truncate">@{bid.username}</div>
            )}
            
          </div>
          
          <div className="text-right">
            <div className="font-semibold text-primary text-xs">
              {formatBidAmount(bid.bidAmount, bid.currency)}
            </div>
            {bid.usdcValue && (
              <div className="text-xs text-caption">
                {formatUSDValue(bid.usdcValue)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

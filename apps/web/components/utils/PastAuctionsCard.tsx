'use client';
import React from 'react';
import { useNavigateWithLoader } from '@/utils/useNavigateWithLoader';

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

interface PastAuctionsCardProps {
  auctions: PastAuction[];
  loading?: boolean;
}

const formatTimeEnded = (hours: number): string => {
  if (hours < 1) return 'Just ended';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatBidAmount = (amount: number, currency: string): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M ${currency}`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(2)}K ${currency}`;
  }
  return `${amount.toLocaleString()} ${currency}`;
};

export default function PastAuctionsCard({ auctions, loading }: PastAuctionsCardProps) {
  const navigate = useNavigateWithLoader();

  if (loading) {
    return (
      <div className="space-y-3">
        
          <div
            
            className="p-3 bg-secondary/5 rounded-lg animate-pulse"
          >
            <div className="h-4 bg-secondary/20 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-secondary/20 rounded w-1/2 mb-2"></div>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-6 h-6 bg-secondary/20 rounded-full"></div>
              <div className="h-3 bg-secondary/20 rounded w-20"></div>
            </div>
          </div>
        
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div className="text-center py-8 text-caption text-sm">
        No past auctions yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {auctions.map((auction) => (
        <div
          key={auction._id}
          onClick={() => navigate(`/bid/${auction.blockchainAuctionId}`)}
          className="p-3 bg-primary/5 hover:bg-primary/10 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:border-primary/30"
        >
          <div className="flex items-start flex-row-reverse gap-3">
            {auction.imageUrl && (
              <img
                src={auction.imageUrl}
                alt={auction.auctionName}
                className="w-12 h-12 rounded-lg object-cover border border-primary/20"
              />
            )}
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate mb-1">
                {auction.auctionName}
              </h4>
              
              <div className="flex items-center gap-2 text-xs text-caption mb-2">
                <span>{formatTimeEnded(auction.hoursEnded)}</span>
                <span>•</span>
                <span>{auction.bidCount} bid{auction.bidCount !== 1 ? 's' : ''}</span>
              </div>

              {auction.topBidder && (
                <div className="flex items-center gap-2 mt-2">
                  <img
                    src={auction.topBidder.pfp_url || `https://api.dicebear.com/5.x/identicon/svg?seed=${auction.topBidder.wallet}`}
                    alt={auction.topBidder.username || 'Winner'}
                    className="w-5 h-5 rounded-full border border-primary/20"
                  />
                  <span className="text-xs text-caption truncate">
                    Won by {auction.topBidder.username || `${auction.topBidder.wallet.slice(0, 6)}...`}
                  </span>
                </div>
              )}
              
              <div className="mt-2">
                <span className="text-sm font-semibold text-primary">
                  {formatBidAmount(auction.highestBid, auction.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

import React from 'react';
import { RiLoader5Fill } from 'react-icons/ri';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Bot, User } from 'lucide-react';

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

interface RecentBidsCardProps {
  bids: RecentBid[];
  loading: boolean;
}

export default function RecentBidsCard({ bids, loading }: RecentBidsCardProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/10 rounded w-24" />
              <div className="h-2 bg-white/10 rounded w-32" />
            </div>
            <div className="h-3 bg-white/10 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="text-center py-6 text-caption text-sm">
        No recent bids yet
      </div>
    );
  }

  const formatAmount = (amount: number, currency: string) => {
    return `${amount.toLocaleString()} ${currency}`;
  };

  const formatUSD = (usd: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(usd);
  };

  return (
    <div className="space-y-3">
      {bids.map((bid) => (
        <Link
          key={bid._id}
          href={`/bid/${bid.blockchainAuctionId}`}
          className="flex items-start gap-3 p-2 rounded-xl hover:bg-primary/10 bg-primary/5 border-transparent hover:border-primary/30 transition-colors group"
        >
          {/* Bidder Avatar */}
          <div className="relative flex-shrink-0">
            <img
              src={bid.bidderPfp}
              alt={bid.bidderName}
              className="w-10 h-10 rounded-full object-cover border border-primary/20"
              onError={(e) => {
                e.currentTarget.src = `https://api.dicebear.com/5.x/identicon/svg?seed=${bid.bidderWallet || 'default'}`;
              }}
            />
          </div>

          {/* Bid Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {bid.bidderName}
                  </p>
                  {bid.source === 'bot' && (
                    <span className="flex items-center gap-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-medium px-1 py-0.5 rounded flex-shrink-0">
                      <Bot className="w-2.5 h-2.5" />
                      
                    </span>
                  )}
                  {bid.source && bid.source === 'human' && (
                    <span className="flex items-center gap-0.5 bg-green-500/20 text-green-400 text-[10px] font-medium px-1 py-0.5 rounded flex-shrink-0">
                      <User className="w-2.5 h-2.5" />
                      
                    </span>
                  )}
                </div>
                <p className="text-xs text-caption truncate">
                  {bid.auctionName}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-primary">
                  {formatAmount(bid.bidAmount, bid.currency)}
                </p>
                {bid.usdcValue > 0 && (
                  <p className="text-xs text-caption">
                    {formatUSD(bid.usdcValue)}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-caption mt-1">
              {formatDistanceToNow(new Date(bid.bidTimestamp), { addSuffix: true })}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

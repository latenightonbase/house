'use client';
import React from 'react';
import { useNavigateWithLoader } from '@/utils/useNavigateWithLoader';

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

interface TopRevenueCardProps {
  users: TopRevenueUser[];
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

const formatRevenue = (revenue: number): string => {
  if (revenue >= 1000000) {
    return `$${(revenue / 1000000).toFixed(2)}M`;
  } else if (revenue >= 1000) {
    return `$${(revenue / 1000).toFixed(2)}K`;
  }
  return `$${revenue.toFixed(2)}`;
};

export default function TopRevenueCard({ users, loading }: TopRevenueCardProps) {
  const navigate = useNavigateWithLoader();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg animate-pulse"
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

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-caption text-sm">
        No revenue data yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user, index) => (
        <div
          key={user._id}
          onClick={() => navigate(`/user/${user._id}`)}
          className="flex items-center gap-3 p-3 bg-primary/5 hover:bg-primary/10 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:border-primary/30"
        >
          <div className={`flex items-center justify-center w-6 h-6 rounded-lg border text-xs font-bold ${getRankBadgeColor(index)}`}>
            {index + 1}
          </div>
          
          <img
            src={user.pfp_url || `https://api.dicebear.com/5.x/identicon/svg?seed=${user.wallet || 'unknown'}`}
            alt={user.display_name || user.username || 'User'}
            className="w-10 h-10 rounded-full border-2 border-primary/20"
          />
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {user.display_name || user.username || (user.wallet ? `${user.wallet.slice(0, 6)}...${user.wallet.slice(-4)}` : 'Unknown')}
            </div>
            <div className="font-semibold text-primary text-sm">
              {formatRevenue(user.totalRevenue)}
              
            </div>
            
          </div>
          
          <div className="text-right">
            <div className="text-xs text-caption mt-0.5">
              {user.auctionCount} auction{user.auctionCount !== 1 ? 's' : ''}
            </div>
            
          </div>
        </div>
      ))}
    </div>
  );
}

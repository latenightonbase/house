'use client'

import { useEffect, useState } from 'react'
import PageLayout from "@/components/UI/PageLayout"
import { RiLoader5Fill } from "react-icons/ri"
import { cn } from "@/lib/utils"
import { useNavigateWithLoader } from '@/utils/useNavigateWithLoader'
import { ChartLineIcon, Medal, Trophy, Zap } from 'lucide-react'

interface TopRevenueUser {
  _id: string;
  totalRevenue: number;
  auctionCount: number;
  wallet: string;
  username?: string;
  display_name?: string;
  pfp_url?: string;
  socialId?: string;
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
  socialId?: string;
  twitterProfile?: {
    username: string;
    name: string;
    profileImageUrl?: string;
  };
  auctionName: string;
  currency: string;
}

interface XPLeaderboardEntry {
  userId: string;
  username?: string;
  socialId?: string;
  socialPlatform?: string;
  currentSeasonXP: number;
  totalXP: number;
  level: number;
  rank: number;
  pfp_url?: string;
  display_name?: string;
}

export default function LeaderboardPage() {
  const [topRevenue, setTopRevenue] = useState<TopRevenueUser[]>([]);
  const [highestBids, setHighestBids] = useState<HighestBid[]>([]);
  const [seasonXP, setSeasonXP] = useState<XPLeaderboardEntry[]>([]);
  const [allTimeXP, setAllTimeXP] = useState<XPLeaderboardEntry[]>([]);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingBids, setLoadingBids] = useState(true);
  const [loadingSeasonXP, setLoadingSeasonXP] = useState(true);
  const [loadingAllTimeXP, setLoadingAllTimeXP] = useState(true);
  const [activeTab, setActiveTab] = useState<'season-xp' | 'alltime-xp' | 'revenue' | 'bids'>('season-xp');
  const navigate = useNavigateWithLoader();

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

    const fetchSeasonXP = async () => {
      try {
        const response = await fetch('/api/leaderboard/season?type=season&limit=100');
        const result = await response.json();
        if (result.success) {
          setSeasonXP(result.leaderboard);
        }
      } catch (error) {
        console.error('Error fetching season XP:', error);
      } finally {
        setLoadingSeasonXP(false);
      }
    };

    const fetchAllTimeXP = async () => {
      try {
        const response = await fetch('/api/leaderboard/season?type=alltime&limit=100');
        const result = await response.json();
        if (result.success) {
          setAllTimeXP(result.leaderboard);
        }
      } catch (error) {
        console.error('Error fetching all-time XP:', error);
      } finally {
        setLoadingAllTimeXP(false);
      }
    };

    fetchTopRevenue();
    fetchHighestBids();
    fetchSeasonXP();
    fetchAllTimeXP();
  }, []);

  const formatWallet = (wallet: string) => {
    if (!wallet) return 'N/A';
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const formatNumber = (num: number) => {
    if (!num) return '0';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const getRankBadgeColor = (index: number) => {
    if (index === 0) return 'bg-yellow-500/90';
    if (index === 1) return 'bg-gray-400/90';
    if (index === 2) return 'bg-orange-600/90';
    return 'bg-gray-700/90';
  };

  const handleCardClick = (userId: string, socialId?: string) => {
    if (!socialId) return;
    navigate(`/user/${userId}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start">
      <div className="w-full lg:min-w-[1000px] mx-auto lg:px-4 pb-16">
        <div className="flex flex-col items-center mb-8 mt-4">
          <div className="lg:w-20 lg:h-20 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/50 flex items-center justify-center mb-4">
            <svg className="lg:w-10 lg:h-10 w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <h1 className="lg:text-4xl text-2xl font-bold mb-2">Leaderboard</h1>
          <p className="text-sm max-lg:text-xs text-gray-400">Top performers in the HOUSE community</p>
        </div>

        <div className="flex gap-2 mb-8 border-b border-gray-800 w-full overflow-x-auto">
          <button
            onClick={() => setActiveTab('season-xp')}
            className={cn(
              "pb-3 px-3 font-medium transition-colors relative flex items-center gap-2 whitespace-nowrap max-lg:text-sm",
              activeTab === 'season-xp'
                ? "text-white"
                : "text-gray-400 hover:text-gray-300"
            )}
          >
            <Zap className="w-5 h-5" />
            <span>Season XP</span>
            {activeTab === 'season-xp' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('alltime-xp')}
            className={cn(
              "pb-3 px-3 font-medium transition-colors relative flex items-center gap-2 whitespace-nowrap max-lg:text-sm",
              activeTab === 'alltime-xp'
                ? "text-white"
                : "text-gray-400 hover:text-gray-300"
            )}
          >
            <Trophy className="w-5 h-5" />
            <span>All-Time XP</span>
            {activeTab === 'alltime-xp' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('revenue')}
            className={cn(
              "pb-3 px-3 font-medium transition-colors relative flex items-center gap-2 whitespace-nowrap max-lg:text-sm",
              activeTab === 'revenue'
                ? "text-white"
                : "text-gray-400 hover:text-gray-300"
            )}
          >
            <ChartLineIcon className="w-5 h-5" />
            <span>Top Revenue</span>
            {activeTab === 'revenue' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('bids')}
            className={cn(
              "pb-3 px-3 font-medium transition-colors relative flex items-center gap-2 whitespace-nowrap max-lg:text-sm",
              activeTab === 'bids'
                ? "text-white"
                : "text-gray-400 hover:text-gray-300"
            )}
          >
            <Medal className="w-5 h-5 " />
            <span>Highest Bids</span>
            {activeTab === 'bids' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        <div className="w-full ">
          {activeTab === 'season-xp' && (
            <div className="space-y-3">
              {loadingSeasonXP ? (
                <div className="flex items-center justify-center py-16">
                  <RiLoader5Fill className="text-primary animate-spin text-3xl" />
                </div>
              ) : seasonXP.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  No XP data available yet for this season
                </div>
              ) : (
                seasonXP.slice(0, 100).map((entry, index) => (
                  <div
                    key={entry.userId}
                    onClick={() => handleCardClick(entry.userId, entry.socialId)}
                    className={cn(
                      "rounded-xl p-4 lg:p-5 flex items-center gap-3 lg:gap-4 transition-all border cursor-pointer w-full",
                      index === 0 && "bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border-yellow-500/30",
                      index === 1 && "bg-gradient-to-r from-gray-400/10 to-gray-500/5 border-gray-400/30",
                      index === 2 && "bg-gradient-to-r from-orange-500/10 to-orange-600/5 border-orange-500/30",
                      index > 2 && "bg-white/5 border-gray-700/50 hover:bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm lg:text-base",
                      getRankBadgeColor(index)
                    )}>
                      #{entry.rank}
                    </div>
                    
                    <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
                      {entry.pfp_url && (
                        <img
                          src={entry.pfp_url}
                          alt={entry.display_name || entry.username || 'User'}
                          className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex-shrink-0 object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white truncate text-sm lg:text-base">
                          {entry.display_name || entry.username || entry.userId.slice(0, 8) + '...'}
                        </div>
                        {entry.username && (
                          <div className="text-xs lg:text-sm text-gray-400 truncate">
                            @{entry.username}
                          </div>
                        )}
                        <div className="text-xs text-purple-400 mt-0.5">
                          Level {entry.level}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-lg lg:text-2xl font-bold text-white whitespace-nowrap">
                        {formatNumber(entry.currentSeasonXP)} XP
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'alltime-xp' && (
            <div className="space-y-3">
              {loadingAllTimeXP ? (
                <div className="flex items-center justify-center py-16">
                  <RiLoader5Fill className="text-primary animate-spin text-3xl" />
                </div>
              ) : allTimeXP.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  No XP data available yet
                </div>
              ) : (
                allTimeXP.slice(0, 100).map((entry, index) => (
                  <div
                    key={entry.userId}
                    onClick={() => handleCardClick(entry.userId, entry.socialId)}
                    className={cn(
                      "rounded-xl p-4 lg:p-5 flex items-center gap-3 lg:gap-4 transition-all border cursor-pointer w-full",
                      index === 0 && "bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border-yellow-500/30",
                      index === 1 && "bg-gradient-to-r from-gray-400/10 to-gray-500/5 border-gray-400/30",
                      index === 2 && "bg-gradient-to-r from-orange-500/10 to-orange-600/5 border-orange-500/30",
                      index > 2 && "bg-white/5 border-gray-700/50 hover:bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm lg:text-base",
                      getRankBadgeColor(index)
                    )}>
                      #{entry.rank}
                    </div>
                    
                    <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
                      {entry.pfp_url && (
                        <img
                          src={entry.pfp_url}
                          alt={entry.display_name || entry.username || 'User'}
                          className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex-shrink-0 object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white truncate text-sm lg:text-base">
                          {entry.display_name || entry.username || entry.userId.slice(0, 8) + '...'}
                        </div>
                        {entry.username && (
                          <div className="text-xs lg:text-sm text-gray-400 truncate">
                            @{entry.username}
                          </div>
                        )}
                        <div className="text-xs text-purple-400 mt-0.5">
                          Level {entry.level}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-lg lg:text-2xl font-bold text-white whitespace-nowrap">
                        {formatNumber(entry.totalXP)} XP
                      </div>
                      <div className="text-xs lg:text-sm text-gray-400">
                        {formatNumber(entry.currentSeasonXP)} this season
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="space-y-3">
              {loadingRevenue ? (
                <div className="flex items-center justify-center py-16">
                  <RiLoader5Fill className="text-primary animate-spin text-3xl" />
                </div>
              ) : topRevenue.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  No revenue data available yet
                </div>
              ) : (
                topRevenue.slice(0, 10).map((user, index) => (
                  <div
                    key={user._id}
                    onClick={() => handleCardClick(user._id, user.socialId)}
                    className={cn(
                      "rounded-xl p-4 lg:p-5 flex items-center gap-3 lg:gap-4 transition-all border cursor-pointer w-full",
                      index === 0 && "bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border-yellow-500/30",
                      index === 1 && "bg-gradient-to-r from-gray-400/10 to-gray-500/5 border-gray-400/30",
                      index === 2 && "bg-gradient-to-r from-orange-500/10 to-orange-600/5 border-orange-500/30",
                      index > 2 && "bg-white/5 border-gray-700/50 hover:bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm lg:text-base",
                      getRankBadgeColor(index)
                    )}>
                      #{index + 1}
                    </div>
                    
                    <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
                      {user.pfp_url && (
                        <img
                          src={user.pfp_url}
                          alt={user.display_name || user.username || 'User'}
                          className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex-shrink-0 object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white truncate text-sm lg:text-base">
                          {user.display_name || user.username || formatWallet(user.wallet)}
                        </div>
                        {user.username && (
                          <div className="text-xs lg:text-sm text-gray-400 truncate">
                            @{user.username}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-lg lg:text-2xl font-bold text-white whitespace-nowrap">
                        ${formatNumber(user.totalRevenue)}
                      </div>
                      <div className="text-xs lg:text-sm text-gray-400">
                        {user.auctionCount} auction{user.auctionCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'bids' && (
            <div className="space-y-3">
              {loadingBids ? (
                <div className="flex items-center justify-center py-16">
                  <RiLoader5Fill className="text-primary animate-spin text-3xl" />
                </div>
              ) : highestBids.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  No bids placed yet
                </div>
              ) : (
                highestBids.slice(0, 10).map((bid, index) => (
                  <div
                    key={bid._id}
                    onClick={() => handleCardClick(bid.userId, bid.socialId)}
                    className={cn(
                      "rounded-xl p-4 lg:p-5 flex items-start lg:items-center gap-3 lg:gap-4 transition-all border cursor-pointer w-full",
                      index === 0 && "bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border-yellow-500/30",
                      index === 1 && "bg-gradient-to-r from-gray-400/10 to-gray-500/5 border-gray-400/30",
                      index === 2 && "bg-gradient-to-r from-orange-500/10 to-orange-600/5 border-orange-500/30",
                      index > 2 && "bg-white/5 border-gray-700/50 hover:bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm lg:text-base",
                      getRankBadgeColor(index)
                    )}>
                      #{index + 1}
                    </div>
                    
                    <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
                      {bid.pfp_url && (
                        <img
                          src={bid.pfp_url}
                          alt={bid.display_name || bid.username || 'User'}
                          className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex-shrink-0 object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white truncate text-sm lg:text-base">
                          {bid.display_name || bid.username || formatWallet(bid.wallet)}
                        </div>
                        {bid.username && (
                          <div className="text-xs lg:text-sm text-gray-400 truncate">
                            @{bid.username}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 truncate mt-0.5 lg:hidden">
                          {bid.auctionName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-lg lg:text-2xl font-bold text-white whitespace-nowrap">
                        ${formatNumber(bid.bidAmount)}
                      </div>
                      <div className="text-xs lg:text-sm text-gray-400 hidden lg:block">
                        {formatDate(bid.bidTimestamp)}
                      </div>
                      <div className="text-xs text-gray-500 lg:hidden">
                        {bid.auctionName.length > 15 ? bid.auctionName.slice(0, 15) + '...' : bid.auctionName}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


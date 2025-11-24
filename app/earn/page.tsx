'use client'

import { useEffect, useState } from "react"
import { usePrivy } from "@privy-io/react-auth"
import PageLayout from "@/components/UI/PageLayout"
import { RiQrScanLine, RiTrophyLine, RiCheckLine } from "react-icons/ri"

interface WeeklyReward {
  _id: string;
  weekStartDate: string;
  weekEndDate: string;
  weekLabel: string;
  totalSpentUSD: number;
  bidCount: number;
  claimed: boolean;
  rewardAmount: number;
}

interface WeeklyBidder {
  _id: string;
  userId: string;
  wallet: string;
  username?: string;
  display_name?: string;
  pfp_url?: string;
  totalSpentUSD: number;
  bidCount: number;
  weekStartDate: string;
  weekEndDate: string;
}

export default function EarnPage() {
  const { authenticated, ready } = usePrivy();
  const [weeklyRewards, setWeeklyRewards] = useState<WeeklyReward[]>([]);
  const [weeklyBidders, setWeeklyBidders] = useState<WeeklyBidder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    if (authenticated) {
      fetchWeeklyRewards();
      fetchWeeklyBidders();
    } else if (!ready) {
      // Still loading
    } else {
      setLoading(false);
      setLoadingLeaderboard(false);
    }
  }, [authenticated, ready]);

  const fetchWeeklyRewards = async () => {
    try {
      const response = await fetch('/api/earn/weekly-rewards');
      const result = await response.json();
      if (result.success) {
        setWeeklyRewards(result.data);
      }
    } catch (error) {
      console.error('Error fetching weekly rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyBidders = async () => {
    try {
      const response = await fetch('/api/leaderboard/weekly-bidders');
      const result = await response.json();
      if (result.success) {
        setWeeklyBidders(result.data);
      }
    } catch (error) {
      console.error('Error fetching weekly bidders:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleClaim = async (entryId: string) => {
    setClaiming(entryId);
    try {
      const response = await fetch('/api/earn/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entryId }),
      });

      const result = await response.json();

      if (result.success) {
        // Update the local state
        setWeeklyRewards(prev =>
          prev.map(reward =>
            reward._id === entryId
              ? { ...reward, claimed: true, rewardAmount: result.rewardAmount }
              : reward
          )
        );
        alert(`Successfully claimed $${result.rewardAmount} reward!`);
      } else {
        alert(`Failed to claim reward: ${result.error}`);
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      alert('Failed to claim reward. Please try again.');
    } finally {
      setClaiming(null);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatWallet = (wallet: string) => {
    if (!wallet) return 'N/A';
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const isWeekEnded = (weekEndDate: string) => {
    return new Date() > new Date(weekEndDate);
  };

  const unclaimedRewards = weeklyRewards.filter(r => !r.claimed && isWeekEnded(r.weekEndDate));
  const claimedRewards = weeklyRewards.filter(r => r.claimed);
  const currentWeekRewards = weeklyRewards.filter(r => !isWeekEnded(r.weekEndDate));

  if (status === 'unauthenticated') {
    return (
      <PageLayout className="min-h-screen flex flex-col items-start justify-start">
        <div className="w-full max-w-6xl max-lg:mx-auto mt-8">
          <div className="bg-white/10 rounded-lg shadow-md border border-gray-700 p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 gradient-button rounded-full flex items-center justify-center">
                <RiTrophyLine className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Connect Wallet to Earn</h3>
                <p className="text-caption">
                  Please connect your wallet to view and claim your weekly bidding rewards.
                </p>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="min-h-screen flex flex-col items-start justify-start">
      <div className="w-full max-w-6xl max-lg:mx-auto">
        <div className="flex items-center gap-4 mb-8 max-lg:mb-4">
          <div className="w-12 h-12 gradient-button rounded-full flex items-center justify-center">
            <RiTrophyLine className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Earn Rewards</h1>
            <p className="text-caption">Claim rewards for your weekly bidding activity</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white/10 rounded-lg shadow-md border border-gray-700 p-8 text-center">
            <p className="text-caption">Loading your rewards...</p>
          </div>
        ) : weeklyRewards.length === 0 ? (
          <div className="bg-white/10 rounded-lg shadow-md border border-gray-700 p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 gradient-button rounded-full flex items-center justify-center">
                <RiQrScanLine className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No Rewards Yet</h3>
                <p className="text-caption mb-4">
                  Start bidding on auctions to earn weekly rewards!
                </p>
                <p className="text-sm text-caption">
                  Bid at least $10 USD on other users' auctions each week to qualify for rewards.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Unclaimed Rewards */}
            {unclaimedRewards.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="text-primary">💰</span> Claimable Rewards
                </h2>
                <div className="space-y-3">
                  {unclaimedRewards.map((reward) => (
                    <div
                      key={reward._id}
                      className="bg-white/10 rounded-lg shadow-md border border-primary/50 p-6"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{reward.weekLabel}</h3>
                            <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                              Ready to Claim
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-caption">
                            <span>Total Spent: ${formatNumber(reward.totalSpentUSD)}</span>
                            <span>•</span>
                            <span>{reward.bidCount} Bids</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleClaim(reward._id)}
                          disabled={claiming === reward._id}
                          className="gradient-button px-6 py-2 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {claiming === reward._id ? 'Claiming...' : 'Claim Reward'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Week Progress */}
            {currentWeekRewards.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span>📅</span> Current Week Progress
                </h2>
                <div className="space-y-3">
                  {currentWeekRewards.map((reward) => (
                    <div
                      key={reward._id}
                      className="bg-white/10 rounded-lg shadow-md border border-gray-700 p-6"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold mb-2">{reward.weekLabel}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-caption">
                            <span>Total Spent: ${formatNumber(reward.totalSpentUSD)}</span>
                            <span>•</span>
                            <span>{reward.bidCount} Bids</span>
                          </div>
                        </div>
                        <span className="px-4 py-2 bg-gray-700 text-caption rounded-lg text-sm">
                          In Progress
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Claimed Rewards */}
            {claimedRewards.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span>✅</span> Claimed Rewards
                </h2>
                <div className="space-y-3">
                  {claimedRewards.map((reward) => (
                    <div
                      key={reward._id}
                      className="bg-white/5 rounded-lg shadow-md border border-gray-700 p-6 opacity-75"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold mb-2">{reward.weekLabel}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-caption">
                            <span>Total Spent: ${formatNumber(reward.totalSpentUSD)}</span>
                            <span>•</span>
                            <span>{reward.bidCount} Bids</span>
                            {reward.rewardAmount > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-green-500 font-semibold">
                                  Earned: ${formatNumber(reward.rewardAmount)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-green-500">
                          <RiCheckLine className="w-5 h-5" />
                          <span className="text-sm font-medium">Claimed</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Leaderboard */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>📅</span> Weekly Top Bidders Leaderboard
              </h2>
              {loadingLeaderboard ? (
                <div className="bg-white/10 rounded-lg shadow-md border border-gray-700 p-8 text-center">
                  <p className="text-caption">Loading leaderboard...</p>
                </div>
              ) : weeklyBidders.length === 0 ? (
                <div className="bg-white/10 rounded-lg shadow-md border border-gray-700 p-8 text-center">
                  <p className="text-caption">No qualifying bids this week (minimum $10 USD)</p>
                </div>
              ) : (
                <div className="bg-white/10 rounded-lg shadow-md border border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-caption uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-caption uppercase tracking-wider">
                            Total Spent ($)
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-caption uppercase tracking-wider">
                            Bids
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {weeklyBidders.map((bidder, index) => (
                          <tr key={bidder._id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {index === 0 && <span className="text-2xl">🥇</span>}
                                {index === 1 && <span className="text-2xl">🥈</span>}
                                {index === 2 && <span className="text-2xl">🥉</span>}
                                {index > 2 && <span className="text-caption font-medium">#{index + 1}</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3 min-w-0">
                                {bidder.pfp_url && (
                                  <img
                                    src={bidder.pfp_url}
                                    alt={bidder.display_name || bidder.username || 'User'}
                                    className="w-8 h-8 rounded-full flex-shrink-0"
                                  />
                                )}
                                <div className="min-w-0">
                                  <div className="font-medium truncate">
                                    {bidder.display_name || bidder.username || formatWallet(bidder.wallet)}
                                  </div>
                                  {bidder.username && bidder.display_name && (
                                    <div className="text-xs text-caption truncate">@{bidder.username}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="font-semibold text-primary">${formatNumber(bidder.totalSpentUSD)}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="text-caption">{bidder.bidCount}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}


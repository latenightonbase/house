"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RiLoader5Fill, RiArrowLeftLine, RiUserLine, RiAuctionLine, RiMedalLine } from "react-icons/ri";
import Image from "next/image";
import Heading from "@/components/UI/Heading";
import UserAuctions from "@/components/UserAuctions";
import ReviewCard from "@/components/UI/ReviewCard";
import RatingCircle from "@/components/UI/RatingCircle";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { sdk } from "@farcaster/miniapp-sdk";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import ScrollingName from "@/components/utils/ScrollingName";

interface UserData {
  user: {
    _id: string;
    wallet: string;
    fid?: string;
    username?: string;
    pfp_url?: string | null;
    display_name?: string | null;
    bio?: string | null;
    x_username?: string | null;
    averageRating?: number;
    totalReviews?: number;
    twitterProfile?: any | null;
    platform?: string | null;
  };
  activeAuctions: any[];
  endedAuctions: any[];
}

interface Review {
  _id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer: {
    _id: string;
    username?: string;
    display_name?: string;
    pfp_url?: string | null;
    twitterProfile?: {
      username: string;
      profileImageUrl?: string;
    };
  };
  auction: {
    auctionName: string;
  };
}

interface Bid {
  _id: string;
  bidAmount: number;
  usdcValue: number;
  currency: string;
  bidTimestamp: string;
  auction: {
    _id: string;
    auctionName: string;
    blockchainAuctionId: string;
    imageUrls?: string[];
  };
}

interface Statistics {
  totalBids: number;
  activeAuctions: number;
  totalTradingVolume: number;
}

export default function UserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const navigateWithLoader = useNavigateWithLoader();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"activity" | "reviews" | "active" | "ended">("activity");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [recentBids, setRecentBids] = useState<Bid[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [statistics, setStatistics] = useState<Statistics>({
    totalBids: 0,
    activeAuctions: 0,
    totalTradingVolume: 0
  });

  const { context } = useMiniKit();

  const handleViewProfile = async () => {
    if (context && userData?.user.fid) {
      try {
        await sdk.actions.viewProfile({
          fid: parseInt(userData.user.fid),
        });
      } catch (error) {
        console.error("Error viewing profile:", error);
      }
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${userId}/auctions`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("User not found");
          }
          throw new Error("Failed to fetch user data");
        }

        const data = await response.json();
        setUserData(data);

        // Calculate statistics
        const totalBids = [...data.activeAuctions, ...data.endedAuctions].reduce(
          (acc, auction) => acc + (auction.biddersCount || 0),
          0
        );

        const totalTradingVolume = data.endedAuctions.reduce(
          (acc: number, auction: any) => acc + (auction.highestBid || 0),
          0
        );

        setStatistics({
          totalBids,
          activeAuctions: data.activeAuctions.length,
          totalTradingVolume
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!userId || activeTab !== "reviews") return;
      
      try {
        setReviewsLoading(true);
        const response = await fetch(`/api/reviews/user/${userId}`);
        
        if (response.ok) {
          const data = await response.json();
          setReviews(data.reviews || []);
        }
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [userId, activeTab]);

  useEffect(() => {
    const fetchRecentBids = async () => {
      if (!userId || activeTab !== "activity") return;
      
      try {
        setBidsLoading(true);
        const response = await fetch(`/api/users/bids?userId=${userId}&limit=5`);
        
        if (response.ok) {
          const data = await response.json();
          setRecentBids(data.bids || []);
        }
      } catch (err) {
        console.error("Failed to fetch recent bids:", err);
      } finally {
        setBidsLoading(false);
      }
    };

    fetchRecentBids();
  }, [userId, activeTab]);

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    } else {
      return `$${volume.toFixed(2)}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RiLoader5Fill className="text-primary animate-spin text-3xl mx-auto" />
          <p className="mt-4 text-caption">Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-80 transition-opacity"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-caption">No user data found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto pt-4 lg:pt-6 max-lg:pb-20">

        {/* Profile Header - Matching /profile page style */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-primary/30 lg:p-8 p-2 mb-6">
          <div className="flex max-lg:flex-col items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {userData.user.pfp_url ? (
                <Image
                  unoptimized
                  alt="Profile Picture"
                  src={userData.user.twitterProfile?.profileImageUrl || userData.user.pfp_url}
                  width={120}
                  height={120}
                  className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl border-2 border-primary shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 lg:w-24 lg:h-24 border-2 border-primary rounded-2xl bg-white/10 flex items-center justify-center">
                  <RiUserLine className="text-4xl text-primary" />
                </div>
              )}
              
              <div>
                <div className="flex items-center lg:gap-3 gap-1 mb-2">
                  <ScrollingName
                    name={userData.user.display_name || userData.user.username || 'User Profile'}
                    className="text-3xl max-lg:text-xl font-bold text-white max-lg:w-36 max-w-80"
                  />
                  {(userData.user.averageRating ?? 0) > 0 && (userData.user.totalReviews ?? 0) > 0 && (
                    <RatingCircle
                      rating={userData.user.averageRating}
                      totalReviews={userData.user.totalReviews}
                      size="sm"
                      showLabel={false}
                    />
                  )}
                </div>
                {userData.user.username && (
                  <p className="text-secondary mb-2 text-sm">
                    @{userData.user.username}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-3">
                  {userData.user.x_username && userData.user.platform === "FARCASTER" && (
                    <a 
                      href={`https://twitter.com/${userData.user.x_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      @{userData.user.x_username}
                    </a>
                  )}
                  {userData.user.twitterProfile && userData.user.platform === "TWITTER" && (
                    <a 
                      href={`https://twitter.com/${userData.user.twitterProfile.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      @{userData.user.twitterProfile.username}
                    </a>
                  )}
                  {context && userData.user.fid && userData.user.platform === "FARCASTER" && (
                    <button
                      onClick={handleViewProfile}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/30 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm font-medium"
                    >
                      <RiUserLine className="text-sm" />
                      View Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="bg-white/10 rounded-xl lg:p-6 p-4 border border-white/10">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-3">
                <RiAuctionLine className="text-2xl text-purple-400" />
              </div>
              <div className="text-3xl max-lg:text-2xl font-bold text-white mb-1">
                {userData.activeAuctions.length + userData.endedAuctions.length}
              </div>
              <div className="text-sm text-gray-400">Auctions Hosted</div>
            </div>

            <div className="bg-white/10 rounded-xl lg:p-6 p-4 border border-white/10">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="text-3xl max-lg:text-2xl font-bold text-white mb-1">{statistics.totalBids}</div>
              <div className="text-sm text-gray-400">Total Bids</div>
            </div>

            <div className="bg-white/10 rounded-xl lg:p-6 p-4 border border-white/10 max-lg:col-span-2">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-3xl max-lg:text-2xl font-bold text-white mb-1">{statistics.activeAuctions}</div>
              <div className="text-sm text-gray-400">Active Auctions</div>
            </div>
          </div>

          {/* Total Trading Volume */}
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl lg:p-6 p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400 mb-1">Total Trading Volume</div>
                <div className="lg:text-4xl text-2xl font-bold text-white">{formatVolume(statistics.totalTradingVolume)}</div>
                <div className="text-sm text-gray-400 mt-1">Across all auctions</div>
              </div>
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-4 py-2 font-medium transition-colors capitalize whitespace-nowrap shrink-0 rounded-md ${
              activeTab === "activity"
                ? "text-primary border-b-2 border-primary bg-white/5"
                : "text-caption hover:text-foreground"
            }`}
          >
            Recent Activity
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`px-4 py-2 font-medium transition-colors capitalize whitespace-nowrap shrink-0 rounded-md ${
              activeTab === "reviews"
                ? "text-primary border-b-2 border-primary bg-white/5"
                : "text-caption hover:text-foreground"
            }`}
          >
            Reviews
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 font-medium transition-colors capitalize whitespace-nowrap shrink-0 rounded-md ${
              activeTab === "active"
                ? "text-primary border-b-2 border-primary bg-white/5"
                : "text-caption hover:text-foreground"
            }`}
          >
            Active Auctions
          </button>
          <button
            onClick={() => setActiveTab("ended")}
            className={`px-4 py-2 font-medium transition-colors capitalize whitespace-nowrap shrink-0 rounded-md ${
              activeTab === "ended"
                ? "text-primary border-b-2 border-primary bg-white/5"
                : "text-caption hover:text-foreground"
            }`}
          >
            Ended Auctions
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === "activity" && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Recent Activity</h2>
            <div className="bg-secondary/10 rounded-xl border border-secondary/10 lg:p-6 p-4">
              {bidsLoading ? (
                <div className="text-center py-6">
                  <RiLoader5Fill className="text-primary animate-spin text-3xl mx-auto" />
                  <p className="mt-4 text-caption">Loading activity...</p>
                </div>
              ) : recentBids.length > 0 ? (
                <div className="space-y-4">
                  {recentBids.map((bid) => (
                    <div
                      key={bid._id}
                      onClick={() => navigateWithLoader(`/bid/${bid.auction.blockchainAuctionId}`)}
                      className="bg-primary/5 rounded-xl p-4 border border-primary/10 hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {bid.auction.imageUrls && bid.auction.imageUrls.length > 0 && (
                            <Image
                              unoptimized
                              src={bid.auction.imageUrls[0]}
                              alt={bid.auction.auctionName}
                              width={60}
                              height={60}
                              className="w-15 h-15 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <p className="text-white font-semibold">{bid.auction.auctionName}</p>
                            <p className="text-sm text-gray-400">
                              {new Date(bid.bidTimestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">${bid.usdcValue.toFixed(2)}</p>
                          <p className="text-sm text-gray-400">{bid.bidAmount} {bid.currency}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-6">
                  <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-lg">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "reviews" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              Reviews ({reviews.filter(r => r.auction).length})
            </h2>
            {reviewsLoading ? (
              <div className="bg-white/5 rounded-lg p-8 text-center">
                <RiLoader5Fill className="text-primary animate-spin text-3xl mx-auto" />
                <p className="mt-4 text-caption">Loading reviews...</p>
              </div>
            ) : reviews.filter(r => r.auction).length === 0 ? (
              <div className="bg-white/5 rounded-lg p-8 text-center">
                <p className="text-caption">No reviews yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {reviews.filter(review => review.auction).map((review) => (
                  <ReviewCard
                    key={review._id}
                    rating={review.rating}
                    comment={review.comment}
                    reviewerId={review.reviewer._id}
                    reviewerName={
                      review.reviewer.display_name ||
                      (review.reviewer.username ? `@${review.reviewer.username}` : "Anonymous")
                    }
                    reviewerPfp={review.reviewer.twitterProfile?.profileImageUrl ||
                    review.reviewer.pfp_url ||
                    null}
                    auctionName={review.auction.auctionName}
                    createdAt={review.createdAt}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "active" && (
          <UserAuctions
            activeAuctions={userData.activeAuctions}
            endedAuctions={[]}
          />
        )}

        {activeTab === "ended" && (
          <UserAuctions
            activeAuctions={[]}
            endedAuctions={userData.endedAuctions}
          />
        )}
      </div>
    </div>
  );
}

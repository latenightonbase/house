"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RiLoader5Fill, RiArrowLeftLine, RiUserLine } from "react-icons/ri";
import Heading from "@/components/UI/Heading";
import UserAuctions from "@/components/UserAuctions";
import ReviewCard from "@/components/UI/ReviewCard";
import RatingCircle from "@/components/UI/RatingCircle";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { sdk } from "@farcaster/miniapp-sdk";

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

export default function UserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"reviews" | "active" | "ended">("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

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
    <div className="min-h-screen py-8 max-lg:pt-4">
      <div className="max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-caption hover:text-white transition-colors mb-6"
        >
          <RiArrowLeftLine className="text-xl" />
          <span>Back</span>
        </button>

        {/* User Header */}
        <div className="bg-white/10 rounded-lg shadow-md lg:p-4 p-2 mb-8 border border-white/10">
          <div className="flex items-center gap-4 w-full">
            <div className="flex-1 min-w-0 w-full">
              <div className="w-full flex lg:justify-start mb-4 max-lg:flex-col items-center justify-start gap-2">
                <div className="w-full">
                    <div className="flex items-center gap-2">
                        {/* Profile Picture */}
                {userData.user.pfp_url && (
                <img 
                    src={userData.user.pfp_url} 
                    alt={userData.user.username || 'User'} 
                    className="w-10 h-10 aspect-square rounded-full border-2 border-primary/30"
                />
                )}
                    <Heading size="sm" className="w-full truncate">
                        {userData.user.display_name || (userData.user.username ? `@${userData.user.username}` : 'User Profile')}
                    </Heading>

                    {(userData.user.averageRating ?? 0) > 0 && (userData.user.totalReviews ?? 0) > 0 && (
                        <div className="relative">
                          <RatingCircle
                            rating={userData.user.averageRating}
                            totalReviews={userData.user.totalReviews}
                            size="md"
                            showLabel={false}
                          />
                          {/* <div className="absolute text-sm font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            {userData.user.averageRating}
                          </div> */}
                        </div>
                      )}
                    
                    </div>
                    {userData.user.bio && (
                <p className="text-white/80 text-sm my-3 line-clamp-2 max-lg:text-center">{userData.user.bio}</p>
              )}
              <div className='flex gap-2 w-full items-center justify-center lg:justify-start'>
                {userData.user.x_username && userData.user.platform == "FARCASTER" && (
                <div className="">
                  <a 
                    href={`https://x.com/${userData.user.x_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs bg-white/10 border border-white/20 rounded-md p-2 text-white font-bold transition-colors"
                  >
                    @{userData.user.x_username}
                    <svg 
                      className="w-3 h-3" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
              {userData.user.twitterProfile && userData.user.platform == "TWITTER" && (
                <div className="">
                  <a 
                    href={`https://x.com/${userData.user.twitterProfile.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs bg-white/10 border border-white/20 rounded-md p-2 text-white font-bold transition-colors"
                  >
                    @{userData.user.twitterProfile.username}
                    <svg 
                      className="w-3 h-3" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
                {context && userData.user.fid && userData.user.platform == "FARCASTER" && (
                    <button
                      onClick={handleViewProfile}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/30 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm font-medium"
                    >
                      <RiUserLine className="text-sm" />
                      Profile
                    </button>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-4 w-full">
                  <p className="text-caption text-md">Hosted</p>
                  <p className="text-2xl font-bold text-primary w-full lg:text-right text-right">
                    {userData.activeAuctions.length + userData.endedAuctions.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Buttons */}
        <div className="flex mb-6 overflow-x-hidden gap-2">
          <button
            onClick={() => setActiveTab("reviews")}
            className={`px-4 py-2 font-medium transition-colors capitalize whitespace-nowrap shrink-0 ${
              activeTab === "reviews"
                ? "text-primary border-b-2 border-primary bg-white/5 rounded-md"
                : "text-caption hover:text-foreground"
            }`}
          >
            Reviews
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 font-medium transition-colors capitalize whitespace-nowrap shrink-0 ${
              activeTab === "active"
                ? "text-primary border-b-2 border-primary bg-white/5 rounded-md"
                : "text-caption hover:text-foreground"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab("ended")}
            className={`px-4 py-2 font-medium transition-colors capitalize whitespace-nowrap shrink-0 ${
              activeTab === "ended"
                ? "text-primary border-b-2 border-primary bg-white/5 rounded-md"
                : "text-caption hover:text-foreground"
            }`}
          >
            Ended
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === "reviews" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              Reviews ({reviews.length})
            </h2>
            {reviewsLoading ? (
              <div className="bg-white/5 rounded-lg p-8 text-center">
                <RiLoader5Fill className="text-primary animate-spin text-3xl mx-auto" />
                <p className="mt-4 text-caption">Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="bg-white/5 rounded-lg p-8 text-center">
                <p className="text-caption">No reviews yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {reviews.map((review) => (
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
    </div>
  );
}

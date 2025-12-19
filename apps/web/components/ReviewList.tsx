'use client';

import React, { useEffect, useState } from 'react';
import ReviewCard from '@/components/ReviewCard';
import RatingStars from '@/components/UI/RatingStars';

interface ReviewListProps {
  userId: string;
}

interface Review {
  _id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer?: {
    _id: string;
    username?: string;
    twitterProfile?: {
      username?: string;
      name?: string;
      profileImageUrl?: string;
    };
    wallets?: string[];
  };
  auction?: {
    _id: string;
    auctionName: string;
    endDate: string;
    blockchainAuctionId?: string;
  };
}

interface UserStats {
  id: string;
  username?: string;
  twitterProfile?: any;
  averageRating: number;
  totalReviews: number;
}

const ReviewList: React.FC<ReviewListProps> = ({ userId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/reviews/user/${userId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch reviews');
        }

        setReviews(data.reviews || []);
        setUserStats(data.user || null);
      } catch (err: any) {
        console.error('Error fetching reviews:', err);
        setError(err.message || 'Failed to load reviews');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchReviews();
    }
  }, [userId]);

  if (isLoading) {
    return (
      <div className="w-full p-6 text-center">
        <div className="animate-pulse text-gray-400">Loading reviews...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Rating Summary */}
      {userStats && userStats.totalReviews > 0 && (
        <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">Overall Rating</h3>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-white">
              {userStats.averageRating.toFixed(1)}
            </div>
            <div>
              <RatingStars rating={userStats.averageRating} size="lg" />
              <p className="text-sm text-gray-400 mt-2">
                Based on {userStats.totalReviews} {userStats.totalReviews === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">
          Reviews ({reviews.length})
        </h3>
        
        {reviews.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-lg p-8 text-center">
            <p className="text-gray-400">No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={review._id} review={review} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewList;

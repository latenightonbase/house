'use client';

import React from 'react';
import RatingStars from '@/components/UI/RatingStars';
import { format } from 'date-fns';

interface ReviewCardProps {
  review: {
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
  };
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const getDisplayName = () => {
    if (review.reviewer?.username) {
      return `@${review.reviewer.username}`;
    }
    if (review.reviewer?.twitterProfile?.username) {
      return `@${review.reviewer.twitterProfile.username}`;
    }
    if (review.reviewer?.wallets && review.reviewer.wallets.length > 0) {
      const wallet = review.reviewer.wallets[0];
      return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
    }
    return 'Anonymous';
  };

  const getProfileImage = () => {
    return review.reviewer?.twitterProfile?.profileImageUrl || null;
  };

  return (
    <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-lg p-5 hover:border-white/30 transition-all">
      {/* Reviewer Info */}
      <div className="flex items-start gap-3 mb-4">
        {getProfileImage() ? (
          <img
            src={getProfileImage()!}
            alt={getDisplayName()}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
            {getDisplayName().charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-semibold">{getDisplayName()}</h4>
            <span className="text-xs text-gray-400">
              {format(new Date(review.createdAt), 'MMM dd, yyyy')}
            </span>
          </div>
          {review.auction && (
            <p className="text-xs text-gray-400 mt-1">
              Auction: <span className="text-gray-300">{review.auction.auctionName}</span>
            </p>
          )}
        </div>
      </div>

      {/* Rating */}
      <div className="mb-3">
        <RatingStars rating={review.rating} size="md" />
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-gray-300 text-sm leading-relaxed">{review.comment}</p>
      )}
    </div>
  );
};

export default ReviewCard;

'use client';

import React, { useState } from 'react';

import Input from '@/components/UI/Input';
import { Button } from '@/components/UI/button';
import toast from 'react-hot-toast';
import Heading from './UI/Heading';
import { getAccessToken } from '@privy-io/react-auth';
import RatingStars from './UI/RatingStars';
import { useXPNotification } from '@/utils/providers/xpNotificationContext';

interface ReviewFormProps {
  auctionId: string;
  auctionName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  user: any;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  auctionId,
  auctionName,
  onSuccess,
  onCancel,
  user
}) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { showXPGain, triggerRefresh } = useXPNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (comment.length > 500) {
      toast.error('Comment cannot exceed 500 characters');
      return;
    }

    setIsSubmitting(true);

    const token = await getAccessToken()

    try {
      const response = await fetch('/api/protected/reviews/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-social-id': user?.socialId, // Add social ID header if needed
        },
        body: JSON.stringify({
          auctionId,
          rating,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      // Trigger XP animation if XP was awarded
      if (data.xpAwarded && data.xpAwarded > 0) {
        showXPGain(data.xpAwarded, 'LEAVE_REVIEW');
        triggerRefresh();
      }

      toast.success('Review submitted successfully!');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-black/40 backdrop-blur-md border border-primary/20 rounded-xl">
      <Heading className="text-2xl font-bold mb-2">Leave a Review</Heading>
      <p className="text-gray-400 mb-6">
        Rate your experience with the auction: <span className="text-white font-semibold">{auctionName}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Section */}
        <div>
          <label className="block text-sm font-medium text-white mb-3">
            Your Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-4">
            <RatingStars
              rating={rating}
              editable={true}
              onRatingChange={setRating}
              size="lg"
              className="gap-2"
            />
            {rating > 0 && (
              <span className="text-white text-lg font-semibold">
                {rating} {rating === 1 ? 'Star' : 'Stars'}
              </span>
            )}
          </div>
        </div>

        {/* Comment Section */}
        <div>
          <Input
            label="Your Review (Optional)"
            value={comment}
            onChange={setComment}
            placeholder="Share your experience with this auction host..."
            multiline={true}
            rows={5}
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-400 mt-1">
            {comment.length}/500 characters
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;

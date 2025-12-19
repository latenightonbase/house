'use client';

import React, { useState } from 'react';
import RatingStars from '@/components/UI/RatingStars';
import Input from '@/components/UI/Input';
import { Button } from '@/components/UI/button';
import toast from 'react-hot-toast';

interface ReviewFormProps {
  auctionId: string;
  auctionName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  auctionId,
  auctionName,
  onSuccess,
  onCancel,
}) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

    try {
      const response = await fetch('/api/protected/reviews/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    <div className="w-full max-w-2xl mx-auto p-6 bg-black/40 backdrop-blur-md border border-white/20 rounded-xl">
      <h2 className="text-2xl font-bold text-white mb-2">Leave a Review</h2>
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

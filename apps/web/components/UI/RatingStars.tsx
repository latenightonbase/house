import React from 'react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxRating = 5,
  size = 'md',
  editable = false,
  onRatingChange,
  className,
}) => {
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleClick = (selectedRating: number) => {
    if (editable && onRatingChange) {
      onRatingChange(selectedRating);
    }
  };

  const handleMouseEnter = (selectedRating: number) => {
    if (editable) {
      setHoverRating(selectedRating);
    }
  };

  const handleMouseLeave = () => {
    if (editable) {
      setHoverRating(null);
    }
  };

  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: maxRating }, (_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= displayRating;
        const isPartial = starValue - 0.5 <= displayRating && starValue > displayRating;

        return (
          <div
            key={index}
            className={cn(
              'relative',
              editable && 'cursor-pointer transition-transform hover:scale-110'
            )}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
          >
            {isPartial ? (
              // Partial star (for displaying fractional ratings)
              <svg
                className={cn(sizeClasses[size], 'text-yellow-400')}
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id={`half-${index}`}>
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor="rgb(156 163 175)" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill={`url(#half-${index})`}
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            ) : (
              // Full or empty star
              <svg
                className={cn(
                  sizeClasses[size],
                  isFilled ? 'text-yellow-400' : 'text-gray-400/30'
                )}
                fill={isFilled ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  stroke="currentColor"
                  strokeWidth="1"
                  fill={isFilled ? 'currentColor' : 'none'}
                />
              </svg>
            )}
          </div>
        );
      })}
      {!editable && (
        <span className="ml-1 text-sm text-gray-300">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

export default RatingStars;

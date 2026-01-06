'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  editable?: boolean;
  onRatingChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  editable = false,
  onRatingChange,
  size = 'md',
  className,
}) => {
  const [hoveredRating, setHoveredRating] = React.useState<number>(0);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleClick = (starRating: number) => {
    if (editable && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const handleMouseEnter = (starRating: number) => {
    if (editable) {
      setHoveredRating(starRating);
    }
  };

  const handleMouseLeave = () => {
    if (editable) {
      setHoveredRating(0);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <div className={cn('flex items-center', className)}>
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const isFilled = starIndex <= displayRating;
        
        return (
          <button
            key={starIndex}
            type="button"
            onClick={() => handleClick(starIndex)}
            onMouseEnter={() => handleMouseEnter(starIndex)}
            onMouseLeave={handleMouseLeave}
            disabled={!editable}
            className={cn(
              'transition-all duration-200',
              editable && 'cursor-pointer hover:scale-110',
              !editable && 'cursor-default'
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                'transition-colors duration-200',
                isFilled ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-gray-400'
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

export default RatingStars;

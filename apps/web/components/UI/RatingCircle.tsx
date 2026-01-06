import React from 'react';
import { FaStar } from 'react-icons/fa';

interface RatingCircleProps {
  rating?: number;
  totalReviews?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const RatingCircle: React.FC<RatingCircleProps> = ({
  rating = 0,
  totalReviews = 0,
  size = 'md',
  showLabel = true,
}) => {
  const sizes = {
    sm: { text: 'text-xs', icon: 12, padding: 'px-2 py-1' },
    md: { text: 'text-sm', icon: 14, padding: 'px-3 py-1.5' },
    lg: { text: 'text-base', icon: 16, padding: 'px-4 py-2' },
  };
  
  const { text, icon, padding } = sizes[size];

  const getColorClasses = () => {
    if (rating >= 5) return 'bg-green-500/10 text-green-500';
    if (rating >= 4) return 'bg-green-300/10 text-green-300';
    if (rating >= 3) return 'bg-yellow-500/10 text-yellow-500';
    if (rating >= 2) return 'bg-orange-400/10 text-orange-400';
    return 'bg-red-400/10 text-red-400';
  };

  if (totalReviews && totalReviews > 0) {
    const colorClasses = getColorClasses();
    return (
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 rounded-full ${padding} ${colorClasses}`}>
          <span className={`font-semibold ${text}`}>{rating.toFixed(1)}</span>
          <FaStar size={icon} />
        </div>
        {showLabel && totalReviews !== undefined && totalReviews > 0 && (
          <span className="text-xs text-gray-400">
            ({totalReviews})
          </span>
        )}
      </div>
    );
  }
  return null;
};

export default RatingCircle;

'use client'

import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  setRating?: (rating: number) => void;
  readOnly?: boolean;
}

export default function StarRating({ rating, setRating, readOnly = false }: StarRatingProps) {
  const [hover, setHover] = React.useState(0);

  return (
    <div className="flex space-x-1">
      {[...Array(5)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <button
            type="button"
            key={index}
            className={`transition-colors ${readOnly ? '' : 'cursor-pointer'}`}
            onClick={() => !readOnly && setRating && setRating(ratingValue)}
            onMouseEnter={() => !readOnly && setHover(ratingValue)}
            onMouseLeave={() => !readOnly && setHover(0)}
          >
            <Star
              className={`w-6 h-6 ${
                ratingValue <= (hover || rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-slate-300'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
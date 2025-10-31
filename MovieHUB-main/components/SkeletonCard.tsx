import React from 'react';

const SkeletonCard: React.FC = () => {
  return (
    <div className="movie-card animate-pulse">
      <div className="relative bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        {/* Poster Skeleton */}
        <div className="relative aspect-[2/3] bg-gray-700"></div>

        {/* Movie Info Skeleton */}
        <div className="p-4">
          {/* Title skeleton */}
          <div className="h-6 bg-gray-700 rounded mb-2"></div>
          <div className="h-6 bg-gray-700 rounded w-3/4 mb-3"></div>

          {/* Meta info skeleton */}
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 bg-gray-700 rounded w-20"></div>
            <div className="h-4 bg-gray-700 rounded w-12"></div>
          </div>

          {/* Description skeleton */}
          <div className="space-y-2">
            <div className="h-3 bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;

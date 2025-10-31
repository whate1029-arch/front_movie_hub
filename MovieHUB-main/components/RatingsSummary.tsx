import React from 'react';
import { Star, TrendingUp, Award } from 'lucide-react';
import { OMDbMovie } from '@/types/movie';
import { parseOMDbRatings, getRatingColor, formatVoteCount } from '@/lib/utils';

interface RatingsSummaryProps {
  tmdbRating: number;
  tmdbVoteCount: number;
  omdbData?: OMDbMovie | null;
  className?: string;
}

const RatingsSummary: React.FC<RatingsSummaryProps> = ({
  tmdbRating,
  tmdbVoteCount,
  omdbData,
  className = "",
}) => {
  const ratings = omdbData ? parseOMDbRatings(omdbData.Ratings) : {};

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 ${className}`}>
      <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
        <Award className="h-5 w-5 text-yellow-400" />
        Ratings & Reviews
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TMDB Rating */}
        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="h-5 w-5 text-blue-400 fill-current" />
            <span className="text-gray-400 text-sm font-medium">TMDB</span>
          </div>
          <div className={`text-2xl font-bold ${getRatingColor(tmdbRating)}`}>
            {tmdbRating.toFixed(1)}
          </div>
          <div className="text-gray-400 text-xs mt-1">
            {formatVoteCount(tmdbVoteCount)} votes
          </div>
        </div>

        {/* IMDb Rating */}
        {ratings.imdb && (
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="h-5 w-5 text-yellow-400 fill-current" />
              <span className="text-gray-400 text-sm font-medium">IMDb</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">
              {ratings.imdb}
            </div>
            {omdbData?.imdbVotes && (
              <div className="text-gray-400 text-xs mt-1">
                {omdbData.imdbVotes} votes
              </div>
            )}
          </div>
        )}

        {/* Rotten Tomatoes */}
        {ratings.rottenTomatoes && (
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-red-400" />
              <span className="text-gray-400 text-sm font-medium">Rotten Tomatoes</span>
            </div>
            <div className="text-2xl font-bold text-red-400">
              {ratings.rottenTomatoes}
            </div>
            <div className="text-gray-400 text-xs mt-1">
              Critics Score
            </div>
          </div>
        )}

        {/* Metacritic */}
        {ratings.metacritic && (
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Award className="h-5 w-5 text-green-400" />
              <span className="text-gray-400 text-sm font-medium">Metacritic</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {ratings.metacritic}
            </div>
            <div className="text-gray-400 text-xs mt-1">
              Metascore
            </div>
          </div>
        )}
      </div>

      {/* Additional Info */}
      {omdbData && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {omdbData.Rated && omdbData.Rated !== 'N/A' && (
              <div>
                <span className="text-gray-400">Rated:</span>
                <span className="text-white ml-2 bg-gray-700 px-2 py-1 rounded text-xs">
                  {omdbData.Rated}
                </span>
              </div>
            )}
            {omdbData.Awards && omdbData.Awards !== 'N/A' && (
              <div>
                <span className="text-gray-400">Awards:</span>
                <span className="text-white ml-2">{omdbData.Awards}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RatingsSummary;
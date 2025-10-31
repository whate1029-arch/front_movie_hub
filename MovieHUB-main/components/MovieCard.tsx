import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Calendar } from 'lucide-react';
import { Movie } from '@/types/movie';
import { MovieAPI } from '@/lib/api';
import { formatYear, getRatingBadgeColor, generateSlug, truncateText } from '@/lib/utils';

interface MovieCardProps {
  movie: Movie;
  className?: string;
  priority?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = React.memo(({ movie, className = "", priority = false }) => {
  const posterUrl = MovieAPI.getImageUrl(movie.poster_path, 'w400');
  const movieSlug = generateSlug(movie.title, movie.id);
  const year = formatYear(movie.release_date);
  const rating = movie.vote_average.toFixed(1);

  return (
    <Link href={`/movie/${movieSlug}`}>
      <div className={`movie-card group cursor-pointer ${className}`}>
        <div className="relative bg-gray-800 rounded-lg overflow-hidden shadow-lg">
          {/* Poster Image */}
          <div className="relative aspect-[2/3] overflow-hidden">
            <Image
              src={posterUrl}
              alt={movie.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              priority={priority}
              loading={priority ? undefined : 'lazy'}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABmX/9k="
            />
            
            {/* Rating Badge */}
            <div className={`absolute top-2 right-2 ${getRatingBadgeColor(movie.vote_average)} text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1`}>
              <Star className="h-3 w-3 fill-current" />
              {rating}
            </div>
          </div>

          {/* Movie Info */}
          <div className="p-4">
            <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
              {truncateText(movie.title, 50)}
            </h3>
            
            <div className="flex items-center justify-between text-gray-400 text-sm mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {year}
              </div>
              <div className="text-xs bg-gray-700 px-2 py-1 rounded">
                {movie.original_language.toUpperCase()}
              </div>
            </div>

            <p className="text-gray-300 text-sm line-clamp-3">
              {truncateText(movie.overview, 120)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
});

MovieCard.displayName = 'MovieCard';

export default MovieCard;
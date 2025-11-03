import React from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Globe,
  DollarSign,
  ExternalLink,
  Users
} from 'lucide-react';
import RatingsSummary from '@/components/RatingsSummary';
import { MovieAPI } from '@/lib/api';
import { MovieDetails, Credits, OMDbMovie } from '@/types/movie';
import {
  formatDate,
  formatRuntime,
  formatCurrency,
  extractIdFromSlug,
  getGenreColor,
  truncateText
} from '@/lib/utils';
import { logger } from '@/lib/logger';

interface MoviePageProps {
  movie: MovieDetails;
  credits: Credits;
  omdbData: OMDbMovie | null;
}

const MoviePage: React.FC<MoviePageProps> = ({
  movie,
  credits,
  omdbData,
}) => {
  const backdropUrl = MovieAPI.getBackdropUrl(movie.backdrop_path, 'original');
  const posterUrl = MovieAPI.getImageUrl(movie.poster_path, 'w500');

  const director = credits.crew.find(person => person.job === 'Director');
  const mainCast = credits.cast.slice(0, 8);

  // Replace S3 with S4 for The Witcher movie (ID: 1157013)
  const displayTitle = movie.id === 1157013
    ? movie.title.replace(/S3/g, 'S4')
    : movie.title;

  return (
    <>
      <Head>
        <title>{displayTitle} - MovieHub</title>
        <meta name="description" content={movie.overview} />
        <meta property="og:title" content={displayTitle} />
        <meta property="og:description" content={movie.overview} />
        <meta property="og:image" content={posterUrl} />
      </Head>

      <div className="min-h-screen bg-gray-900">
        {/* Hero Section */}
        <div className="relative min-h-[600px] lg:min-h-[700px]">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src={backdropUrl}
              alt={movie.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-transparent to-gray-900/40" />
          </div>

          {/* Content */}
          <div className="relative container mx-auto px-4 min-h-[600px] lg:min-h-[700px] flex items-end pb-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
              {/* Poster */}
              <div className="lg:col-span-1">
                <div className="relative aspect-[2/3] max-w-sm mx-auto lg:mx-0">
                  <Image
                    src={posterUrl}
                    alt={movie.title}
                    fill
                    className="object-cover rounded-lg shadow-2xl"
                  />
                </div>
              </div>

              {/* Movie Info */}
              <div className="lg:col-span-2 text-white">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-4">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Link>

                <h1 className="text-4xl lg:text-6xl font-bold mb-4">{displayTitle}</h1>
                
                {movie.tagline && (
                  <p className="text-xl text-gray-300 italic mb-6">{movie.tagline}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(movie.release_date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {formatRuntime(movie.runtime)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {movie.original_language.toUpperCase()}
                  </div>
                  {director && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Directed by {director.name}
                    </div>
                  )}
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {movie.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getGenreColor(genre.name)}`}
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>

                <p className="text-lg text-gray-300 leading-relaxed mb-8 max-w-3xl">
                  {movie.overview}
                </p>

                {/* Single Link - To be added in the future */}
                <div className="mb-8">
                  <a
                    href="https://front-movie-hub.vercel.app/sl/rvrpd"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-center transition-colors font-medium"
                  >
                    <ExternalLink className="h-5 w-5" />
                    LINK
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Ratings */}
              <RatingsSummary
                tmdbRating={movie.vote_average}
                tmdbVoteCount={movie.vote_count}
                omdbData={omdbData}
              />

              {/* Cast */}
              {mainCast.length > 0 && (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">Cast</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {mainCast.map((actor) => (
                      <div key={actor.id} className="text-center">
                        <div className="relative aspect-[2/3] mb-2 rounded-lg overflow-hidden bg-gray-700">
                          {actor.profile_path ? (
                            <Image
                              src={MovieAPI.getImageUrl(actor.profile_path, 'w200')}
                              alt={actor.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Users className="h-8 w-8 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <h4 className="text-white font-medium text-sm">
                          {truncateText(actor.name, 20)}
                        </h4>
                        <p className="text-gray-400 text-xs">
                          {truncateText(actor.character, 25)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Movie Facts */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Movie Facts</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className="text-white ml-2">{movie.status}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Budget:</span>
                    <span className="text-white ml-2">
                      {movie.budget ? formatCurrency(movie.budget) : 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Revenue:</span>
                    <span className="text-white ml-2">
                      {movie.revenue ? formatCurrency(movie.revenue) : 'Unknown'}
                    </span>
                  </div>
                  {movie.homepage && (
                    <div>
                      <span className="text-gray-400">Homepage:</span>
                      <a
                        href={movie.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline ml-2"
                      >
                        Official Site
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Production Companies */}
              {movie.production_companies.length > 0 && (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">Production</h3>
                  <div className="space-y-2">
                    {movie.production_companies.slice(0, 5).map((company) => (
                      <div key={company.id} className="text-gray-300 text-sm">
                        {company.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  try {
    const slug = params?.slug as string;
    const movieId = extractIdFromSlug(slug);

    if (!movieId) {
      return { notFound: true };
    }

    const movieData = await MovieAPI.getComprehensiveMovieData(movieId);

    return {
      props: {
        movie: movieData.tmdb,
        credits: movieData.credits,
        omdbData: movieData.omdb,
      },
    };
  } catch (error) {
    logger.error('Error fetching movie data', error);
    return { notFound: true };
  }
};

export default MoviePage;
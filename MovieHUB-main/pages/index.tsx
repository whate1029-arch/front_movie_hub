import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GetStaticProps } from 'next';
import { Film, TrendingUp, Star, Clock } from 'lucide-react';
import Layout from '@/components/Layout';
import SearchBar from '@/components/SearchBar';
import MovieCard from '@/components/MovieCard';
import SkeletonCard from '@/components/SkeletonCard';
import { MovieAPI } from '@/lib/api';
import { Movie } from '@/types/movie';
import { logger } from '@/lib/logger';

interface HomePageProps {
  trendingMovies: Movie[];
  popularMovies: Movie[];
  topRatedMovies: Movie[];
  nowPlayingMovies: Movie[];
}

// Move MovieSection outside to prevent recreation on every render
const MovieSection: React.FC<{
  title: string;
  movies: Movie[];
  icon: React.ReactNode;
  viewAllLink?: string;
}> = React.memo(({ title, movies, icon, viewAllLink }) => (
  <section className="mb-12">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      {viewAllLink && (
        <a
          href={viewAllLink}
          className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
        >
          View All →
        </a>
      )}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {movies.slice(0, 10).map((movie, index) => (
        <MovieCard key={movie.id} movie={movie} priority={index < 5} />
      ))}
    </div>
  </section>
));

MovieSection.displayName = 'MovieSection';

const HomePage: React.FC<HomePageProps> = ({
  trendingMovies,
  popularMovies,
  topRatedMovies,
  nowPlayingMovies,
}) => {
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchCache = useRef<Map<string, Movie[]>>(new Map());
  const activeSearchController = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      activeSearchController.current?.abort();
      activeSearchController.current = null;
    };
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      activeSearchController.current?.abort();
      activeSearchController.current = null;
      return;
    }

    const normalizedQuery = trimmedQuery.toLowerCase();

    if (searchCache.current.has(normalizedQuery)) {
      setSearchResults(searchCache.current.get(normalizedQuery) ?? []);
      setIsSearching(false);
      return;
    }

    activeSearchController.current?.abort();
    const controller = new AbortController();
    activeSearchController.current = controller;

    setIsSearching(true);
    try {
      const results = await MovieAPI.searchMovies(trimmedQuery, 1, {
        signal: controller.signal,
      });

      if (activeSearchController.current !== controller || controller.signal.aborted) {
        return;
      }

      searchCache.current.set(normalizedQuery, results.results);
      setSearchResults(results.results);
    } catch (error) {
      if (activeSearchController.current !== controller || controller.signal.aborted) {
        return;
      }

      const possibleAbortError = error as { name?: string; code?: string } | undefined;
      if (
        possibleAbortError?.name === 'CanceledError' ||
        possibleAbortError?.name === 'AbortError' ||
        possibleAbortError?.code === 'ERR_CANCELED'
      ) {
        return;
      }

      logger.error('Search error', error);
      setSearchResults([]);
    } finally {
      if (activeSearchController.current === controller && !controller.signal.aborted) {
        setIsSearching(false);
        activeSearchController.current = null;
      }
    }
  }, []);

  return (
    <Layout 
      title="MovieHub - Discover Amazing Movies" 
      description="Discover movies with ratings, cast information, and streaming links"
    >
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-900 via-purple-900 to-gray-900 py-20">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Film className="h-12 w-12 text-blue-400" />
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              MovieHub
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Discover amazing movies with comprehensive ratings, cast information, and streaming links
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Search Results */}
        <div className={`transition-all duration-300 ${searchQuery ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          {searchQuery && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">
                {isSearching ? 'Searching...' : `Search Results for "${searchQuery}"`}
              </h2>
              {isSearching ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {searchResults.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">No movies found for &quot;{searchQuery}&quot;</p>
                  <p className="text-gray-500 text-sm mt-2">Try searching with different keywords</p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Movie Sections - Only show if not searching */}
        <div className={`transition-all duration-300 ${!searchQuery ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          {!searchQuery && (
          <>
            <MovieSection
              title="Trending Now"
              movies={trendingMovies}
              icon={<TrendingUp className="h-6 w-6 text-blue-400" />}
              viewAllLink="/trending"
            />

            <MovieSection
              title="Popular Movies"
              movies={popularMovies}
              icon={<Star className="h-6 w-6 text-yellow-400" />}
              viewAllLink="/popular"
            />

            <MovieSection
              title="Top Rated"
              movies={topRatedMovies}
              icon={<Star className="h-6 w-6 text-green-400" />}
              viewAllLink="/top-rated"
            />

            <MovieSection
              title="Now Playing"
              movies={nowPlayingMovies}
              icon={<Clock className="h-6 w-6 text-red-400" />}
            />
          </>
          )}
        </div>
      </div>
    </Layout>
  );
};

// Use ISR (Incremental Static Regeneration) for lightning-fast page loads
export const getStaticProps: GetStaticProps = async () => {
  try {
    const [trending, popular, topRated, nowPlaying] = await Promise.all([
      MovieAPI.getTrendingMovies(),
      MovieAPI.getPopularMovies(),
      MovieAPI.getTopRatedMovies(),
      MovieAPI.getNowPlayingMovies(),
    ]);

    return {
      props: {
        trendingMovies: trending, // getTrendingMovies already returns Movie[]
        popularMovies: popular.results,
        topRatedMovies: topRated.results,
        nowPlayingMovies: nowPlaying.results,
      },
      // Revalidate every 5 minutes (300 seconds) - page served as static HTML, regenerated in background
      revalidate: 300,
    };
  } catch (error) {
    logger.error('Error fetching movies', error);
    return {
      props: {
        trendingMovies: [],
        popularMovies: [],
        topRatedMovies: [],
        nowPlayingMovies: [],
      },
      revalidate: 60, // Retry after 1 minute on error
    };
  }
};

export default HomePage;
import React from 'react';
import { GetServerSideProps } from 'next';
import Layout from '@/components/Layout';
import MovieCard from '@/components/MovieCard';
import { MovieAPI } from '@/lib/api';
import { Movie } from '@/types/movie';
import { TrendingUp } from 'lucide-react';
import { logger } from '@/lib/logger';

interface TrendingPageProps {
  movies: Movie[];
}

const TrendingPage: React.FC<TrendingPageProps> = ({ movies }) => {
  return (
    <Layout title="Trending Movies - MovieHub" description="Discover the most trending movies right now">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="h-8 w-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Trending Movies</h1>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const movies = await MovieAPI.getTrendingMovies();
    return {
      props: {
        movies,
      },
    };
  } catch (error) {
    logger.error('Error fetching trending movies', error);
    return {
      props: {
        movies: [],
      },
    };
  }
};

export default TrendingPage;
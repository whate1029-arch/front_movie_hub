import React from 'react';
import { GetServerSideProps } from 'next';
import Layout from '@/components/Layout';
import MovieCard from '@/components/MovieCard';
import { MovieAPI } from '@/lib/api';
import { Movie } from '@/types/movie';
import { Star } from 'lucide-react';
import { logger } from '@/lib/logger';

interface TopRatedPageProps {
  movies: Movie[];
}

const TopRatedPage: React.FC<TopRatedPageProps> = ({ movies }) => {
  return (
    <Layout title="Top Rated Movies - MovieHub" description="Discover the highest rated movies of all time">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Star className="h-8 w-8 text-yellow-400" />
          <h1 className="text-3xl font-bold text-white">Top Rated Movies</h1>
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
    const response = await MovieAPI.getTopRatedMovies();
    return {
      props: {
        movies: response.results,
      },
    };
  } catch (error) {
    logger.error('Error fetching top rated movies', error);
    return {
      props: {
        movies: [],
      },
    };
  }
};

export default TopRatedPage;
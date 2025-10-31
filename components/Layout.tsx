import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Film, Github, Heart } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title = 'MovieHub - Discover Movies',
  description = 'Discover movies with ratings, cast information, and streaming links'
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-900">
        {/* Navigation Header */}
        <header className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors">
                <Film className="h-8 w-8" />
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  MovieHub
                </span>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/" className="text-gray-300 hover:text-white transition-colors">
                  Home
                </Link>
                <Link href="/trending" className="text-gray-300 hover:text-white transition-colors">
                  Trending
                </Link>
                <Link href="/popular" className="text-gray-300 hover:text-white transition-colors">
                  Popular
                </Link>
                <Link href="/top-rated" className="text-gray-300 hover:text-white transition-colors">
                  Top Rated
                </Link>
              </nav>

              {/* GitHub Link */}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <Github className="h-6 w-6" />
              </a>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="bg-gray-800 border-t border-gray-700 mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* About */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Film className="h-6 w-6 text-blue-400" />
                  <span className="text-lg font-bold text-white">MovieHub</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Discover movies with comprehensive information including ratings, 
                  cast details, and streaming availability.
                </p>
                
                {/* TMDB Attribution - Required by API Terms */}
                <div className="mt-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                  <div className="flex items-center gap-3 mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
                      alt="TMDB Logo"
                      className="h-4"
                    />
                    <span className="text-white text-sm font-medium">Powered by TMDB</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    This product uses the TMDB API but is not endorsed or certified by TMDB.
                    Movie data and images are provided by The Movie Database (TMDB).
                  </p>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="text-white font-semibold mb-4">Quick Links</h3>
                <div className="space-y-2">
                  <Link href="/" className="block text-gray-400 hover:text-white text-sm transition-colors">
                    Home
                  </Link>
                  <Link href="/trending" className="block text-gray-400 hover:text-white text-sm transition-colors">
                    Trending Movies
                  </Link>
                  <Link href="/popular" className="block text-gray-400 hover:text-white text-sm transition-colors">
                    Popular Movies
                  </Link>
                  <Link href="/top-rated" className="block text-gray-400 hover:text-white text-sm transition-colors">
                    Top Rated Movies
                  </Link>
                </div>
              </div>

              {/* Data Sources */}
              <div>
                <h3 className="text-white font-semibold mb-4">Data Sources</h3>
                <div className="space-y-2">
                  <a
                    href="https://www.themoviedb.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    The Movie Database (TMDB)
                  </a>
                  <a
                    href="https://www.omdbapi.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    Open Movie Database (OMDb)
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between">
              <p className="text-gray-400 text-sm">
                © 2024 MovieHub. Built with Next.js and Tailwind CSS.
              </p>
              <div className="flex items-center gap-1 text-gray-400 text-sm mt-2 md:mt-0">
                Made with <Heart className="h-4 w-4 text-red-500" /> for movie lovers
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Layout;
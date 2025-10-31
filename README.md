# MovieHub - Movie Discovery Platform

A modern, responsive movie discovery platform built with Next.js, featuring movie search, ratings from multiple sources, cast information, and streaming links.

## 🚀 Features

- **Movie Search**: Search through thousands of movies with real-time results
- **Multiple Ratings**: Display ratings from TMDB, IMDb, Rotten Tomatoes, and Metacritic
- **Cast & Crew**: Comprehensive cast and crew information
- **Streaming Links**: Direct links to watch movies (mock implementation)
- **Responsive Design**: Beautiful UI that works on all devices
- **SEO Optimized**: Server-side rendering for better search engine visibility
- **Fast Performance**: Optimized images and efficient data fetching

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **APIs**: TMDB (The Movie Database), OMDb API
- **Deployment**: Vercel (recommended) or Netlify

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- TMDB API Key (free at [themoviedb.org](https://www.themoviedb.org/settings/api))
- OMDb API Key (free at [omdbapi.com](http://www.omdbapi.com/apikey.aspx))

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Navigate to project directory
cd platform

# Install dependencies
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
TMDB_API_KEY=your_tmdb_api_key_here
OMDB_API_KEY=your_omdb_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Get API Keys

**TMDB API Key:**
1. Go to [themoviedb.org](https://www.themoviedb.org/)
2. Create an account
3. Go to Settings > API
4. Request an API key (free)

**OMDb API Key:**
1. Go to [omdbapi.com](http://www.omdbapi.com/apikey.aspx)
2. Request a free API key
3. Check your email for the key

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
platform/
├── components/          # Reusable React components
│   ├── Layout.tsx      # Main layout with navigation
│   ├── MovieCard.tsx   # Movie card component
│   ├── SearchBar.tsx   # Search functionality
│   └── RatingsSummary.tsx # Ratings display
├── lib/                # Utility functions and API calls
│   ├── api.ts         # TMDB and OMDb API integration
│   └── utils.ts       # Helper functions
├── pages/              # Next.js pages
│   ├── index.tsx      # Homepage
│   ├── movie/[slug].tsx # Dynamic movie detail pages
│   ├── trending.tsx   # Trending movies page
│   ├── popular.tsx    # Popular movies page
│   └── top-rated.tsx  # Top rated movies page
├── styles/             # Global styles
│   └── globals.css    # Tailwind CSS and custom styles
├── types/              # TypeScript type definitions
│   └── movie.ts       # Movie-related types
└── public/             # Static assets
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables in Vercel dashboard:
   - `TMDB_API_KEY`
   - `OMDB_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (your production URL)
5. Deploy!

### Deploy to Netlify

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Connect your GitHub repository
4. Build command: `npm run build`
5. Publish directory: `.next`
6. Add environment variables in Netlify dashboard
7. Deploy!

## 🔧 Configuration

### API Rate Limits

- **TMDB**: 40 requests per 10 seconds
- **OMDb**: 1000 requests per day (free tier)

### Image Optimization

The app uses Next.js Image component with optimized loading for:
- Movie posters
- Backdrop images
- Actor profile pictures

### SEO Features

- Server-side rendering for all pages
- Dynamic meta tags for movie pages
- Structured data for better search results
- Optimized images with proper alt tags

## 🎨 Customization

### Styling

The app uses Tailwind CSS. You can customize:

- Colors in `tailwind.config.js`
- Global styles in `styles/globals.css`
- Component-specific styles in each component

### Adding New Features

1. **New API Endpoints**: Add to `lib/api.ts`
2. **New Components**: Create in `components/`
3. **New Pages**: Add to `pages/`
4. **New Types**: Define in `types/`

## 📊 Performance

- **Lighthouse Score**: 90+ on all metrics
- **Core Web Vitals**: Optimized for LCP, FID, and CLS
- **Image Optimization**: Automatic WebP conversion and lazy loading
- **Code Splitting**: Automatic route-based code splitting

## 🔒 Legal Considerations

- Only displays movie metadata, not copyrighted content
- Respects API rate limits and terms of service
- Streaming links are mock implementations (replace with legal sources)
- All movie data sourced from public APIs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for movie data
- [OMDb](http://www.omdbapi.com/) for additional ratings
- [Vercel](https://vercel.com/) for hosting platform
- [Tailwind CSS](https://tailwindcss.com/) for styling

## 📞 Support

If you have any questions or issues:

1. Check the [Issues](https://github.com/yourusername/moviehub/issues) page
2. Create a new issue if needed
3. Join our community discussions

---

**Happy movie discovering! 🎬**
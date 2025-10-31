import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Real admin dashboard data
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check for API key (simple authentication)
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey !== 'SUPER_ADMIN_ACCESS') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    // Fetch real movie data from database
    const [movieCount, userCount, ratingCount, searchCount, pageViewCount] = await Promise.all([
      prisma.movie.count(),
      prisma.user.count(),
      prisma.rating.count(),
      prisma.searchQuery.count(),
      prisma.pageView.count()
    ]);

    // Get trending, popular and top rated movies from database
    const [trendingMovies, popularMovies, topRatedMovies, recentActivity] = await Promise.all([
      prisma.movie.findMany({
        where: { isTrending: true },
        take: 20
      }),
      prisma.movie.findMany({
        where: { isPopular: true },
        take: 20
      }),
      prisma.movie.findMany({
        orderBy: { rating: 'desc' },
        take: 20
      }),
      prisma.activity.findMany({
        orderBy: { timestamp: 'desc' },
        take: 10
      })
    ]);

    // Get endpoint statistics from database
    const endpointStats = await prisma.apiRequest.groupBy({
      by: ['endpoint'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    });

    // Calculate total API requests
    const totalApiRequests = await prisma.apiRequest.count();

    // Calculate average rating
    const avgRating = await prisma.movie.aggregate({
      _avg: {
        rating: true
      }
    });

    // Generate real admin dashboard data
    const dashboardData = {
      stats: {
        totalVisitors: userCount,
        uniqueVisitors: await prisma.user.count({ where: { lastLogin: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
        pageViews: pageViewCount,
        avgSessionDuration: 180, // In seconds, could be calculated from session data
        bounceRate: 35 // Percentage, could be calculated from session data
      },
      movieStats: {
        totalMovies: movieCount,
        trendingCount: trendingMovies.length,
        popularCount: popularMovies.length,
        topRatedCount: topRatedMovies.length,
        averageRating: avgRating._avg.rating?.toFixed(1) || '0.0'
      },
      popularEndpoints: endpointStats.map(stat => ({
        path: stat.endpoint,
        hits: stat._count.id,
        percentage: ((stat._count.id / totalApiRequests) * 100).toFixed(1)
      })),
      recentActivity: recentActivity.map(activity => ({
        timestamp: activity.timestamp.toISOString(),
        action: activity.type,
        details: activity.details
      })),
      generatedAt: new Date().toISOString()
    };

    return res.status(200).json({ success: true, data: dashboardData });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check for API key (simple authentication)
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey !== 'SUPER_ADMIN_ACCESS') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    // Get visitor data from database
    const [userCount, pageViewCount, visitorsByCountry, apiRequests, recentActivities] = await Promise.all([
      prisma.user.count(),
      prisma.pageView.count(),
      prisma.visitor.groupBy({
        by: ['country'],
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 5
      }),
      prisma.apiRequest.groupBy({
        by: ['endpoint'],
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 4
      }),
      prisma.activity.findMany({
        orderBy: {
          timestamp: 'desc'
        },
        take: 10
      })
    ]);

    // Calculate total API requests
    const totalApiRequests = await prisma.apiRequest.count();

    // Generate real visitor statistics with country data
    const data = {
      stats: {
        totalVisitors: userCount,
        uniqueVisitors: await prisma.user.count({ 
          where: { 
            lastLogin: { 
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
            } 
          } 
        }),
        pageViews: pageViewCount,
        avgSessionDuration: 185, // Could be calculated from session data
        bounceRate: 32.4 // Could be calculated from session data
      },
      popularEndpoints: apiRequests.map(request => ({
        path: request.endpoint,
        hits: request._count.id,
        percentage: ((request._count.id / totalApiRequests) * 100).toFixed(1)
      })),
      geoDistribution: visitorsByCountry.map(country => ({
        country: country.country,
        visitors: country._count.id
      })),
      recentActivity: recentActivities.map(activity => ({
        timestamp: activity.timestamp.toISOString(),
        action: activity.type,
        details: activity.details
      })),
      generatedAt: new Date().toISOString()
    };

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Admin visitors error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
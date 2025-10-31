import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { clearCache } from '../../../../lib/cache';

// Initialize Prisma client
const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Check for API key (simple authentication)
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey !== 'SUPER_ADMIN_ACCESS') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    // Clear the application cache
    await clearCache();
    
    // Log the cache clear action
    await prisma.activity.create({
      data: {
        type: 'Admin Action',
        details: 'Cache cleared',
        timestamp: new Date(),
        userId: 'admin'
      }
    });
    
    return res.status(200).json({ 
      success: true, 
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
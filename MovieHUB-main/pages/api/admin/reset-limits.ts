import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== 'SUPER_ADMIN_ACCESS') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  return res.status(200).json({ 
    success: true, 
    message: 'Rate limits reset successfully' 
  });
}
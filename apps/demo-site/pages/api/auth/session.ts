import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@aura-sign/next-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = {
      secret: process.env.IRON_SESSION_SECRET || 'default-secret-change-me',
    };

    const session = await getSession(req, res, config);

    res.status(200).json({
      address: session.address || '',
      chainId: session.chainId || 1,
      isAuthenticated: !!session.isAuthenticated,
    });
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
}

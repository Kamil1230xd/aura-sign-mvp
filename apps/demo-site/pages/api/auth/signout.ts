import type { NextApiRequest, NextApiResponse } from 'next';
import { auraAuth, getSession } from '@aura-sign/next-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = {
      secret: process.env.IRON_SESSION_SECRET || 'default-secret-change-me',
    };

    const session = await getSession(req, res, config);
    await auraAuth.signOut(session);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Sign out error:', error);
    res.status(500).json({ error: 'Failed to sign out' });
  }
}

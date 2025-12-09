import type { NextApiRequest, NextApiResponse } from 'next';
import { auraAuth, getSession } from '@aura-sign/next-auth';

interface VerifyRequest {
  message: string;
  signature: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, signature } = req.body as VerifyRequest;

    if (!message || !signature) {
      return res.status(400).json({
        error: 'Message and signature are required',
      });
    }

    const result = await auraAuth.verify({ message, signature });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    // Get session
    const config = {
      secret: process.env.IRON_SESSION_SECRET || 'default-secret-change-me',
    };

    const session = await getSession(req, res, config);

    // Update session with authentication
    await auraAuth.updateSession(session, result.address!, result.chainId!);

    res.status(200).json({
      success: true,
      session: {
        address: result.address,
        chainId: result.chainId,
        isAuthenticated: true,
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
    });
  }
}

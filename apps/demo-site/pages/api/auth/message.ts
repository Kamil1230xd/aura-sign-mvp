import type { NextApiRequest, NextApiResponse } from 'next';
import { auraAuth } from '@aura-sign/next-auth';

interface MessageRequest {
  address: string;
  chainId?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, chainId = 1 } = req.body as MessageRequest;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const domain = req.headers.host || 'localhost:3001';
    const message = await auraAuth.getMessage(domain, address, chainId);

    res.status(200).json({ message });
  } catch (error) {
    console.error('Message generation error:', error);
    res.status(500).json({ error: 'Failed to generate message' });
  }
}

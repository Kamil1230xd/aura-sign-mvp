import type { NextApiRequest, NextApiResponse } from 'next';
import { auraAuth } from '@aura-sign/next-auth';
import { validateMethod, handleApiError } from '../../../lib/api-utils';

interface MessageRequest {
  address: string;
  chainId?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!validateMethod(req, res, ['POST'])) {
    return;
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
    handleApiError(res, error, 'Failed to generate message', 'Message generation error');
  }
}

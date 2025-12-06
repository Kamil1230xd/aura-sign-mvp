import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@aura-sign/next-auth';
import { validateMethod, getSessionConfig, handleApiError } from '../../../lib/api-utils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!validateMethod(req, res, ['GET'])) {
    return;
  }

  try {
    const config = getSessionConfig();
    const session = await getSession(req as any, res as any, config);

    res.status(200).json({
      address: session.address || '',
      chainId: session.chainId || 1,
      isAuthenticated: !!session.isAuthenticated,
    });
  } catch (error) {
    handleApiError(res, error, 'Failed to get session', 'Session error');
  }
}

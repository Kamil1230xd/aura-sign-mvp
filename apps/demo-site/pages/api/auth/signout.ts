import type { NextApiRequest, NextApiResponse } from 'next';
import { auraAuth, getSession } from '@aura-sign/next-auth';
import { validateMethod, getSessionConfig, handleApiError } from '../../../lib/apiUtils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!validateMethod(req, res, 'POST')) return;

  try {
    const config = getSessionConfig();
    const session = await getSession(req as any, res as any, config);
    await auraAuth.signOut(session);

    res.status(200).json({ success: true });
  } catch (error) {
    handleApiError(res, error, 'Sign out error');
  }
}

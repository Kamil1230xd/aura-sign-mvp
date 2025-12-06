import type { NextApiRequest, NextApiResponse } from 'next';
import type { AuthConfig } from '@aura-sign/next-auth';

/**
 * HTTP method validation middleware
 */
export function validateMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedMethods: string[]
): boolean {
  if (!allowedMethods.includes(req.method || '')) {
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
}

/**
 * Get session config from environment
 */
export function getSessionConfig(): AuthConfig {
  return {
    secret: process.env.IRON_SESSION_SECRET || 'default-secret-change-me',
  };
}

/**
 * Standard error response handler
 */
export function handleApiError(
  res: NextApiResponse,
  error: unknown,
  message: string,
  logPrefix: string
): void {
  console.error(`${logPrefix}:`, error);
  res.status(500).json({ error: message });
}

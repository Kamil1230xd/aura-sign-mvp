import type { NextApiRequest, NextApiResponse } from 'next';
import type { AuthConfig } from '@aura-sign/next-auth';

/**
 * Validates that the request method matches the expected method.
 * Returns true if valid, false if invalid (and sends 405 response).
 */
export function validateMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  expectedMethod: string
): boolean {
  if (req.method !== expectedMethod) {
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
}

/**
 * Gets the session configuration from environment variables.
 */
export function getSessionConfig(): AuthConfig {
  return {
    secret: process.env.IRON_SESSION_SECRET || 'default-secret-change-me',
  };
}

/**
 * Handles API errors with consistent error logging and response format.
 */
export function handleApiError(
  res: NextApiResponse,
  error: unknown,
  context: string
): void {
  console.error(`${context}:`, error);
  const errorMessage = error instanceof Error ? error.message : 'Internal server error';
  res.status(500).json({ error: errorMessage });
}

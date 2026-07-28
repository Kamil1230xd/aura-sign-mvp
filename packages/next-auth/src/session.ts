// License: BSL 1.1. Commercial use prohibited. See .github/LICENSES/LICENSE_CORE.md
import { getIronSession } from 'iron-session';
import type { IncomingMessage, ServerResponse } from 'http';
import type { NextRequest, NextResponse } from 'next/server';
import type { AuraSession, AuraSessionData, AuthConfig } from './types';

const defaultConfig: Partial<AuthConfig> = {
  cookieName: 'aura-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60, // 24 hours
    sameSite: 'lax',
  },
};

// Overload signatures
export async function getSession(
  req: NextRequest,
  res: NextResponse,
  config: AuthConfig
): Promise<AuraSession>;
export async function getSession(
  req: IncomingMessage,
  res: ServerResponse,
  config: AuthConfig
): Promise<AuraSession>;

// Implementation
export async function getSession(
  req: NextRequest | IncomingMessage,
  res: NextResponse | ServerResponse,
  config: AuthConfig
): Promise<AuraSession> {
  const sessionConfig = {
    password: config.secret,
    cookieName: config.cookieName || defaultConfig.cookieName!,
    cookieOptions: {
      ...defaultConfig.cookieOptions,
      ...config.cookieOptions,
    },
  };

  const session = await getIronSession<AuraSessionData>(req, res, sessionConfig);

  if (!session.isAuthenticated) {
    session.isAuthenticated = false;
    session.address = '';
    session.chainId = 1;
  }

  return session;
}

// Overload signatures for destroySession
export async function destroySession(
  req: NextRequest,
  res: NextResponse,
  config: AuthConfig
): Promise<void>;
export async function destroySession(
  req: IncomingMessage,
  res: ServerResponse,
  config: AuthConfig
): Promise<void>;

// Implementation
export async function destroySession(
  req: NextRequest | IncomingMessage,
  res: NextResponse | ServerResponse,
  config: AuthConfig
): Promise<void> {
  const session = await getSession(req as NextRequest, res as NextResponse, config);
  session.destroy();
}

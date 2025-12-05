// License: BSL 1.1. Commercial use prohibited. See .github/LICENSES/LICENSE_CORE.md
import { getIronSession } from 'iron-session';
import type { NextRequest, NextResponse } from 'next/server';
import type { AuraSession, AuthConfig } from './types';

const defaultConfig: Partial<AuthConfig> = {
  cookieName: 'aura-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60, // 24 hours
    sameSite: 'lax',
  },
};

export async function getSession(
  req: NextRequest,
  res: NextResponse,
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

  const session = await getIronSession<AuraSession>(req, res, sessionConfig);

  if (!session.isAuthenticated) {
    session.isAuthenticated = false;
    session.address = '';
    session.chainId = 1;
  }

  return session;
}

export async function destroySession(
  req: NextRequest,
  res: NextResponse,
  config: AuthConfig
): Promise<void> {
  const session = await getSession(req, res, config);
  session.destroy();
}

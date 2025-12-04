import type { IronSession } from 'iron-session';

export interface AuraSessionData {
  address: string;
  chainId: number;
  isAuthenticated: boolean;
  nonce?: string;
}

export type AuraSession = IronSession<AuraSessionData>;

export interface AuthConfig {
  secret: string;
  cookieName?: string;
  cookieOptions?: {
    secure?: boolean;
    httpOnly?: boolean;
    maxAge?: number;
    sameSite?: 'strict' | 'lax' | 'none';
  };
}

export interface SignInRequest {
  message: string;
  signature: string;
}

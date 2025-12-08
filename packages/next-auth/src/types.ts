// License: BSL 1.1. Commercial use prohibited. See .github/LICENSES/LICENSE_CORE.md
export interface AuraSession {
  address: string;
  chainId: number;
  isAuthenticated: boolean;
  nonce?: string;
}

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

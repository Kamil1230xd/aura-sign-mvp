// License: MIT. See .github/LICENSES/LICENSE_SDK.md
export interface AuraSession {
  address: string;
  chainId: number;
  isAuthenticated: boolean;
}

export interface SignInRequest {
  message: string;
  signature: string;
}

export interface AuraClientConfig {
  baseUrl: string;
  timeout?: number;
}

export interface AuthResponse {
  success: boolean;
  session?: AuraSession;
  error?: string;
}

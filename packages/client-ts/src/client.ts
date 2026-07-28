// License: MIT. See .github/LICENSES/LICENSE_SDK.md
import type { AuraClientConfig, SignInRequest, AuraSession, AuthResponse } from './types';

export class AuraClient {
  private config: Required<AuraClientConfig>;

  constructor(config: AuraClientConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      timeout: config.timeout || 10000,
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getMessage(address: string, chainId: number = 1): Promise<string> {
    const response = await this.request<{ message: string }>('/api/auth/message', {
      method: 'POST',
      body: JSON.stringify({ address, chainId }),
    });
    return response.message;
  }

  async verify(signInRequest: SignInRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify(signInRequest),
    });
  }

  async getSession(): Promise<AuraSession | null> {
    try {
      const session = await this.request<AuraSession>('/api/auth/session');
      return session.isAuthenticated ? session : null;
    } catch {
      return null;
    }
  }

  async signOut(): Promise<void> {
    await this.request('/api/auth/signout', {
      method: 'POST',
    });
  }
}

// License: MIT. See .github/LICENSES/LICENSE_SDK.md
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuraClient } from './client';

// Mock fetch
global.fetch = vi.fn();

describe('AuraClient', () => {
  let client: AuraClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new AuraClient({
      baseUrl: 'http://localhost:3000',
      timeout: 5000,
    });
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(client).toBeInstanceOf(AuraClient);
    });

    it('should use default timeout if not provided', () => {
      const defaultClient = new AuraClient({
        baseUrl: 'http://localhost:3000',
      });
      expect(defaultClient).toBeInstanceOf(AuraClient);
    });
  });

  describe('getMessage', () => {
    it('should fetch sign-in message for an address', async () => {
      const mockResponse = { message: 'Sign this message' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.getMessage('0x123', 1);

      expect(result).toBe('Sign this message');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/message',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ address: '0x123', chainId: 1 }),
        })
      );
    });

    it('should use chainId 1 as default', async () => {
      const mockResponse = { message: 'Sign this message' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await client.getMessage('0x123');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/message',
        expect.objectContaining({
          body: JSON.stringify({ address: '0x123', chainId: 1 }),
        })
      );
    });

    it('should throw error on failed request', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(client.getMessage('0x123')).rejects.toThrow('HTTP error! status: 500');
    });
  });

  describe('verify', () => {
    it('should verify signature and return auth response', async () => {
      const mockResponse = {
        success: true,
        session: {
          address: '0x123',
          chainId: 1,
          isAuthenticated: true,
        },
      };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const signInRequest = {
        message: 'Sign this message',
        signature: '0xsignature',
      };

      const result = await client.verify(signInRequest);

      expect(result.success).toBe(true);
      expect(result.session?.address).toBe('0x123');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/verify',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(signInRequest),
        })
      );
    });

    it('should handle verification failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid signature',
      };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const signInRequest = {
        message: 'Sign this message',
        signature: '0xbadsignature',
      };

      const result = await client.verify(signInRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });
  });

  describe('getSession', () => {
    it('should return session when authenticated', async () => {
      const mockSession = {
        address: '0x123',
        chainId: 1,
        isAuthenticated: true,
      };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      } as Response);

      const result = await client.getSession();

      expect(result).toEqual(mockSession);
    });

    it('should return null when not authenticated', async () => {
      const mockSession = {
        address: '',
        chainId: 0,
        isAuthenticated: false,
      };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      } as Response);

      const result = await client.getSession();

      expect(result).toBeNull();
    });

    it('should return null on request error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getSession();

      expect(result).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should call signout endpoint', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await client.signOut();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/signout',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('timeout handling', () => {
    it('should abort request after timeout', async () => {
      const slowClient = new AuraClient({
        baseUrl: 'http://localhost:3000',
        timeout: 100,
      });

      // Mock a slow response
      vi.mocked(fetch).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true } as Response), 200))
      );

      await expect(slowClient.getMessage('0x123')).rejects.toThrow();
    });
  });
});

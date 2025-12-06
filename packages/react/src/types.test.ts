// License: MIT. See .github/LICENSES/LICENSE_SDK.md
import { describe, it, expect } from 'vitest';
import type { AuraUser, AuthState, UseAuraUserReturn } from './types';

describe('React Types', () => {
  describe('AuthState', () => {
    it('should allow valid auth states', () => {
      const states: AuthState[] = [
        'disconnected',
        'connecting',
        'connected',
        'signing',
        'authenticated',
        'error'
      ];

      expect(states).toHaveLength(6);
      expect(states).toContain('disconnected');
      expect(states).toContain('authenticated');
    });
  });

  describe('AuraUser', () => {
    it('should have required session fields', () => {
      const user: AuraUser = {
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1,
        isAuthenticated: true
      };

      expect(user.address).toBeDefined();
      expect(user.chainId).toBeDefined();
      expect(user.isAuthenticated).toBeDefined();
    });

    it('should support optional fields', () => {
      const user: AuraUser = {
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1,
        isAuthenticated: true,
        ensName: 'vitalik.eth',
        avatar: 'https://example.com/avatar.png'
      };

      expect(user.ensName).toBe('vitalik.eth');
      expect(user.avatar).toBe('https://example.com/avatar.png');
    });
  });

  describe('UseAuraUserReturn', () => {
    it('should have all required properties', () => {
      const mockReturn: UseAuraUserReturn = {
        user: null,
        state: 'disconnected',
        error: null,
        signIn: async () => {},
        signOut: async () => {},
        isLoading: false,
        isAuthenticated: false
      };

      expect(mockReturn).toHaveProperty('user');
      expect(mockReturn).toHaveProperty('state');
      expect(mockReturn).toHaveProperty('error');
      expect(mockReturn).toHaveProperty('signIn');
      expect(mockReturn).toHaveProperty('signOut');
      expect(mockReturn).toHaveProperty('isLoading');
      expect(mockReturn).toHaveProperty('isAuthenticated');
    });

    it('should handle authenticated state', () => {
      const user: AuraUser = {
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1,
        isAuthenticated: true
      };

      const mockReturn: UseAuraUserReturn = {
        user,
        state: 'authenticated',
        error: null,
        signIn: async () => {},
        signOut: async () => {},
        isLoading: false,
        isAuthenticated: true
      };

      expect(mockReturn.user).toBe(user);
      expect(mockReturn.state).toBe('authenticated');
      expect(mockReturn.isAuthenticated).toBe(true);
    });

    it('should handle loading states', () => {
      const mockReturn: UseAuraUserReturn = {
        user: null,
        state: 'connecting',
        error: null,
        signIn: async () => {},
        signOut: async () => {},
        isLoading: true,
        isAuthenticated: false
      };

      expect(mockReturn.state).toBe('connecting');
      expect(mockReturn.isLoading).toBe(true);
    });

    it('should handle error state', () => {
      const mockReturn: UseAuraUserReturn = {
        user: null,
        state: 'error',
        error: 'Connection failed',
        signIn: async () => {},
        signOut: async () => {},
        isLoading: false,
        isAuthenticated: false
      };

      expect(mockReturn.state).toBe('error');
      expect(mockReturn.error).toBe('Connection failed');
    });
  });
});

// License: MIT. See .github/LICENSES/LICENSE_SDK.md
import { useState, useEffect, useCallback } from 'react';
import { AuraClient } from '@aura-sign/client';
import { ethers } from 'ethers';
import type { AuraUser, AuthState, UseAuraUserReturn } from '../types';

const client = new AuraClient({ baseUrl: '' });

export function useAuraUser(): UseAuraUserReturn {
  const [user, setUser] = useState<AuraUser | null>(null);
  const [state, setState] = useState<AuthState>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Initialize session check
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const session = await client.getSession();
      if (session) {
        setUser(session);
        setState('authenticated');
      }
    } catch (err) {
      console.error('Session check failed:', err);
    }
  };

  const signIn = useCallback(async () => {
    try {
      setError(null);
      setState('connecting');

      // Check for ethereum provider
      // Use globalThis instead of window for SSR/Deno compatibility where window may not be defined.
      // Type assertion used to avoid global type modifications (consider adding ethereum property
      // to global.d.ts interface declarations in future PR).
      const ethereum = (globalThis as any).ethereum;
      if (!ethereum) {
        throw new Error('Ethereum provider not available');
      }

      const provider = new ethers.BrowserProvider(ethereum);
      
      // Request account access
      await ethereum.request({
        method: 'eth_requestAccounts'
      });

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      setState('connected');
      setState('signing');

      // Get message to sign
      const message = await client.getMessage(address, chainId);
      
      // Sign message
      const signature = await signer.signMessage(message);

      // Verify signature
      const result = await client.verify({ message, signature });

      if (result.success && result.session) {
        setUser(result.session);
        setState('authenticated');
      } else {
        throw new Error(result.error || 'Authentication failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      setState('error');
      setTimeout(() => setState('disconnected'), 3000);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await client.signOut();
      setUser(null);
      setState('disconnected');
      setError(null);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  }, []);

  return {
    user,
    state,
    error,
    signIn,
    signOut,
    isLoading: ['connecting', 'signing'].includes(state),
    isAuthenticated: state === 'authenticated',
  };
}

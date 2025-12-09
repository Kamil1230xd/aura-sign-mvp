// License: MIT. See .github/LICENSES/LICENSE_SDK.md
import type { AuraSession } from '@aura-sign/client';

export interface AuraUser extends AuraSession {
  ensName?: string;
  avatar?: string;
}

export type AuthState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'signing'
  | 'authenticated'
  | 'error';

export interface UseAuraUserReturn {
  user: AuraUser | null;
  state: AuthState;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

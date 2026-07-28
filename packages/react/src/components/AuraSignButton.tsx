// License: MIT. See .github/LICENSES/LICENSE_SDK.md
import React from 'react';
import { useAuraUser } from '../hooks/useAuraUser';
import type { AuthState } from '../types';

interface AuraSignButtonProps {
  className?: string;
  children?: {
    disconnected?: React.ReactNode;
    connecting?: React.ReactNode;
    connected?: React.ReactNode;
    signing?: React.ReactNode;
    authenticated?: React.ReactNode;
    error?: React.ReactNode;
  };
}

const defaultContent = {
  disconnected: 'Sign In with Ethereum',
  connecting: 'Connecting...',
  connected: 'Connected to Wallet',
  signing: 'Sign Message...',
  authenticated: 'Signed In',
  error: 'Error - Try Again',
};

export function AuraSignButton({ className = '', children }: AuraSignButtonProps) {
  const { user, state, error, signIn, signOut, isLoading, isAuthenticated } = useAuraUser();

  const getButtonContent = (state: AuthState) => {
    if (children?.[state]) {
      return children[state];
    }
    return defaultContent[state];
  };

  const getButtonProps = () => {
    const baseClasses = `
      px-6 py-3 rounded-lg font-medium transition-all duration-200 
      focus:outline-none focus:ring-2 focus:ring-offset-2
    `;

    switch (state) {
      case 'disconnected':
        return {
          onClick: signIn,
          disabled: false,
          className: `${baseClasses} bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 ${className}`,
        };

      case 'connecting':
      case 'signing':
        return {
          onClick: undefined,
          disabled: true,
          className: `${baseClasses} bg-blue-400 text-white cursor-not-allowed ${className}`,
        };

      case 'connected':
        return {
          onClick: signIn,
          disabled: false,
          className: `${baseClasses} bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 ${className}`,
        };

      case 'authenticated':
        return {
          onClick: signOut,
          disabled: false,
          className: `${baseClasses} bg-green-600 hover:bg-red-600 text-white focus:ring-green-500 ${className}`,
        };

      case 'error':
        return {
          onClick: signIn,
          disabled: false,
          className: `${baseClasses} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 ${className}`,
        };

      default:
        return {
          onClick: signIn,
          disabled: false,
          className: `${baseClasses} bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500 ${className}`,
        };
    }
  };

  const buttonProps = getButtonProps();

  return (
    <div className="flex flex-col items-center space-y-2">
      <button {...buttonProps}>{getButtonContent(state)}</button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isAuthenticated && user && (
        <div className="text-sm text-gray-600">
          <p>
            Connected: {user.address.slice(0, 6)}...{user.address.slice(-4)}
          </p>
          <p>Chain ID: {user.chainId}</p>
        </div>
      )}
    </div>
  );
}

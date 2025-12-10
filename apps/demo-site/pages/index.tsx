import React from 'react';
import { AuraSignButton } from '@aura-sign/react';
import { useAuraUser } from '@aura-sign/react';

export default function HomePage() {
  const { user, isAuthenticated } = useAuraUser();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Aura-Sign Demo</h1>
          <p className="text-gray-600 mb-8">Sign in with your Ethereum wallet using SIWE</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <AuraSignButton className="w-full" />

          {isAuthenticated && user && (
            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-medium text-gray-900">Welcome!</h3>
              <div className="text-sm text-gray-600">
                <p>Address: {user.address}</p>
                <p>Chain ID: {user.chainId}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Powered by{' '}
            <a
              href="https://github.com/your-org/aura-sign-mvp"
              className="text-blue-600 hover:text-blue-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              Aura-Sign MVP
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

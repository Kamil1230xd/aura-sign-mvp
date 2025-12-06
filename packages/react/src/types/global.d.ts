// License: MIT. See .github/LICENSES/LICENSE_SDK.md

/**
 * Global type declarations for EIP-1193 ethereum provider.
 * This allows ethereum to be accessed via globalThis for SSR and Deno compatibility.
 */

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (eventName: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (eventName: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface WindowEventMap {
    ethereum: EthereumProvider;
  }
  
  var ethereum: EthereumProvider | undefined;
}

export {};

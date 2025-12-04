declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

interface EthereumProvider {
  request(args: {
    method: 'eth_requestAccounts';
  }): Promise<string[]>;
  request(args: {
    method: 'eth_accounts';
  }): Promise<string[]>;
  request(args: {
    method: 'eth_chainId';
  }): Promise<string>;
  request(args: {
    method: 'eth_sendTransaction';
    params: unknown[];
  }): Promise<string>;
  request(args: {
    method: 'personal_sign';
    params: unknown[];
  }): Promise<string>;
  request(args: {
    method: string;
    params?: unknown[];
  }): Promise<unknown>;
  on?(event: 'accountsChanged', callback: (accounts: string[]) => void): void;
  on?(event: 'chainChanged', callback: (chainId: string) => void): void;
  on?(event: 'disconnect', callback: () => void): void;
  on?(event: string, callback: (...args: unknown[]) => void): void;
  removeListener?(event: string, callback: (...args: unknown[]) => void): void;
}

export {};

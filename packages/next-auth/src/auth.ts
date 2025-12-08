// License: BSL 1.1. Commercial use prohibited. See .github/LICENSES/LICENSE_CORE.md
import { SiweMessage } from 'siwe';
import { ethers } from 'ethers';
import type { AuraSession, SignInRequest } from './types';

export class AuraAuth {
  private generateNonce(): string {
    return ethers.hexlify(ethers.randomBytes(16));
  }

  async getMessage(domain: string, address: string, chainId: number = 1): Promise<string> {
    const nonce = this.generateNonce();
    
    const message = new SiweMessage({
      domain,
      address,
      statement: 'Sign in with Ethereum to Aura-Sign',
      uri: `https://${domain}`,
      version: '1',
      chainId,
      nonce,
      issuedAt: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    });

    return message.prepareMessage();
  }

  async verify(request: SignInRequest): Promise<{
    success: boolean;
    address?: string;
    chainId?: number;
    error?: string;
  }> {
    try {
      const message = new SiweMessage(request.message);
      const fields = await message.verify({
        signature: request.signature,
        domain: message.domain,
        nonce: message.nonce,
      });

      if (!fields.success) {
        return { success: false, error: 'Invalid signature' };
      }

      // Check expiration
      if (message.expirationTime && new Date(message.expirationTime) < new Date()) {
        return { success: false, error: 'Message expired' };
      }

      return {
        success: true,
        address: message.address,
        chainId: message.chainId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  async updateSession(
    session: AuraSession,
    address: string,
    chainId: number
  ): Promise<void> {
    session.address = address;
    session.chainId = chainId;
    session.isAuthenticated = true;
    session.nonce = undefined;
    await session.save();
  }

  async signOut(session: AuraSession): Promise<void> {
    session.destroy();
  }
}

export const auraAuth = new AuraAuth();

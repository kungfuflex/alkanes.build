/**
 * Type declarations for @alkanes/ts-sdk
 * This allows the build to succeed even when ts-sdk isn't built yet
 */

declare module '@alkanes/ts-sdk' {
  export interface WalletConfig {
    network?: string;
    mnemonic?: string;
  }

  export interface Keystore {
    mnemonic: string;
    masterFingerprint: string;
    accountXpub: string;
    hdPaths: Record<string, any>;
    network: string;
    createdAt: number;
  }

  export interface AddressInfo {
    address: string;
    path: string;
    publicKey: string;
  }

  export interface AlkanesWallet {
    deriveAddress(type: 'p2wpkh' | 'p2tr', index: number, change: number): AddressInfo;
    signPsbt(psbtBase64: string): string;
    signMessage(message: string, addressType: number, index: number): string;
  }

  export function createKeystore(
    password: string,
    config?: WalletConfig,
    wordCount?: 12 | 15 | 18 | 21 | 24
  ): Promise<{ keystore: string; mnemonic: string }>;

  export function unlockKeystore(
    keystoreJson: string,
    password: string
  ): Promise<Keystore>;

  export function createWallet(keystore: Keystore): Promise<AlkanesWallet>;

  export class KeystoreManager {
    validateMnemonic(mnemonic: string): boolean;
    createKeystore(mnemonic: string, config: WalletConfig): Keystore;
    exportKeystore(
      keystore: Keystore,
      password: string,
      options?: { pretty?: boolean }
    ): Promise<string | object>;
  }

  export class AlkanesProvider {
    constructor(config: {
      version: string;
      network: any;
      networkType: string;
      url: string;
      projectId: string;
    });
    getAlkaneBalance(
      address: string,
      alkaneId: { block: number; tx: number }
    ): Promise<any>;
  }
}

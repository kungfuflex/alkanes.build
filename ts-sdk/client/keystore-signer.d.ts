/**
 * Keystore Signer Implementation
 *
 * Signs transactions using an in-memory keystore (HD wallet).
 * This is the "hot wallet" approach - keys are derived from a mnemonic.
 *
 * @example
 * ```typescript
 * // Create from mnemonic
 * const signer = KeystoreSigner.fromMnemonic(mnemonic, 'mainnet');
 *
 * // Create from encrypted keystore
 * const signer = await KeystoreSigner.fromEncrypted(keystoreJson, password);
 *
 * // Sign a PSBT
 * const signed = await signer.signPsbt(psbtHex);
 * ```
 */
import { AlkanesSigner, SignerAccount, SignPsbtOptions, SignMessageOptions, SignedPsbt } from './signer';
import { Keystore, NetworkType } from '../types';
import { AddressType } from '../wallet';
/**
 * Keystore signer configuration
 */
export interface KeystoreSignerConfig {
    /** Network type */
    network: NetworkType;
    /** Primary address type (default: P2WPKH) */
    addressType?: AddressType;
    /** Account index for HD derivation */
    accountIndex?: number;
    /** Address index for HD derivation */
    addressIndex?: number;
}
/**
 * Keystore-based signer implementation
 */
export declare class KeystoreSigner extends AlkanesSigner {
    readonly network: NetworkType;
    private readonly mnemonic;
    private readonly root;
    private readonly bitcoinNetwork;
    private readonly addressType;
    private readonly accountIndex;
    private readonly addressIndex;
    private cachedAccount?;
    private constructor();
    /**
     * Create signer from mnemonic phrase
     */
    static fromMnemonic(mnemonic: string, config: KeystoreSignerConfig): KeystoreSigner;
    /**
     * Create signer from encrypted keystore JSON
     */
    static fromEncrypted(keystoreJson: string, password: string, config?: Partial<KeystoreSignerConfig>): Promise<KeystoreSigner>;
    /**
     * Create signer from Keystore object
     */
    static fromKeystore(keystore: Keystore, config?: Partial<KeystoreSignerConfig>): KeystoreSigner;
    /**
     * Generate a new keystore signer with a fresh mnemonic
     */
    static generate(config: KeystoreSignerConfig, wordCount?: 12 | 24): KeystoreSigner;
    getSignerType(): string;
    isConnected(): Promise<boolean>;
    disconnect(): Promise<void>;
    getAccount(): Promise<SignerAccount>;
    getAddress(): Promise<string>;
    getPublicKey(): Promise<string>;
    signMessage(message: string, options?: SignMessageOptions): Promise<string>;
    signPsbt(psbt: string, options?: SignPsbtOptions): Promise<SignedPsbt>;
    signPsbts(psbts: string[], options?: SignPsbtOptions): Promise<SignedPsbt[]>;
    /**
     * Export the mnemonic (use with caution!)
     */
    exportMnemonic(): string;
    /**
     * Export to encrypted keystore JSON
     */
    exportToKeystore(password: string): Promise<string>;
    /**
     * Derive address at specific path
     */
    deriveAddress(addressType?: AddressType, index?: number, change?: number): string;
    /**
     * Get full address info including path
     */
    getAddressInfo(type: 'p2wpkh' | 'p2tr' | 'p2pkh' | 'p2sh', index?: number, change?: number): {
        address: string;
        publicKey: string;
        path: string;
    } | null;
    /**
     * Get multiple addresses
     */
    getAddresses(count?: number, addressType?: AddressType): Array<{
        address: string;
        index: number;
    }>;
    private getDerivationPath;
    private deriveAddressInfo;
    private getSigningNode;
    private signAllInputs;
    private getTaprootSigner;
}
//# sourceMappingURL=keystore-signer.d.ts.map
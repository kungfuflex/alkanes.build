/**
 * Signer Interface for Alkanes SDK
 *
 * Following ethers.js pattern, a Signer represents an entity that can sign
 * transactions and messages. It does NOT make blockchain calls directly -
 * that's the Provider's job.
 *
 * This separation allows:
 * - Same signer to work with different networks/providers
 * - Easy testing with mock signers
 * - Clear separation of concerns
 *
 * @example
 * ```typescript
 * // Using keystore signer
 * const signer = await KeystoreSigner.fromEncrypted(keystoreJson, password);
 *
 * // Using browser wallet signer
 * const signer = await BrowserWalletSigner.connect('unisat');
 *
 * // Both can connect to any provider
 * const client = signer.connect(provider);
 * ```
 */
import * as bitcoin from 'bitcoinjs-lib';
import { NetworkType } from '../types';
/**
 * PSBT signing options
 */
export interface SignPsbtOptions {
    /** Whether to finalize inputs after signing */
    finalize?: boolean;
    /** Specific inputs to sign (signs all by default) */
    inputsToSign?: Array<{
        index: number;
        address?: string;
        sighashTypes?: number[];
        publicKey?: string;
    }>;
    /** Whether to extract transaction after finalizing */
    extractTx?: boolean;
}
/**
 * Message signing options
 */
export interface SignMessageOptions {
    /** Signing protocol */
    protocol?: 'ecdsa' | 'bip322' | 'bip322-simple';
    /** Address to use for signing (if signer has multiple) */
    address?: string;
}
/**
 * Signer account information
 */
export interface SignerAccount {
    /** Primary address (ordinals/taproot address for wallets that have both) */
    address: string;
    /** Public key (hex encoded) */
    publicKey: string;
    /** Payment address (for wallets with separate payment address) */
    paymentAddress?: string;
    /** Payment public key */
    paymentPublicKey?: string;
    /** Address type (p2wpkh, p2tr, p2pkh, etc.) */
    addressType: string;
}
/**
 * Signed PSBT result
 */
export interface SignedPsbt {
    /** Signed PSBT in hex format */
    psbtHex: string;
    /** Signed PSBT in base64 format */
    psbtBase64: string;
    /** Extracted transaction hex (if extractTx was true and PSBT was finalized) */
    txHex?: string;
}
/**
 * Abstract Signer interface
 *
 * All signer implementations must implement these methods.
 * Signers are responsible ONLY for signing - they don't broadcast
 * or interact with the blockchain directly.
 */
export declare abstract class AlkanesSigner {
    /** Network this signer is configured for */
    abstract readonly network: NetworkType;
    /**
     * Get the signer's account information
     */
    abstract getAccount(): Promise<SignerAccount>;
    /**
     * Get the primary address
     */
    abstract getAddress(): Promise<string>;
    /**
     * Get the public key (hex encoded)
     */
    abstract getPublicKey(): Promise<string>;
    /**
     * Sign a message
     *
     * @param message - Message to sign
     * @param options - Signing options
     * @returns Signature (base64 encoded)
     */
    abstract signMessage(message: string, options?: SignMessageOptions): Promise<string>;
    /**
     * Sign a PSBT
     *
     * @param psbt - PSBT in hex or base64 format
     * @param options - Signing options
     * @returns Signed PSBT
     */
    abstract signPsbt(psbt: string, options?: SignPsbtOptions): Promise<SignedPsbt>;
    /**
     * Sign multiple PSBTs
     *
     * @param psbts - Array of PSBTs in hex or base64 format
     * @param options - Signing options (applied to all)
     * @returns Array of signed PSBTs
     */
    abstract signPsbts(psbts: string[], options?: SignPsbtOptions): Promise<SignedPsbt[]>;
    /**
     * Check if the signer is connected/available
     */
    abstract isConnected(): Promise<boolean>;
    /**
     * Disconnect the signer (for browser wallets)
     */
    abstract disconnect(): Promise<void>;
    /**
     * Get the signer type identifier
     */
    abstract getSignerType(): string;
    /**
     * Parse PSBT from hex or base64
     */
    protected parsePsbt(psbt: string): bitcoin.Psbt;
    /**
     * Get bitcoinjs network object
     */
    protected getBitcoinNetwork(network: NetworkType): bitcoin.Network;
    /**
     * Convert PSBT to both hex and base64 formats
     */
    protected formatSignedPsbt(psbt: bitcoin.Psbt, options?: SignPsbtOptions): SignedPsbt;
}
/**
 * Signer events for browser wallets
 */
export type SignerEventType = 'accountsChanged' | 'networkChanged' | 'disconnect';
export interface SignerEvents {
    on(event: SignerEventType, callback: (...args: any[]) => void): void;
    off(event: SignerEventType, callback: (...args: any[]) => void): void;
}
/**
 * Extended signer interface for browser wallets that support events
 */
export declare abstract class EventEmittingSigner extends AlkanesSigner implements SignerEvents {
    protected listeners: Map<SignerEventType, Set<(...args: any[]) => void>>;
    on(event: SignerEventType, callback: (...args: any[]) => void): void;
    off(event: SignerEventType, callback: (...args: any[]) => void): void;
    protected emit(event: SignerEventType, ...args: any[]): void;
}
//# sourceMappingURL=signer.d.ts.map
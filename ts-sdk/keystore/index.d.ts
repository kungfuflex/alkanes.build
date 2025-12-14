/**
 * Keystore management for Alkanes SDK
 *
 * Provides ethers.js-style keystore encryption/decryption with password protection.
 * Compatible with the WASM keystore implementation in alkanes-web-sys.
 */
import { Keystore, EncryptedKeystore, WalletConfig, ExportOptions, ImportOptions } from '../types';
type AlkanesWasm = any;
/**
 * Standard BIP44 derivation paths
 */
export declare const DERIVATION_PATHS: {
    readonly BIP44: "m/44'/0'/0'/0";
    readonly BIP49: "m/49'/0'/0'/0";
    readonly BIP84: "m/84'/0'/0'/0";
    readonly BIP86: "m/86'/0'/0'/0";
};
/**
 * Keystore manager class
 *
 * Manages wallet mnemonics with encryption compatible with ethers.js format.
 * Can be used standalone or integrated with WASM backend.
 */
export declare class KeystoreManager {
    private wasm?;
    constructor(wasmModule?: AlkanesWasm);
    /**
     * Generate a new mnemonic phrase
     *
     * @param wordCount - Number of words (12, 15, 18, 21, or 24)
     * @returns BIP39 mnemonic phrase
     */
    generateMnemonic(wordCount?: 12 | 15 | 18 | 21 | 24): string;
    /**
     * Validate a mnemonic phrase
     *
     * @param mnemonic - BIP39 mnemonic to validate
     * @returns true if valid
     */
    validateMnemonic(mnemonic: string): boolean;
    /**
     * Create a new keystore from mnemonic
     *
     * @param mnemonic - BIP39 mnemonic phrase
     * @param config - Wallet configuration
     * @returns Decrypted keystore object
     */
    createKeystore(mnemonic: string, config: WalletConfig): Keystore;
    /**
     * Export keystore to encrypted JSON (ethers.js compatible)
     *
     * @param keystore - Decrypted keystore object
     * @param password - Encryption password
     * @param options - Export options
     * @returns Encrypted keystore JSON
     */
    exportKeystore(keystore: Keystore, password: string, options?: ExportOptions): Promise<string | EncryptedKeystore>;
    /**
     * Import keystore from encrypted JSON (ethers.js compatible)
     *
     * @param json - Encrypted keystore JSON string or object
     * @param password - Decryption password
     * @param options - Import options
     * @returns Decrypted keystore object
     */
    importKeystore(json: string | EncryptedKeystore, password: string, options?: ImportOptions): Promise<Keystore>;
    /**
     * Export using WASM backend (delegates to alkanes-web-sys)
     */
    private exportKeystoreWasm;
    /**
     * Import using WASM backend (delegates to alkanes-web-sys)
     */
    private importKeystoreWasm;
    /**
     * Pure JS encryption implementation (fallback)
     */
    private exportKeystoreJS;
    /**
     * Pure JS decryption implementation (fallback)
     */
    private importKeystoreJS;
    private getNetwork;
    private parsePath;
    private serializeHdPaths;
    private deserializeHdPaths;
    private isValidEncryptedKeystore;
    private getCrypto;
    private bufferToHex;
    private hexToBuffer;
}
/**
 * Convenience function to create a new keystore
 */
export declare function createKeystore(password: string, config?: WalletConfig, wordCount?: 12 | 15 | 18 | 21 | 24): Promise<{
    keystore: string;
    mnemonic: string;
}>;
/**
 * Convenience function to unlock an encrypted keystore
 */
export declare function unlockKeystore(keystoreJson: string, password: string): Promise<Keystore>;
export {};
//# sourceMappingURL=index.d.ts.map
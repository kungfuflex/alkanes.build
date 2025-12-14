/**
 * Browser Wallet Signer Implementation
 *
 * Signs transactions using browser extension wallets (Unisat, Xverse, etc.).
 * This bridges the browser wallet APIs to the unified Signer interface.
 *
 * @example
 * ```typescript
 * // Connect to specific wallet
 * const signer = await BrowserWalletSigner.connect('unisat');
 *
 * // Connect to any available wallet (user chooses)
 * const signer = await BrowserWalletSigner.connectAny();
 *
 * // Listen for account changes
 * signer.on('accountsChanged', (accounts) => {
 *   console.log('Account changed:', accounts);
 * });
 * ```
 */
import { EventEmittingSigner, SignerAccount, SignPsbtOptions, SignMessageOptions, SignedPsbt } from './signer';
import { NetworkType } from '../types';
import { ConnectedWallet, BrowserWalletInfo, JsWalletAdapter } from '../browser-wallets';
/**
 * Browser wallet signer configuration
 */
export interface BrowserWalletSignerConfig {
    /** Whether to auto-reconnect on page load */
    autoReconnect?: boolean;
    /** Preferred address type */
    preferredAddressType?: 'payment' | 'ordinals' | 'both';
}
/**
 * Wallet selection result
 */
export interface WalletSelection {
    walletId: string;
    walletName: string;
    walletInfo: BrowserWalletInfo;
}
/**
 * Browser wallet signer implementation
 */
export declare class BrowserWalletSigner extends EventEmittingSigner {
    readonly network: NetworkType;
    private wallet;
    private adapter;
    private config;
    private eventCleanup?;
    private constructor();
    /**
     * Get list of available (installed) wallets
     */
    static getAvailableWallets(): Promise<BrowserWalletInfo[]>;
    /**
     * Get list of all supported wallets (installed or not)
     */
    static getSupportedWallets(): BrowserWalletInfo[];
    /**
     * Check if a specific wallet is installed
     */
    static isWalletInstalled(walletId: string): boolean;
    /**
     * Connect to a specific wallet by ID
     *
     * @param walletId - Wallet identifier (e.g., 'unisat', 'xverse')
     * @param config - Signer configuration
     * @returns Connected BrowserWalletSigner
     */
    static connect(walletId: string, config?: BrowserWalletSignerConfig): Promise<BrowserWalletSigner>;
    /**
     * Connect to any available wallet
     * Returns the first available wallet or throws if none found
     */
    static connectAny(config?: BrowserWalletSignerConfig): Promise<BrowserWalletSigner>;
    /**
     * Connect using a pre-connected wallet
     */
    static fromConnectedWallet(wallet: ConnectedWallet, config?: BrowserWalletSignerConfig): BrowserWalletSigner;
    getSignerType(): string;
    /**
     * Get the underlying wallet info
     */
    getWalletInfo(): BrowserWalletInfo;
    /**
     * Get the underlying wallet adapter (for WASM integration)
     */
    getAdapter(): JsWalletAdapter;
    isConnected(): Promise<boolean>;
    disconnect(): Promise<void>;
    getAccount(): Promise<SignerAccount>;
    getAddress(): Promise<string>;
    getPublicKey(): Promise<string>;
    signMessage(message: string, options?: SignMessageOptions): Promise<string>;
    signPsbt(psbt: string, options?: SignPsbtOptions): Promise<SignedPsbt>;
    signPsbts(psbts: string[], options?: SignPsbtOptions): Promise<SignedPsbt[]>;
    /**
     * Push a transaction to the network (if wallet supports it)
     */
    pushTransaction(txHex: string): Promise<string>;
    /**
     * Push a signed PSBT to the network (if wallet supports it)
     */
    pushPsbt(psbtHex: string): Promise<string>;
    /**
     * Get wallet balance (if wallet supports it)
     */
    getBalance(): Promise<number | null>;
    /**
     * Get inscriptions (if wallet supports it)
     */
    getInscriptions(cursor?: number, size?: number): Promise<any>;
    /**
     * Switch network (if wallet supports it)
     */
    switchNetwork(network: NetworkType): Promise<void>;
    private isHex;
    private setupEventListeners;
    private getInjectedWallet;
}
/**
 * Helper to create a wallet selection UI
 * Returns info needed to build a wallet picker
 */
export declare function getWalletOptions(): Promise<Array<{
    id: string;
    name: string;
    icon: string;
    installed: boolean;
    info: BrowserWalletInfo;
}>>;
//# sourceMappingURL=browser-wallet-signer.d.ts.map
/**
 * Browser Wallet Detection and Connection
 *
 * Provides detection and connection to injected Bitcoin browser wallets
 * (Unisat, Xverse, Phantom, OKX, Leather, Magic Eden, Wizz, etc.)
 *
 * @example
 * ```typescript
 * import { WalletConnector, BROWSER_WALLETS } from '@alkanes/ts-sdk';
 *
 * const connector = new WalletConnector();
 * const available = await connector.detectWallets();
 *
 * if (available.length > 0) {
 *   const wallet = await connector.connect(available[0]);
 *   console.log('Connected:', wallet.address);
 * }
 * ```
 */
/**
 * Information about a supported browser wallet
 */
export interface BrowserWalletInfo {
    id: string;
    name: string;
    icon: string;
    website: string;
    injectionKey: string;
    supportsPsbt: boolean;
    supportsTaproot: boolean;
    supportsOrdinals: boolean;
    mobileSupport: boolean;
    deepLinkScheme?: string;
}
/**
 * Connected wallet account information
 */
export interface WalletAccount {
    address: string;
    publicKey?: string;
    addressType?: string;
}
/**
 * PSBT signing options
 */
export interface PsbtSigningOptions {
    autoFinalized?: boolean;
    toSignInputs?: Array<{
        index: number;
        address?: string;
        sighashTypes?: number[];
        disableTweakedPublicKey?: boolean;
    }>;
}
/**
 * List of supported browser wallets
 */
export declare const BROWSER_WALLETS: BrowserWalletInfo[];
/**
 * Check if running in browser environment
 */
export declare function isBrowser(): boolean;
/**
 * Check if a specific wallet is installed
 */
export declare function isWalletInstalled(wallet: BrowserWalletInfo): boolean;
/**
 * Get all installed wallets
 */
export declare function getInstalledWallets(): BrowserWalletInfo[];
/**
 * Get wallet info by ID
 */
export declare function getWalletById(id: string): BrowserWalletInfo | undefined;
/**
 * Connected browser wallet instance
 */
export declare class ConnectedWallet {
    private provider;
    readonly info: BrowserWalletInfo;
    readonly account: WalletAccount;
    constructor(info: BrowserWalletInfo, provider: any, account: WalletAccount);
    /**
     * Get the wallet's address
     */
    get address(): string;
    /**
     * Get the wallet's public key (if available)
     */
    get publicKey(): string | undefined;
    /**
     * Sign a message
     */
    signMessage(message: string): Promise<string>;
    /**
     * Sign a PSBT
     */
    signPsbt(psbtHex: string, options?: PsbtSigningOptions): Promise<string>;
    /**
     * Get current network
     */
    getNetwork(): Promise<string>;
    /**
     * Disconnect from the wallet
     */
    disconnect(): Promise<void>;
}
/**
 * Wallet connector for detecting and connecting to browser wallets
 */
export declare class WalletConnector {
    private connectedWallet;
    /**
     * Get all supported wallets (static)
     */
    static getSupportedWallets(): BrowserWalletInfo[];
    /**
     * Get wallet info by ID
     */
    getWalletInfo(walletId: string): BrowserWalletInfo | undefined;
    /**
     * Check if a specific wallet is installed
     */
    isWalletInstalled(walletId: string): boolean;
    /**
     * Detect all installed wallets
     */
    detectWallets(): Promise<BrowserWalletInfo[]>;
    /**
     * Connect to a specific wallet
     */
    connect(wallet: BrowserWalletInfo): Promise<ConnectedWallet>;
    /**
     * Get currently connected wallet
     */
    getConnectedWallet(): ConnectedWallet | null;
    /**
     * Disconnect current wallet
     */
    disconnect(): Promise<void>;
    /**
     * Check if a wallet is connected
     */
    isConnected(): boolean;
}
export { createWalletAdapter, MockWalletAdapter, BaseWalletAdapter, UnisatAdapter, XverseAdapter, OkxAdapter, LeatherAdapter, PhantomAdapter, MagicEdenAdapter, WizzAdapter, } from './adapter';
export type { JsWalletAdapter, WalletInfoForWasm, WalletAccountForWasm, PsbtSigningOptionsForWasm, } from './adapter';
export { WALLET_ICONS, getWalletIcon } from './icons';
//# sourceMappingURL=index.d.ts.map
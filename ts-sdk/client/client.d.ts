/**
 * AlkanesClient - Unified Client combining Provider + Signer
 *
 * Following the ethers.js pattern, AlkanesClient combines:
 * - Provider: Read-only blockchain access (balance queries, tx lookup, etc.)
 * - Signer: Transaction signing capability
 *
 * This separation allows:
 * - Using a read-only provider without a signer
 * - Swapping signers while keeping the same provider
 * - Easy testing with mock signers
 *
 * @example
 * ```typescript
 * // Create client with browser wallet
 * const signer = await BrowserWalletSigner.connect('unisat');
 * const client = new AlkanesClient(provider, signer);
 *
 * // Or use the convenience methods
 * const client = await AlkanesClient.withBrowserWallet('unisat', 'mainnet');
 * const client = await AlkanesClient.withKeystore(keystoreJson, password, 'mainnet');
 *
 * // Now use unified interface
 * const address = await client.getAddress();
 * const balance = await client.getBalance();
 * const txid = await client.sendTransaction(psbt);
 * ```
 */
import { AlkanesProvider } from '../provider';
import { AlkanesSigner, SignPsbtOptions, SignMessageOptions, SignedPsbt, SignerAccount } from './signer';
import { KeystoreSignerConfig } from './keystore-signer';
import { BrowserWalletSignerConfig } from './browser-wallet-signer';
import { NetworkType, AlkaneId, AlkaneBalance, UTXO, Keystore } from '../types';
/**
 * Transaction result after broadcast
 */
export interface TransactionResult {
    /** Transaction ID */
    txid: string;
    /** Raw transaction hex */
    rawTx: string;
    /** Whether the transaction was broadcast */
    broadcast: boolean;
}
/**
 * Balance summary
 */
export interface BalanceSummary {
    /** Total confirmed balance in satoshis */
    confirmed: number;
    /** Total unconfirmed balance in satoshis */
    unconfirmed: number;
    /** Total balance */
    total: number;
    /** UTXOs */
    utxos: UTXO[];
}
/**
 * Enriched balance including alkane tokens
 */
export interface EnrichedBalance extends BalanceSummary {
    /** Alkane token balances */
    alkanes: AlkaneBalance[];
}
/**
 * AlkanesClient - Combines Provider + Signer for full wallet functionality
 */
export declare class AlkanesClient {
    readonly provider: AlkanesProvider;
    readonly signer: AlkanesSigner;
    constructor(provider: AlkanesProvider, signer: AlkanesSigner);
    /**
     * Create client with a browser wallet signer
     *
     * @param walletId - Wallet to connect to (e.g., 'unisat', 'xverse')
     * @param network - Network to use (default: autodetect from wallet)
     */
    static withBrowserWallet(walletId: string, network?: string, signerConfig?: BrowserWalletSignerConfig): Promise<AlkanesClient>;
    /**
     * Create client with any available browser wallet
     */
    static withAnyBrowserWallet(network?: string, signerConfig?: BrowserWalletSignerConfig): Promise<AlkanesClient>;
    /**
     * Create client with an encrypted keystore
     *
     * @param keystoreJson - Encrypted keystore JSON
     * @param password - Decryption password
     * @param network - Network to use
     */
    static withKeystore(keystoreJson: string, password: string, network?: string, signerConfig?: Partial<KeystoreSignerConfig>): Promise<AlkanesClient>;
    /**
     * Create client with a mnemonic phrase
     *
     * @param mnemonic - BIP39 mnemonic phrase
     * @param network - Network to use
     */
    static withMnemonic(mnemonic: string, network?: string, signerConfig?: Partial<KeystoreSignerConfig>): AlkanesClient;
    /**
     * Create client with a Keystore object
     */
    static fromKeystore(keystore: Keystore, network?: string, signerConfig?: Partial<KeystoreSignerConfig>): AlkanesClient;
    /**
     * Generate a new wallet with fresh mnemonic
     */
    static generate(network?: string, wordCount?: 12 | 24, signerConfig?: Partial<KeystoreSignerConfig>): AlkanesClient;
    /**
     * Initialize the provider (required before blockchain operations)
     */
    initialize(): Promise<void>;
    /**
     * Check if connected and ready
     */
    isReady(): Promise<boolean>;
    /**
     * Get the primary address
     */
    getAddress(): Promise<string>;
    /**
     * Get the public key
     */
    getPublicKey(): Promise<string>;
    /**
     * Get full account info
     */
    getAccount(): Promise<SignerAccount>;
    /**
     * Get the signer type
     */
    getSignerType(): string;
    /**
     * Get the network type
     */
    getNetwork(): NetworkType;
    /**
     * Get BTC balance for the current address
     */
    getBalance(address?: string): Promise<BalanceSummary>;
    /**
     * Get enriched balances (BTC + alkanes) for the current address
     */
    getEnrichedBalances(address?: string): Promise<any>;
    /**
     * Get alkane token balances for the current address
     */
    getAlkaneBalances(address?: string): Promise<AlkaneBalance[]>;
    /**
     * Get UTXOs for the current address
     */
    getUtxos(address?: string): Promise<UTXO[]>;
    /**
     * Sign a message
     */
    signMessage(message: string, options?: SignMessageOptions): Promise<string>;
    /**
     * Sign a PSBT
     */
    signPsbt(psbt: string, options?: SignPsbtOptions): Promise<SignedPsbt>;
    /**
     * Sign multiple PSBTs
     */
    signPsbts(psbts: string[], options?: SignPsbtOptions): Promise<SignedPsbt[]>;
    /**
     * Sign and broadcast a PSBT
     *
     * @param psbt - PSBT in hex or base64 format
     * @param options - Signing options
     * @returns Transaction result with txid
     */
    sendTransaction(psbt: string, options?: SignPsbtOptions): Promise<TransactionResult>;
    /**
     * Sign a PSBT without broadcasting (returns signed hex)
     */
    signTransaction(psbt: string, options?: SignPsbtOptions): Promise<SignedPsbt>;
    /**
     * Broadcast a raw transaction
     */
    broadcastTransaction(txHex: string): Promise<string>;
    /**
     * Get current block height
     */
    getBlockHeight(): Promise<number>;
    /**
     * Get transaction history for the current address
     */
    getTransactionHistory(address?: string): Promise<any[]>;
    /**
     * Get transaction history with alkane traces
     */
    getTransactionHistoryWithTraces(address?: string): Promise<any[]>;
    /**
     * Get alkane token details
     */
    getAlkaneTokenDetails(alkaneId: AlkaneId): Promise<any>;
    /**
     * Simulate an alkanes contract call
     */
    simulateAlkanes(contractId: string, calldata: number[]): Promise<any>;
    /**
     * Get all AMM pools
     */
    getPools(factoryId: string): Promise<any[]>;
    /**
     * Get pool reserves
     */
    getPoolReserves(poolId: string): Promise<any>;
    /**
     * Get pool trade history
     */
    getPoolTrades(poolId: string, limit?: number): Promise<any[]>;
    /**
     * Get pool candle data
     */
    getPoolCandles(poolId: string, interval?: string, limit?: number): Promise<any[]>;
    /**
     * Get Bitcoin price in USD
     */
    getBitcoinPrice(): Promise<number>;
    /**
     * Disconnect the signer
     */
    disconnect(): Promise<void>;
    /**
     * Get underlying provider sub-clients
     */
    get bitcoin(): import("../provider").BitcoinRpcClient;
    get esplora(): import("../provider").EsploraClient;
    get alkanes(): import("../provider").AlkanesRpcClient;
    get dataApi(): import("../provider").DataApiClient;
    get lua(): import("../provider").LuaClient;
    get metashrew(): import("../provider").MetashrewClient;
}
/**
 * Wallet connection options for UI
 */
export interface WalletOption {
    id: string;
    name: string;
    icon: string;
    installed: boolean;
}
/**
 * Get available wallet options for building a wallet picker UI
 */
export declare function getAvailableWallets(): Promise<WalletOption[]>;
/**
 * Connect to a wallet and create an AlkanesClient
 *
 * This is the main entry point for "Connect Wallet" button functionality.
 *
 * @param walletId - ID of wallet to connect (e.g., 'unisat', 'xverse')
 * @param network - Optional network override (autodetects from wallet if not provided)
 */
export declare function connectWallet(walletId: string, network?: string): Promise<AlkanesClient>;
/**
 * Connect to any available wallet
 */
export declare function connectAnyWallet(network?: string): Promise<AlkanesClient>;
/**
 * Create a read-only provider (no signer)
 *
 * Use this when you only need to read blockchain data without signing.
 */
export declare function createReadOnlyProvider(network?: string): AlkanesProvider;
//# sourceMappingURL=client.d.ts.map
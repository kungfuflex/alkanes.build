/**
 * @alkanes/ts-sdk
 *
 * TypeScript SDK for Alkanes - Bitcoin smart contracts
 *
 * This SDK provides:
 * - Wallet management with HD derivation (BIP32/44/84/86)
 * - Keystore encryption (ethers.js compatible)
 * - PSBT creation and signing
 * - Provider integration (@oyl/sdk compatible)
 * - Alkanes contract interaction
 * - WASM backend integration (alkanes-web-sys)
 *
 * @example
 * ```typescript
 * import { createKeystore, unlockKeystore, createWallet, createProvider } from '@alkanes/ts-sdk';
 *
 * // Create a new wallet
 * const { keystore, mnemonic } = await createKeystore('password123');
 * console.log('Save this mnemonic:', mnemonic);
 *
 * // Later, unlock the keystore
 * const unlockedKeystore = await unlockKeystore(keystore, 'password123');
 * const wallet = createWallet(unlockedKeystore);
 *
 * // Get addresses
 * const address = wallet.getReceivingAddress(0);
 * console.log('Address:', address);
 *
 * // Create provider
 * const provider = createProvider({
 *   url: 'https://api.example.com',
 *   network: bitcoin.networks.bitcoin,
 *   networkType: 'mainnet',
 * });
 *
 * // Get balance
 * const balance = await provider.getBalance(address);
 * console.log('Balance:', balance);
 * ```
 */
export { KeystoreManager, DERIVATION_PATHS, createKeystore, unlockKeystore, } from './keystore';
export { AlkanesWallet, AddressType, createWallet, createWalletFromMnemonic, } from './wallet';
export { AlkanesProvider, BitcoinRpcClient, EsploraClient, AlkanesRpcClient, MetashrewClient, DataApiClient, LuaClient, createProvider, NETWORK_PRESETS, } from './provider';
export type { AlkanesProviderConfig, PoolDetails, PoolWithDetails, TradeInfo, CandleInfo, HolderInfo, ExecuteResult, LuaEvalResult, } from './provider';
export type { NetworkType, HDPath, KeystoreParams, EncryptedKeystore, Keystore, WalletConfig, AddressInfo, TxInput, TxOutput, PsbtOptions, AlkaneId, AlkaneBalance, AlkaneCallParams, ProviderConfig, TransactionResult, BlockInfo, UTXO, AddressBalance, ExportOptions, ImportOptions, } from './types';
export { getNetwork, validateAddress, satoshisToBTC, btcToSatoshis, formatAlkaneId, parseAlkaneId, delay, retry, calculateFee, estimateTxSize, hexToBytes, bytesToHex, reverseBytes, reversedHex, isBrowser, isNode, safeJsonParse, formatTimestamp, calculateWeight, weightToVsize, } from './utils';
export { WalletConnector, ConnectedWallet, BROWSER_WALLETS, isWalletInstalled, getInstalledWallets, getWalletById, createWalletAdapter, MockWalletAdapter, BaseWalletAdapter, UnisatAdapter, XverseAdapter, OkxAdapter, LeatherAdapter, PhantomAdapter, MagicEdenAdapter, WizzAdapter, } from './browser-wallets';
export type { BrowserWalletInfo, WalletAccount, PsbtSigningOptions, JsWalletAdapter, WalletInfoForWasm, WalletAccountForWasm, PsbtSigningOptionsForWasm, } from './browser-wallets';
export { AlkanesClient, AlkanesSigner, KeystoreSigner, BrowserWalletSigner, EventEmittingSigner, connectWallet, connectAnyWallet, getAvailableWallets, createReadOnlyProvider, getWalletOptions, } from './client';
export type { SignPsbtOptions, SignMessageOptions, SignerAccount, SignedPsbt, SignerEventType, SignerEvents, KeystoreSignerConfig, BrowserWalletSignerConfig, WalletSelection, TransactionResult, BalanceSummary, EnrichedBalance, WalletOption, } from './client';
export { KeystoreStorage, GoogleDriveBackup, formatBackupDate, getRelativeTime, } from './storage';
export type { WalletBackupInfo, RestoreWalletResult, } from './storage';
export declare const VERSION = "0.1.0";
/**
 * Initialize the SDK with WASM module
 *
 * @example
 * ```typescript
 * import { initSDK } from '@alkanes/ts-sdk';
 *
 * const sdk = await initSDK();
 * ```
 */
export declare function initSDK(): Promise<{
    KeystoreManager: typeof import("./keystore").KeystoreManager;
    createKeystore: typeof import("./keystore").createKeystore;
    unlockKeystore: typeof import("./keystore").unlockKeystore;
    AlkanesWallet: typeof import("./wallet").AlkanesWallet;
    createWallet: typeof import("./wallet").createWallet;
    createWalletFromMnemonic: typeof import("./wallet").createWalletFromMnemonic;
    AlkanesProvider: typeof import("./provider").AlkanesProvider;
    createProvider: typeof import("./provider").createProvider;
    WalletConnector: typeof import("./browser-wallets").WalletConnector;
    ConnectedWallet: typeof import("./browser-wallets").ConnectedWallet;
    BROWSER_WALLETS: import("./browser-wallets").BrowserWalletInfo[];
    isWalletInstalled: typeof import("./browser-wallets").isWalletInstalled;
    getInstalledWallets: typeof import("./browser-wallets").getInstalledWallets;
    createWalletAdapter: typeof import("./browser-wallets").createWalletAdapter;
    MockWalletAdapter: typeof import("./browser-wallets").MockWalletAdapter;
    BaseWalletAdapter: typeof import("./browser-wallets").BaseWalletAdapter;
    UnisatAdapter: typeof import("./browser-wallets").UnisatAdapter;
    XverseAdapter: typeof import("./browser-wallets").XverseAdapter;
    OkxAdapter: typeof import("./browser-wallets").OkxAdapter;
    LeatherAdapter: typeof import("./browser-wallets").LeatherAdapter;
    PhantomAdapter: typeof import("./browser-wallets").PhantomAdapter;
    MagicEdenAdapter: typeof import("./browser-wallets").MagicEdenAdapter;
    WizzAdapter: typeof import("./browser-wallets").WizzAdapter;
    KeystoreStorage: typeof import("./storage").KeystoreStorage;
    GoogleDriveBackup: typeof import("./storage").GoogleDriveBackup;
    version: string;
}>;
export default function getAlkanesSDK(): Promise<{
    KeystoreManager: typeof import("./keystore").KeystoreManager;
    createKeystore: typeof import("./keystore").createKeystore;
    unlockKeystore: typeof import("./keystore").unlockKeystore;
    AlkanesWallet: typeof import("./wallet").AlkanesWallet;
    createWallet: typeof import("./wallet").createWallet;
    createWalletFromMnemonic: typeof import("./wallet").createWalletFromMnemonic;
    AlkanesProvider: typeof import("./provider").AlkanesProvider;
    createProvider: typeof import("./provider").createProvider;
    WalletConnector: typeof import("./browser-wallets").WalletConnector;
    ConnectedWallet: typeof import("./browser-wallets").ConnectedWallet;
    BROWSER_WALLETS: import("./browser-wallets").BrowserWalletInfo[];
    isWalletInstalled: typeof import("./browser-wallets").isWalletInstalled;
    getInstalledWallets: typeof import("./browser-wallets").getInstalledWallets;
    createWalletAdapter: typeof import("./browser-wallets").createWalletAdapter;
    MockWalletAdapter: typeof import("./browser-wallets").MockWalletAdapter;
    BaseWalletAdapter: typeof import("./browser-wallets").BaseWalletAdapter;
    UnisatAdapter: typeof import("./browser-wallets").UnisatAdapter;
    XverseAdapter: typeof import("./browser-wallets").XverseAdapter;
    OkxAdapter: typeof import("./browser-wallets").OkxAdapter;
    LeatherAdapter: typeof import("./browser-wallets").LeatherAdapter;
    PhantomAdapter: typeof import("./browser-wallets").PhantomAdapter;
    MagicEdenAdapter: typeof import("./browser-wallets").MagicEdenAdapter;
    WizzAdapter: typeof import("./browser-wallets").WizzAdapter;
    KeystoreStorage: typeof import("./storage").KeystoreStorage;
    GoogleDriveBackup: typeof import("./storage").GoogleDriveBackup;
    initSDK: typeof initSDK;
    VERSION: string;
}>;
//# sourceMappingURL=index.d.ts.map
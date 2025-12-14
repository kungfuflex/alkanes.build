/**
 * Browser Wallet Adapters for Alkanes WASM Integration
 *
 * This module provides wallet adapter classes that bridge between browser wallet extensions
 * and the WASM BrowserWalletProvider. Each adapter implements the JsWalletAdapter interface
 * expected by the Rust code.
 *
 * @example
 * ```typescript
 * import { createWalletAdapter, WasmBrowserWalletProvider } from '@alkanes/ts-sdk';
 *
 * // Detect and connect to a wallet
 * const connector = new WalletConnector();
 * const wallets = await connector.detectWallets();
 * const connectedWallet = await connector.connect(wallets[0]);
 *
 * // Create an adapter for the WASM provider
 * const adapter = createWalletAdapter(connectedWallet);
 *
 * // Create the WASM provider with the adapter
 * const wasmProvider = await WasmBrowserWalletProvider.new(adapter, 'mainnet');
 * ```
 */
import { ConnectedWallet } from './index';
/**
 * Interface that wallet adapters must implement to work with WASM BrowserWalletProvider.
 * This matches the JsWalletAdapter type expected by Rust.
 */
export interface JsWalletAdapter {
    /** Get wallet metadata */
    getInfo(): WalletInfoForWasm;
    /** Connect to the wallet */
    connect(): Promise<WalletAccountForWasm>;
    /** Disconnect from the wallet */
    disconnect(): Promise<void>;
    /** Get all connected accounts */
    getAccounts(): Promise<WalletAccountForWasm[]>;
    /** Get current network */
    getNetwork(): Promise<string>;
    /** Switch to a different network */
    switchNetwork(network: string): Promise<void>;
    /** Sign a message */
    signMessage(message: string, address: string): Promise<string>;
    /** Sign a PSBT (hex encoded) */
    signPsbt(psbtHex: string, options?: PsbtSigningOptionsForWasm): Promise<string>;
    /** Sign multiple PSBTs */
    signPsbts(psbtHexs: string[], options?: PsbtSigningOptionsForWasm): Promise<string[]>;
    /** Push a raw transaction */
    pushTx(txHex: string): Promise<string>;
    /** Push a signed PSBT */
    pushPsbt(psbtHex: string): Promise<string>;
    /** Get the wallet's public key */
    getPublicKey(): Promise<string>;
    /** Get balance (optional) */
    getBalance(): Promise<number | null>;
    /** Get inscriptions (optional) */
    getInscriptions(cursor?: number, size?: number): Promise<any>;
}
/**
 * Wallet info structure for WASM compatibility
 */
export interface WalletInfoForWasm {
    id: string;
    name: string;
    icon: string;
    website: string;
    injection_key: string;
    supports_psbt: boolean;
    supports_taproot: boolean;
    supports_ordinals: boolean;
    mobile_support: boolean;
    deep_link_scheme?: string;
}
/**
 * Account info structure for WASM compatibility
 */
export interface WalletAccountForWasm {
    address: string;
    public_key?: string;
    compressed_public_key?: string;
    address_type: string;
}
/**
 * PSBT signing options for WASM compatibility
 */
export interface PsbtSigningOptionsForWasm {
    auto_finalized: boolean;
    to_sign_inputs?: Array<{
        index: number;
        address?: string;
        sighash_types?: number[];
        disable_tweaked_public_key?: boolean;
    }>;
}
/**
 * Base wallet adapter that wraps a ConnectedWallet
 */
export declare class BaseWalletAdapter implements JsWalletAdapter {
    protected wallet: ConnectedWallet;
    constructor(wallet: ConnectedWallet);
    getInfo(): WalletInfoForWasm;
    connect(): Promise<WalletAccountForWasm>;
    disconnect(): Promise<void>;
    getAccounts(): Promise<WalletAccountForWasm[]>;
    getNetwork(): Promise<string>;
    switchNetwork(network: string): Promise<void>;
    signMessage(message: string, address: string): Promise<string>;
    signPsbt(psbtHex: string, options?: PsbtSigningOptionsForWasm): Promise<string>;
    signPsbts(psbtHexs: string[], options?: PsbtSigningOptionsForWasm): Promise<string[]>;
    pushTx(txHex: string): Promise<string>;
    pushPsbt(psbtHex: string): Promise<string>;
    getPublicKey(): Promise<string>;
    getBalance(): Promise<number | null>;
    getInscriptions(cursor?: number, size?: number): Promise<any>;
}
/**
 * Unisat-specific wallet adapter
 */
export declare class UnisatAdapter extends BaseWalletAdapter {
    private get unisat();
    switchNetwork(network: string): Promise<void>;
    pushTx(txHex: string): Promise<string>;
    pushPsbt(psbtHex: string): Promise<string>;
    getBalance(): Promise<number | null>;
    getInscriptions(cursor?: number, size?: number): Promise<any>;
    signPsbts(psbtHexs: string[], options?: PsbtSigningOptionsForWasm): Promise<string[]>;
}
/**
 * Xverse-specific wallet adapter
 */
export declare class XverseAdapter extends BaseWalletAdapter {
    private get xverse();
    signPsbt(psbtHex: string, options?: PsbtSigningOptionsForWasm): Promise<string>;
    private buildXverseSignInputs;
    switchNetwork(network: string): Promise<void>;
}
/**
 * OKX-specific wallet adapter
 */
export declare class OkxAdapter extends BaseWalletAdapter {
    private get okx();
    signPsbt(psbtHex: string, options?: PsbtSigningOptionsForWasm): Promise<string>;
    signPsbts(psbtHexs: string[], options?: PsbtSigningOptionsForWasm): Promise<string[]>;
    pushTx(txHex: string): Promise<string>;
    pushPsbt(psbtHex: string): Promise<string>;
    getBalance(): Promise<number | null>;
    getInscriptions(cursor?: number, size?: number): Promise<any>;
}
/**
 * Leather-specific wallet adapter
 */
export declare class LeatherAdapter extends BaseWalletAdapter {
    private get leather();
    signPsbt(psbtHex: string, options?: PsbtSigningOptionsForWasm): Promise<string>;
    signMessage(message: string, address: string): Promise<string>;
}
/**
 * Phantom-specific wallet adapter
 */
export declare class PhantomAdapter extends BaseWalletAdapter {
    private get phantom();
    signPsbt(psbtHex: string, options?: PsbtSigningOptionsForWasm): Promise<string>;
    signMessage(message: string, address: string): Promise<string>;
}
/**
 * Magic Eden-specific wallet adapter
 */
export declare class MagicEdenAdapter extends BaseWalletAdapter {
    private get magicEden();
    signPsbt(psbtHex: string, options?: PsbtSigningOptionsForWasm): Promise<string>;
    signMessage(message: string, address: string): Promise<string>;
}
/**
 * Wizz-specific wallet adapter
 */
export declare class WizzAdapter extends BaseWalletAdapter {
    private get wizz();
    signPsbt(psbtHex: string, options?: PsbtSigningOptionsForWasm): Promise<string>;
    signPsbts(psbtHexs: string[], options?: PsbtSigningOptionsForWasm): Promise<string[]>;
    pushTx(txHex: string): Promise<string>;
    getBalance(): Promise<number | null>;
}
/**
 * Create a wallet adapter for a connected wallet
 *
 * @param wallet - The connected wallet instance
 * @returns A wallet adapter implementing JsWalletAdapter
 */
export declare function createWalletAdapter(wallet: ConnectedWallet): JsWalletAdapter;
/**
 * Mock wallet adapter for testing
 *
 * This adapter can be used to test the WASM integration without a real wallet.
 */
export declare class MockWalletAdapter implements JsWalletAdapter {
    private mockAddress;
    private mockPublicKey;
    private mockNetwork;
    private signedPsbts;
    constructor(options?: {
        address?: string;
        publicKey?: string;
        network?: string;
    });
    getInfo(): WalletInfoForWasm;
    connect(): Promise<WalletAccountForWasm>;
    disconnect(): Promise<void>;
    getAccounts(): Promise<WalletAccountForWasm[]>;
    getNetwork(): Promise<string>;
    switchNetwork(network: string): Promise<void>;
    signMessage(message: string, address: string): Promise<string>;
    signPsbt(psbtHex: string, options?: PsbtSigningOptionsForWasm): Promise<string>;
    signPsbts(psbtHexs: string[], options?: PsbtSigningOptionsForWasm): Promise<string[]>;
    pushTx(txHex: string): Promise<string>;
    pushPsbt(psbtHex: string): Promise<string>;
    getPublicKey(): Promise<string>;
    getBalance(): Promise<number | null>;
    getInscriptions(cursor?: number, size?: number): Promise<any>;
    /** Get PSBTs that were signed (for testing) */
    getSignedPsbts(): string[];
    /** Clear signed PSBTs (for testing) */
    clearSignedPsbts(): void;
}
//# sourceMappingURL=adapter.d.ts.map
/**
 * Provider integration for Alkanes SDK
 *
 * Provides a clean TypeScript wrapper over the WebProvider WASM bindings.
 * Compatible with @oyl/sdk Provider interface patterns.
 */
import * as bitcoin from 'bitcoinjs-lib';
import { NetworkType, UTXO, AddressBalance, AlkaneBalance, AlkaneId } from '../types';
type WasmWebProvider = any;
export declare const NETWORK_PRESETS: Record<string, {
    rpcUrl: string;
    dataApiUrl: string;
    networkType: NetworkType;
}>;
export interface AlkanesProviderConfig {
    /** Network type or preset name */
    network: string;
    /** Custom RPC URL (overrides preset) */
    rpcUrl?: string;
    /** Custom Data API URL (overrides preset, defaults to rpcUrl) */
    dataApiUrl?: string;
    /** bitcoinjs-lib network (auto-detected if not provided) */
    bitcoinNetwork?: bitcoin.Network;
}
export interface PoolDetails {
    token0: AlkaneId;
    token1: AlkaneId;
    reserve0: string;
    reserve1: string;
    totalSupply: string;
}
export interface PoolWithDetails {
    poolId: AlkaneId;
    details: PoolDetails | null;
}
export interface TradeInfo {
    txid: string;
    vout: number;
    token0: string;
    token1: string;
    amount0In: string;
    amount1In: string;
    amount0Out: string;
    amount1Out: string;
    reserve0After: string;
    reserve1After: string;
    timestamp: string;
    blockHeight: number;
}
export interface CandleInfo {
    openTime: string;
    closeTime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume0: string;
    volume1: string;
    tradeCount: number;
}
export interface HolderInfo {
    address: string;
    amount: string;
}
export interface ExecuteResult {
    txid: string;
    rawTx: string;
    fee: number;
    size: number;
}
/**
 * Bitcoin RPC client (uses WebProvider internally)
 */
export declare class BitcoinRpcClient {
    private provider;
    constructor(provider: WasmWebProvider);
    getBlockCount(): Promise<number>;
    getBlockHash(height: number): Promise<string>;
    getBlock(hash: string, raw?: boolean): Promise<any>;
    sendRawTransaction(hex: string): Promise<string>;
    getTransaction(txid: string, blockHash?: string): Promise<any>;
    getBlockchainInfo(): Promise<any>;
    getNetworkInfo(): Promise<any>;
    getMempoolInfo(): Promise<any>;
    estimateSmartFee(target: number): Promise<any>;
    generateToAddress(nblocks: number, address: string): Promise<any>;
}
/**
 * Esplora API client (uses WebProvider internally)
 */
export declare class EsploraClient {
    private provider;
    constructor(provider: WasmWebProvider);
    getAddressInfo(address: string): Promise<any>;
    getAddressUtxos(address: string): Promise<UTXO[]>;
    getAddressTxs(address: string): Promise<any[]>;
    getTx(txid: string): Promise<any>;
    getTxStatus(txid: string): Promise<any>;
    getTxHex(txid: string): Promise<string>;
    getBlocksTipHeight(): Promise<number>;
    getBlocksTipHash(): Promise<string>;
    broadcastTx(txHex: string): Promise<string>;
    /**
     * Get address transactions with complete runestone traces
     * CLI equivalent: alkanes-cli esplora address-txs --runestone-trace <address>
     * @param address Bitcoin address to query
     * @param excludeCoinbase Skip coinbase transactions (default: false)
     * @param fromBlockHeight Only process transactions at or above this block height (0 = all)
     */
    getAddressTxsWithTraces(address: string, excludeCoinbase?: boolean, fromBlockHeight?: number): Promise<any[]>;
}
/**
 * Alkanes RPC client (uses WebProvider internally)
 */
export declare class AlkanesRpcClient {
    private provider;
    constructor(provider: WasmWebProvider);
    getBalance(address?: string): Promise<AlkaneBalance[]>;
    getByAddress(address: string, blockTag?: string, protocolTag?: number): Promise<any>;
    getByOutpoint(outpoint: string, blockTag?: string, protocolTag?: number): Promise<any>;
    getBytecode(alkaneId: string, blockTag?: string): Promise<string>;
    simulate(contractId: string, contextJson: string, blockTag?: string): Promise<any>;
    execute(paramsJson: string): Promise<any>;
    trace(outpoint: string): Promise<any>;
    view(contractId: string, viewFn: string, params?: Uint8Array, blockTag?: string): Promise<any>;
    getAllPools(factoryId: string): Promise<any>;
    getAllPoolsWithDetails(factoryId: string, chunkSize?: number, maxConcurrent?: number): Promise<PoolWithDetails[]>;
    getPendingUnwraps(blockTag?: string): Promise<any>;
}
/**
 * Metashrew RPC client (uses WebProvider internally)
 *
 * Provides low-level access to metashrew_view RPC calls.
 * For most use cases, prefer the higher-level methods on AlkanesRpcClient.
 */
export declare class MetashrewClient {
    private provider;
    constructor(provider: WasmWebProvider);
    /**
     * Get current blockchain height
     */
    getHeight(): Promise<number>;
    /**
     * Get state root at a specific height
     */
    getStateRoot(height?: number): Promise<string>;
    /**
     * Get block hash at a specific height
     */
    getBlockHash(height: number): Promise<string>;
    /**
     * Call a metashrew view function
     *
     * This is the generic low-level method for calling any metashrew_view function.
     *
     * @param viewFn - The view function name (e.g., "simulate", "protorunesbyaddress")
     * @param payload - The hex-encoded payload (with or without 0x prefix)
     * @param blockTag - The block tag ("latest" or a block height as string)
     * @returns The hex-encoded response string
     */
    view(viewFn: string, payload: string, blockTag?: string): Promise<string>;
}
/**
 * Lua script execution result
 */
export interface LuaEvalResult {
    calls: number;
    returns: any;
    runtime: number;
}
/**
 * Lua RPC client (uses WebProvider internally)
 *
 * This client provides Lua script execution with automatic scripthash caching.
 * The luaEval method tries the cached scripthash first (lua_evalsaved),
 * falling back to the full script (lua_evalscript) if the hash isn't cached.
 */
export declare class LuaClient {
    private provider;
    constructor(provider: WasmWebProvider);
    /**
     * Execute a Lua script with automatic scripthash caching
     *
     * This is the recommended way to execute Lua scripts. It:
     * 1. Computes the SHA256 hash of the script
     * 2. Tries to execute using the cached hash (lua_evalsaved)
     * 3. Falls back to full script execution (lua_evalscript) if not cached
     *
     * @param script - The Lua script content
     * @param args - Arguments to pass to the script
     * @returns The script execution result
     */
    eval(script: string, args?: any[]): Promise<LuaEvalResult>;
    /**
     * Execute a Lua script directly (no caching)
     *
     * Use this only when you need to bypass the scripthash cache.
     * For most use cases, prefer the eval() method.
     *
     * @param script - The Lua script content
     * @returns The script execution result
     */
    evalScript(script: string): Promise<any>;
}
/**
 * Data API client (uses WebProvider internally)
 */
export declare class DataApiClient {
    private provider;
    constructor(provider: WasmWebProvider);
    getPools(factoryId: string): Promise<any>;
    getPoolHistory(poolId: string, category?: string, limit?: number, offset?: number): Promise<any>;
    getAllHistory(poolId: string, limit?: number, offset?: number): Promise<any>;
    getSwapHistory(poolId: string, limit?: number, offset?: number): Promise<any>;
    getMintHistory(poolId: string, limit?: number, offset?: number): Promise<any>;
    getBurnHistory(poolId: string, limit?: number, offset?: number): Promise<any>;
    getTrades(pool: string, startTime?: number, endTime?: number, limit?: number): Promise<TradeInfo[]>;
    getCandles(pool: string, interval: string, startTime?: number, endTime?: number, limit?: number): Promise<CandleInfo[]>;
    getReserves(pool: string): Promise<any>;
    getAlkanesByAddress(address: string): Promise<any>;
    getAddressBalances(address: string, includeOutpoints?: boolean): Promise<any>;
    getHolders(alkane: string, page?: number, limit?: number): Promise<HolderInfo[]>;
    getHoldersCount(alkane: string): Promise<number>;
    getKeys(alkane: string, prefix?: string, limit?: number): Promise<any>;
    getBitcoinPrice(): Promise<any>;
    getBitcoinMarketChart(days: string): Promise<any>;
}
/**
 * Main Alkanes Provider
 *
 * Provides a unified interface to all Alkanes functionality:
 * - Bitcoin RPC operations
 * - Esplora API operations
 * - Alkanes smart contract operations
 * - Data API for analytics and trading data
 */
export declare class AlkanesProvider {
    private _provider;
    private _bitcoin;
    private _esplora;
    private _alkanes;
    private _dataApi;
    private _lua;
    private _metashrew;
    readonly network: bitcoin.Network;
    readonly networkType: NetworkType;
    readonly rpcUrl: string;
    readonly dataApiUrl: string;
    private readonly networkPreset;
    constructor(config: AlkanesProviderConfig);
    /**
     * Initialize the provider (loads WASM if needed)
     *
     * This method handles cross-platform WASM loading for both Node.js and browser environments.
     */
    initialize(): Promise<void>;
    /**
     * Get the underlying WASM provider (initializes if needed)
     */
    private getProvider;
    /**
     * Bitcoin RPC client
     */
    get bitcoin(): BitcoinRpcClient;
    /**
     * Esplora API client
     */
    get esplora(): EsploraClient;
    /**
     * Alkanes RPC client
     */
    get alkanes(): AlkanesRpcClient;
    /**
     * Data API client
     */
    get dataApi(): DataApiClient;
    /**
     * Lua script execution client
     *
     * Provides Lua script execution with automatic scripthash caching.
     * This is the recommended way to execute Lua scripts for optimal performance.
     */
    get lua(): LuaClient;
    /**
     * Metashrew RPC client
     *
     * Provides low-level access to metashrew_view RPC calls.
     * For most use cases, prefer the higher-level methods on alkanes or the convenience methods.
     */
    get metashrew(): MetashrewClient;
    /**
     * Get BTC balance for an address
     */
    getBalance(address: string): Promise<AddressBalance>;
    /**
     * Get enriched balances (BTC + alkanes) for an address
     */
    getEnrichedBalances(address: string, protocolTag?: string): Promise<any>;
    /**
     * Get alkane token balance for an address
     */
    getAlkaneBalance(address: string, alkaneId?: AlkaneId): Promise<AlkaneBalance[]>;
    /**
     * Get alkane token details
     */
    getAlkaneTokenDetails(params: {
        alkaneId: AlkaneId;
    }): Promise<any>;
    /**
     * Get transaction history for an address
     */
    getAddressHistory(address: string): Promise<any[]>;
    /**
     * Get address history with alkane traces
     * @param address Bitcoin address to query
     * @param excludeCoinbase Skip coinbase transactions (default: false)
     * @param fromBlockHeight Only process transactions at or above this block height (0 = all)
     */
    getAddressHistoryWithTraces(address: string, excludeCoinbase?: boolean, fromBlockHeight?: number): Promise<any[]>;
    /**
     * Get current block height
     */
    getBlockHeight(): Promise<number>;
    /**
     * Broadcast a transaction
     */
    broadcastTransaction(txHex: string): Promise<string>;
    /**
     * Get all AMM pools from a factory
     */
    getAllPools(factoryId: string): Promise<PoolWithDetails[]>;
    /**
     * Get pool reserves
     */
    getPoolReserves(poolId: string): Promise<any>;
    /**
     * Get recent trades for a pool
     */
    getPoolTrades(poolId: string, limit?: number): Promise<TradeInfo[]>;
    /**
     * Get candle data for a pool
     */
    getPoolCandles(poolId: string, interval?: string, limit?: number): Promise<CandleInfo[]>;
    /**
     * Get Bitcoin price in USD
     */
    getBitcoinPrice(): Promise<number>;
    /**
     * Execute an alkanes contract call
     */
    executeAlkanes(params: {
        contractId: string;
        calldata: number[];
        feeRate?: number;
        inputs?: any[];
    }): Promise<ExecuteResult>;
    /**
     * Simulate an alkanes contract call (read-only)
     */
    simulateAlkanes(contractId: string, calldata: number[], blockTag?: string): Promise<any>;
}
/**
 * Create an Alkanes provider instance
 *
 * @param config - Provider configuration
 * @returns AlkanesProvider instance
 *
 * @example
 * ```typescript
 * // Use a preset network
 * const provider = await createProvider({ network: 'subfrost-regtest' });
 * await provider.initialize();
 *
 * // Use custom URLs
 * const provider = await createProvider({
 *   network: 'regtest',
 *   rpcUrl: 'http://localhost:18888',
 * });
 * await provider.initialize();
 * ```
 */
export declare function createProvider(config: AlkanesProviderConfig): AlkanesProvider;
export {};
//# sourceMappingURL=index.d.ts.map
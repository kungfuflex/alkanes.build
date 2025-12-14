export interface AlkanesApiClientOptions {
    baseUrl: string;
    timeout?: number;
}
export declare class AlkanesApiClient {
    private baseUrl;
    private timeout;
    constructor(options: AlkanesApiClientOptions);
    private post;
    getAddressBalances(address: string, includeOutpoints?: boolean): Promise<AddressBalancesResponse>;
    getOutpointBalances(outpoint: string): Promise<OutpointBalancesResponse>;
    getHolders(alkane: string, page?: number, limit?: number): Promise<HoldersResponse>;
    getHoldersCount(alkane: string): Promise<HolderCountResponse>;
    getAddressOutpoints(address: string): Promise<AddressOutpointsResponse>;
    getKeys(alkane: string, options?: {
        prefix?: string;
        limit?: number;
    }): Promise<GetKeysResponse>;
    getTrades(pool: string, options?: {
        startTime?: number;
        endTime?: number;
        limit?: number;
    }): Promise<GetTradesResponse>;
    getCandles(pool: string, interval: string, options?: {
        startTime?: number;
        endTime?: number;
        limit?: number;
    }): Promise<GetCandlesResponse>;
    getReserves(pool: string): Promise<GetReservesResponse>;
    pathfind(tokenIn: string, tokenOut: string, amountIn: string, maxHops?: number): Promise<PathfindResponse>;
}
export interface AddressBalancesResponse {
    ok: boolean;
    address: string;
    balances: Record<string, string>;
    outpoints?: OutpointInfo[];
}
export interface OutpointInfo {
    outpoint: string;
    entries: BalanceEntry[];
}
export interface BalanceEntry {
    alkane: string;
    amount: string;
}
export interface OutpointBalancesResponse {
    ok: boolean;
    outpoint: string;
    items: OutpointItem[];
}
export interface OutpointItem {
    outpoint: string;
    address?: string;
    entries: BalanceEntry[];
}
export interface HoldersResponse {
    ok: boolean;
    alkane: string;
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
    items: HolderInfo[];
}
export interface HolderInfo {
    address: string;
    amount: string;
}
export interface HolderCountResponse {
    ok: boolean;
    alkane: string;
    count: number;
}
export interface AddressOutpointsResponse {
    ok: boolean;
    address: string;
    outpoints: OutpointInfo[];
}
export interface GetKeysResponse {
    ok: boolean;
    alkane: string;
    keys: Record<string, KeyValue>;
}
export interface KeyValue {
    key: string;
    value: string;
    last_txid: string;
    last_vout: number;
    block_height: number;
    updated_at: string;
}
export interface GetTradesResponse {
    ok: boolean;
    pool: string;
    trades: TradeInfo[];
}
export interface TradeInfo {
    txid: string;
    vout: number;
    token0: string;
    token1: string;
    amount0_in: string;
    amount1_in: string;
    amount0_out: string;
    amount1_out: string;
    reserve0_after: string;
    reserve1_after: string;
    timestamp: string;
    block_height: number;
}
export interface GetCandlesResponse {
    ok: boolean;
    pool: string;
    interval: string;
    candles: CandleInfo[];
}
export interface CandleInfo {
    open_time: string;
    close_time: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume0: string;
    volume1: string;
    trade_count: number;
}
export interface GetReservesResponse {
    ok: boolean;
    pool: string;
    reserve0: string;
    reserve1: string;
    timestamp: string;
    block_height: number;
}
export interface PathfindResponse {
    ok: boolean;
    paths: PathInfo[];
}
export interface PathInfo {
    hops: string[];
    pools: string[];
    estimated_output: string;
}
export declare function createAlkanesClient(baseUrl: string, timeout?: number): AlkanesApiClient;
//# sourceMappingURL=api-client.d.ts.map
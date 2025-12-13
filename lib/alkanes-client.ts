/**
 * Alkanes Client - Unified interface for all blockchain RPC interactions
 *
 * This module provides a single entry point for all alkanes/metashrew/esplora calls,
 * using @alkanes/ts-sdk as the underlying driver. All business logic that interacts
 * with the blockchain should use this client.
 *
 * Benefits:
 * - Single source of truth for RPC configuration
 * - Consistent error handling
 * - Testable via SDK mocking
 * - Eliminates duplicate fetch/RPC code throughout the codebase
 */

import { AlkanesProvider, type AlkaneBalance, type AlkaneId } from '@alkanes/ts-sdk';

// ============================================================================
// Types
// ============================================================================

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

export interface TokenBalance {
  runeId: string;
  symbol: string;
  name: string;
  balance: bigint;
  balanceFormatted: number;
  decimals: number;
}

export interface WalletBalances {
  btcBalance: number;
  btcBalanceFormatted: string;
  tokens: TokenBalance[];
  address: string;
  timestamp: number;
}

export interface PoolReserves {
  reserve0: bigint;
  reserve1: bigint;
  totalSupply: bigint;
}

export interface PoolDataPoint {
  height: number;
  timestamp: number;
  reserve0: bigint;
  reserve1: bigint;
  totalSupply: bigint;
  price: number;
}

// Pool configuration
export interface PoolConfig {
  id: string;
  name: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
  protobufPayload: string;
  alkaneId: AlkaneId;
}

// ============================================================================
// Constants
// ============================================================================

/** Known token metadata */
export const KNOWN_TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  '2:0': { symbol: 'DIESEL', name: 'DIESEL', decimals: 8 },
  '32:0': { symbol: 'frBTC', name: 'Fractional BTC', decimals: 8 },
  '2:56801': { symbol: 'bUSD', name: 'Bitcoin USD', decimals: 8 },
  '2:68441': { symbol: 'DIESEL/bUSD LP', name: 'DIESEL/bUSD LP Token', decimals: 8 },
  '2:77087': { symbol: 'DIESEL/frBTC LP', name: 'DIESEL/frBTC LP Token', decimals: 8 },
};

/** Pool configurations */
export const POOLS: Record<string, PoolConfig> = {
  DIESEL_FRBTC: {
    id: 'DIESEL_FRBTC',
    name: 'DIESEL/frBTC',
    token0Symbol: 'DIESEL',
    token1Symbol: 'frBTC',
    token0Decimals: 8,
    token1Decimals: 8,
    protobufPayload: '0x2096ce382a06029fda04e7073001',
    alkaneId: { block: 2, tx: 77087 },
  },
  DIESEL_BUSD: {
    id: 'DIESEL_BUSD',
    name: 'DIESEL/bUSD',
    token0Symbol: 'DIESEL',
    token1Symbol: 'bUSD',
    token0Decimals: 8,
    token1Decimals: 8,
    protobufPayload: '0x2096ce382a0602d99604e7073001',
    alkaneId: { block: 2, tx: 68441 },
  },
};

/** DIESEL token configuration */
export const DIESEL_TOKEN = {
  alkaneId: { block: 2, tx: 0 },
  decimals: 8,
  totalSupplyPayload: '0x20e3ce382a030200653001',
};

// ============================================================================
// Utility Functions (exported for testing)
// ============================================================================

/**
 * Parse a little-endian u128 from a hex string
 * @param hexStr - Hex string (without 0x prefix)
 * @returns Parsed BigInt value
 */
export function parseU128LE(hexStr: string): bigint {
  if (!hexStr || hexStr.length === 0) return BigInt(0);

  // Ensure even length
  const padded = hexStr.length % 2 === 0 ? hexStr : '0' + hexStr;

  // Reverse byte pairs for little-endian
  let reversed = '';
  for (let i = padded.length - 2; i >= 0; i -= 2) {
    reversed += padded.slice(i, i + 2);
  }

  return BigInt('0x' + (reversed || '0'));
}

/**
 * Parse a little-endian u128 from a hex string at a specific byte offset
 * @param hexStr - Full hex string
 * @param byteOffset - Byte offset (not hex offset)
 * @returns Parsed BigInt value
 */
export function parseU128LEAtOffset(hexStr: string, byteOffset: number): bigint {
  const hexOffset = byteOffset * 2;
  const slice = hexStr.slice(hexOffset, hexOffset + 32); // 16 bytes = 32 hex chars
  return parseU128LE(slice);
}

/**
 * Read a protobuf varint from a buffer
 * @param buf - Buffer to read from
 * @param pos - Starting position
 * @returns Object with value and new position
 */
export function readVarint(buf: Buffer, pos: number): { value: number; newPos: number } {
  let result = 0;
  let shift = 0;
  let newPos = pos;

  while (newPos < buf.length) {
    const byte = buf[newPos++];
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
    if (shift > 35) break; // Prevent infinite loop
  }

  return { value: result, newPos };
}

/**
 * Calculate price from pool reserves
 * @param reserve0 - Reserve of token 0
 * @param reserve1 - Reserve of token 1
 * @param decimals0 - Decimals of token 0
 * @param decimals1 - Decimals of token 1
 * @returns Price as number (token1 per token0)
 */
export function calculatePrice(
  reserve0: bigint,
  reserve1: bigint,
  decimals0: number = 8,
  decimals1: number = 8
): number {
  if (reserve0 === BigInt(0)) return 0;

  const r0 = Number(reserve0) / Math.pow(10, decimals0);
  const r1 = Number(reserve1) / Math.pow(10, decimals1);

  return r1 / r0;
}

/**
 * Format alkane ID to string
 * Accepts either an AlkaneId object or a string (which is returned as-is)
 */
export function formatAlkaneId(id: AlkaneId | string): string {
  if (typeof id === 'string') {
    return id;
  }
  return `${id.block}:${id.tx}`;
}

// ============================================================================
// Alkanes Client Class
// ============================================================================

/**
 * Singleton client for all alkanes/blockchain interactions
 */
class AlkanesClient {
  private provider: AlkanesProvider | null = null;
  private initPromise: Promise<void> | null = null;
  private rpcUrl: string;

  constructor() {
    this.rpcUrl = process.env.ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/buildalkanes';
  }

  /**
   * Get the RPC URL being used
   */
  getRpcUrl(): string {
    return this.rpcUrl;
  }

  /**
   * Initialize the provider (lazy, singleton)
   */
  private async ensureProvider(): Promise<AlkanesProvider> {
    if (this.provider) return this.provider;

    if (!this.initPromise) {
      this.initPromise = (async () => {
        this.provider = new AlkanesProvider({
          network: 'mainnet',
          rpcUrl: this.rpcUrl,
        });
        await this.provider.initialize();
      })();
    }

    await this.initPromise;
    return this.provider!;
  }

  // ==========================================================================
  // Esplora Methods (Bitcoin/UTXO)
  // ==========================================================================

  /**
   * Get UTXOs for an address
   */
  async getAddressUtxos(address: string): Promise<UTXO[]> {
    const provider = await this.ensureProvider();
    const utxos = await provider.esplora.getAddressUtxos(address);
    return utxos as UTXO[];
  }

  /**
   * Get BTC balance for an address (sum of UTXO values)
   */
  async getBtcBalance(address: string): Promise<number> {
    const utxos = await this.getAddressUtxos(address);
    return utxos.reduce((sum, utxo) => sum + (utxo.value || 0), 0);
  }

  // ==========================================================================
  // Alkanes/Protorunes Methods (Token balances)
  // ==========================================================================

  /**
   * Get alkane token balances for an address
   * Uses protorunesbyaddress via metashrew_view
   */
  async getAlkaneBalances(address: string): Promise<AlkaneBalance[]> {
    const provider = await this.ensureProvider();
    return provider.alkanes.getBalance(address);
  }

  /**
   * Get protorunes by address (full outpoint data with balance sheets)
   */
  async getProtorunesByAddress(address: string, protocolTag: number = 1): Promise<unknown> {
    const provider = await this.ensureProvider();
    return provider.alkanes.getByAddress(address, undefined, protocolTag);
  }

  /**
   * Get complete wallet balances (BTC + tokens)
   */
  async getWalletBalances(address: string): Promise<WalletBalances> {
    const [btcBalance, alkaneBalances] = await Promise.all([
      this.getBtcBalance(address),
      this.getAlkaneBalances(address),
    ]);

    // Convert alkane balances to token balances with metadata
    const tokens: TokenBalance[] = alkaneBalances.map((ab) => {
      // Handle both field names: alkane_id (from RPC) and id (from types)
      const alkaneId = ab.alkane_id || ab.id;
      if (!alkaneId) {
        throw new Error('Invalid balance entry: missing alkane_id/id');
      }
      const runeId = formatAlkaneId(alkaneId);
      const tokenInfo = KNOWN_TOKENS[runeId] || {
        symbol: ab.symbol || runeId,
        name: ab.name || `Unknown (${runeId})`,
        decimals: 8,
      };
      // Handle both field names: balance (from RPC) and amount (from types)
      const balanceValue = ab.balance ?? ab.amount ?? '0';

      return {
        runeId,
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        balance: BigInt(balanceValue),
        balanceFormatted: Number(balanceValue) / Math.pow(10, tokenInfo.decimals),
        decimals: tokenInfo.decimals,
      };
    });

    // Sort tokens: known tokens first
    const tokenOrder = ['2:0', '32:0', '2:56801', '2:77087', '2:68441'];
    tokens.sort((a, b) => {
      const aIdx = tokenOrder.indexOf(a.runeId);
      const bIdx = tokenOrder.indexOf(b.runeId);
      if (aIdx === -1 && bIdx === -1) return a.runeId.localeCompare(b.runeId);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

    return {
      btcBalance,
      btcBalanceFormatted: (btcBalance / 100000000).toFixed(8),
      tokens,
      address,
      timestamp: Date.now(),
    };
  }

  // ==========================================================================
  // Metashrew Methods (Chain state, pools, etc.)
  // ==========================================================================

  /**
   * Get current blockchain height
   * Uses the SDK's metashrewHeight() method
   */
  async getCurrentHeight(): Promise<number> {
    const provider = await this.ensureProvider();
    return provider.getBlockHeight();
  }

  /**
   * Call metashrew_view with a view function
   * Uses the SDK's metashrewView method
   */
  async metashrewView(viewFn: string, payload: string, blockTag: string = 'latest'): Promise<string> {
    const provider = await this.ensureProvider();
    return provider.metashrew.view(viewFn, payload, blockTag);
  }

  /**
   * Execute a Lua script with automatic scripthash caching
   *
   * Uses the SDK's Lua execution which:
   * 1. Computes the SHA256 hash of the script
   * 2. Tries to execute using the cached hash (lua_evalsaved)
   * 3. Falls back to full script execution (lua_evalscript) if not cached
   *
   * This provides better performance for repeated script executions.
   */
  async executeLuaScript<T>(script: string, args: unknown[]): Promise<T> {
    const provider = await this.ensureProvider();
    const result = await provider.lua.eval(script, args);

    // lua eval returns { calls, returns, runtime }
    if (result && result.returns !== undefined) {
      return result.returns as T;
    }
    return result as T;
  }

  // ==========================================================================
  // Pool Methods
  // ==========================================================================

  /**
   * Get pool reserves using metashrew_view simulate
   */
  async getPoolReserves(pool: PoolConfig, blockTag: string = 'latest'): Promise<PoolReserves | null> {
    try {
      const hex = await this.metashrewView('simulate', pool.protobufPayload, blockTag);
      return this.parsePoolReservesHex(hex);
    } catch (error) {
      console.error(`Error fetching pool reserves for ${pool.id}:`, error);
      return null;
    }
  }

  /**
   * Parse pool reserves from hex response
   */
  parsePoolReservesHex(hex: string): PoolReserves | null {
    try {
      const data = hex.startsWith('0x') ? hex.slice(2) : hex;
      if (!data || data.length < 224) return null;

      // Find inner data after 0a XX prefix
      const marker0a = data.indexOf('0a');
      if (marker0a === -1) return null;

      const innerLenHex = data.slice(marker0a + 2, marker0a + 4);
      const innerLen = parseInt(innerLenHex, 16);
      if (isNaN(innerLen)) return null;

      const innerStart = marker0a + 4;
      const innerHex = data.slice(innerStart);

      // Pool data layout:
      // token_a: bytes 0-31, token_b: bytes 32-63
      // reserve_a: bytes 64-79 (16 bytes, u128 LE)
      // reserve_b: bytes 80-95 (16 bytes, u128 LE)
      // total_supply: bytes 96-111 (16 bytes, u128 LE)
      return {
        reserve0: parseU128LEAtOffset(innerHex, 64),
        reserve1: parseU128LEAtOffset(innerHex, 80),
        totalSupply: parseU128LEAtOffset(innerHex, 96),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get DIESEL total supply
   */
  async getDieselTotalSupply(): Promise<bigint | null> {
    try {
      const hex = await this.metashrewView('simulate', DIESEL_TOKEN.totalSupplyPayload, 'latest');
      return this.parseTotalSupplyHex(hex);
    } catch (error) {
      console.error('Error fetching DIESEL total supply:', error);
      return null;
    }
  }

  // ==========================================================================
  // Data API Methods
  // ==========================================================================

  /**
   * Get current Bitcoin price in USD from the Data API
   */
  async getBitcoinPrice(): Promise<number> {
    const provider = await this.ensureProvider();
    const result = await provider.dataApi.getBitcoinPrice();
    // The API returns { statusCode: 200, data: { bitcoin: { usd: number } } }
    // Handle various possible response structures
    const price = result?.data?.bitcoin?.usd ?? result?.bitcoin?.usd ?? result?.price ?? result?.usd;
    if (typeof price === 'number' && price > 0) {
      return price;
    }
    // If we can't extract the price, log the response for debugging and return 0
    console.warn('Unexpected BTC price response structure:', JSON.stringify(result));
    return 0;
  }

  /**
   * Parse total supply from hex response
   */
  parseTotalSupplyHex(hex: string): bigint | null {
    try {
      const data = hex.startsWith('0x') ? hex.slice(2) : hex;
      if (!data) return null;

      // Find the 1a marker which precedes the value
      const marker1a = data.indexOf('1a');
      if (marker1a === -1) return null;

      // Skip marker and length byte
      const valueStart = marker1a + 4;
      const valueEnd = data.indexOf('10', valueStart);

      if (valueEnd === -1) {
        // No field separator, take rest of data (up to 32 chars)
        const valueHex = data.slice(valueStart, Math.min(valueStart + 32, data.length));
        return parseU128LE(valueHex);
      }

      const valueHex = data.slice(valueStart, valueEnd);
      // Pad to 32 chars if needed
      const paddedHex = valueHex.padEnd(32, '0');
      return parseU128LE(paddedHex);
    } catch {
      return null;
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/** Singleton instance of the Alkanes client */
export const alkanesClient = new AlkanesClient();

/** Export the class for testing/mocking */
export { AlkanesClient };

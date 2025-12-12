/**
 * Pool Data Service for fetching AMM pool reserves and prices
 *
 * Uses the Subfrost Data API for pool data with Redis caching.
 * For candle/historical data, uses the shared candle-fetcher module.
 * For BTC price data, uses the shared price-fetcher module.
 */
import { cacheGet, cacheSet } from '../redis';
import {
  POOL_CONFIGS,
  fetchPoolDataPoints,
  calculatePrice as calculatePriceFromFetcher,
  buildCandlesFromDataPoints,
  getCurrentHeight,
  type PoolKey as CandleFetcherPoolKey,
  type CandleFetcherConfig,
} from './candle-fetcher';
import {
  fetchBitcoinPrice as fetchBtcPriceFromApi,
  type PriceFetcherConfig,
} from './price-fetcher';

// Re-export pool configs as POOLS for backwards compatibility
// Uses the same config from candle-fetcher module
export const POOLS = {
  DIESEL_FRBTC: {
    id: POOL_CONFIGS.DIESEL_FRBTC.id,
    block: 2,
    tx: 77087,
    name: POOL_CONFIGS.DIESEL_FRBTC.name,
    token0: { block: 2, tx: 0, symbol: 'DIESEL', decimals: POOL_CONFIGS.DIESEL_FRBTC.token0Decimals },
    token1: { block: 32, tx: 0, symbol: 'frBTC', decimals: POOL_CONFIGS.DIESEL_FRBTC.token1Decimals },
    protobufPayload: POOL_CONFIGS.DIESEL_FRBTC.protobufPayload,
  },
  DIESEL_BUSD: {
    id: POOL_CONFIGS.DIESEL_BUSD.id,
    block: 2,
    tx: 68441,
    name: POOL_CONFIGS.DIESEL_BUSD.name,
    token0: { block: 2, tx: 0, symbol: 'DIESEL', decimals: POOL_CONFIGS.DIESEL_BUSD.token0Decimals },
    token1: { block: 2, tx: 56801, symbol: 'bUSD', decimals: POOL_CONFIGS.DIESEL_BUSD.token1Decimals },
    protobufPayload: POOL_CONFIGS.DIESEL_BUSD.protobufPayload,
  },
} as const;

export type PoolKey = keyof typeof POOLS;

// API endpoints
const DATA_API_URL = process.env.ALKANES_DATA_API_URL || 'https://mainnet.subfrost.io/v4/buildalkanes';
const RPC_URL = process.env.ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/buildalkanes';

// Cache TTLs
const CACHE_TTL_PRICES = 30; // 30 seconds for current prices
const CACHE_TTL_CANDLES = 300; // 5 minutes for candles
const CACHE_TTL_BTC_PRICE = 60; // 1 minute for BTC price

export interface PoolReserves {
  poolId: string;
  poolName: string;
  token0Symbol: string;
  token1Symbol: string;
  reserve0: bigint;
  reserve1: bigint;
  totalSupply: bigint;
  blockHeight: number;
  timestamp?: number;
}

export interface PoolPrice {
  poolId: string;
  poolName: string;
  price: number;
  priceInverse: number;
  reserve0: bigint;
  reserve1: bigint;
  blockHeight: number;
  timestamp?: number;
}

export interface SerializedPoolPrice {
  poolId: string;
  poolName: string;
  price: number;
  priceInverse: number;
  reserve0: string;
  reserve1: string;
  blockHeight: number;
  timestamp?: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface BitcoinPrice {
  usd: number;
  timestamp: number;
}

/**
 * Make an RPC call to the Subfrost endpoint
 */
async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.status}`);
  }

  const json = await response.json() as { result?: unknown; error?: { message: string } };

  if (json.error) {
    throw new Error(`RPC error: ${json.error.message}`);
  }

  return json.result;
}

/**
 * Get the current block height (with caching)
 */
export async function getCurrentBlockHeight(): Promise<number> {
  const cacheKey = 'pool:blockHeight';

  // Try cache first (short TTL)
  const cached = await cacheGet<number>(cacheKey);
  if (cached !== null) return cached;

  // Use shared module's getCurrentHeight
  const config: CandleFetcherConfig = { rpcUrl: RPC_URL };
  const height = await getCurrentHeight(config);

  // Cache for 10 seconds
  await cacheSet(cacheKey, height, 10);

  return height;
}

/**
 * Fetch pool data using lua_evalscript with metashrew_view
 * This uses the Lua script approach via the candle-fetcher module
 */
async function fetchPoolViaLuaScript(poolKey: PoolKey): Promise<{
  reserve0: bigint;
  reserve1: bigint;
  totalSupply: bigint;
  timestamp?: number;
} | null> {
  try {
    // Get current height first
    const config: CandleFetcherConfig = { rpcUrl: RPC_URL };
    const currentHeight = await getCurrentHeight(config);

    // Fetch single data point at current height using the Lua script
    // Use interval=1 and same start/end to get just one point
    const dataPoints = await fetchPoolDataPoints(
      poolKey as CandleFetcherPoolKey,
      currentHeight,
      currentHeight,
      1,
      config
    );

    if (dataPoints.length === 0) {
      console.error(`No data returned from Lua script for pool ${poolKey}`);
      return null;
    }

    const dp = dataPoints[0];
    return {
      reserve0: dp.reserve0,
      reserve1: dp.reserve1,
      totalSupply: dp.totalSupply,
      timestamp: dp.timestamp,
    };
  } catch (error) {
    console.error('Failed to fetch pool via Lua script:', error);
    return null;
  }
}

/**
 * Fetch all pools data via Lua scripts
 */
async function fetchAllPoolsViaLuaScript(): Promise<Map<string, {
  reserve0: bigint;
  reserve1: bigint;
  totalSupply: bigint;
  name: string;
  timestamp?: number;
}>> {
  const pools = new Map();

  // Fetch each pool in parallel
  const poolKeys = Object.keys(POOLS) as PoolKey[];
  const results = await Promise.allSettled(
    poolKeys.map(async (key) => {
      const data = await fetchPoolViaLuaScript(key);
      return { key, data };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.data) {
      const { key, data } = result.value;
      const pool = POOLS[key];
      pools.set(pool.id, {
        reserve0: data.reserve0,
        reserve1: data.reserve1,
        totalSupply: data.totalSupply,
        name: pool.name,
        timestamp: data.timestamp,
      });
    }
  }

  return pools;
}

/**
 * Fetch pool reserves
 */
export async function getPoolReserves(
  poolKey: PoolKey,
  _blockHeight?: number | 'latest'
): Promise<PoolReserves> {
  const pool = POOLS[poolKey];
  const cacheKey = `pool:reserves:${pool.id}`;

  // Try cache first
  const cached = await cacheGet<{
    reserve0: string;
    reserve1: string;
    totalSupply: string;
    blockHeight: number;
  }>(cacheKey);

  if (cached) {
    return {
      poolId: pool.id,
      poolName: pool.name,
      token0Symbol: pool.token0.symbol,
      token1Symbol: pool.token1.symbol,
      reserve0: BigInt(cached.reserve0),
      reserve1: BigInt(cached.reserve1),
      totalSupply: BigInt(cached.totalSupply),
      blockHeight: cached.blockHeight,
    };
  }

  // Fetch via Lua script (metashrew_view)
  const data = await fetchPoolViaLuaScript(poolKey);

  if (!data) {
    throw new Error(`Failed to fetch pool reserves for ${pool.id}`);
  }

  const height = await getCurrentBlockHeight();

  // Cache the result
  await cacheSet(cacheKey, {
    reserve0: data.reserve0.toString(),
    reserve1: data.reserve1.toString(),
    totalSupply: data.totalSupply.toString(),
    blockHeight: height,
  }, CACHE_TTL_PRICES);

  return {
    poolId: pool.id,
    poolName: pool.name,
    token0Symbol: pool.token0.symbol,
    token1Symbol: pool.token1.symbol,
    reserve0: data.reserve0,
    reserve1: data.reserve1,
    totalSupply: data.totalSupply,
    blockHeight: height,
    timestamp: data.timestamp,
  };
}

/**
 * Calculate price from reserves
 */
export function calculatePrice(
  reserve0: bigint,
  reserve1: bigint,
  decimals0: number,
  decimals1: number
): number {
  if (reserve0 === BigInt(0)) return 0;

  const adjustedReserve0 = Number(reserve0) / Math.pow(10, decimals0);
  const adjustedReserve1 = Number(reserve1) / Math.pow(10, decimals1);

  return adjustedReserve1 / adjustedReserve0;
}

/**
 * Get current pool price with caching
 */
export async function getPoolPrice(poolKey: PoolKey): Promise<PoolPrice> {
  const pool = POOLS[poolKey];
  const cacheKey = `pool:price:${pool.id}`;

  // Try cache first
  const cached = await cacheGet<SerializedPoolPrice>(cacheKey);

  if (cached) {
    return {
      ...cached,
      reserve0: BigInt(cached.reserve0),
      reserve1: BigInt(cached.reserve1),
    };
  }

  // Fetch fresh data
  const reserves = await getPoolReserves(poolKey);

  const price = calculatePrice(
    reserves.reserve0,
    reserves.reserve1,
    pool.token0.decimals,
    pool.token1.decimals
  );

  const result: PoolPrice = {
    poolId: pool.id,
    poolName: pool.name,
    price,
    priceInverse: price > 0 ? 1 / price : 0,
    reserve0: reserves.reserve0,
    reserve1: reserves.reserve1,
    blockHeight: reserves.blockHeight,
    timestamp: Date.now(),
  };

  // Cache the result (serialize bigints)
  await cacheSet<SerializedPoolPrice>(cacheKey, {
    ...result,
    reserve0: result.reserve0.toString(),
    reserve1: result.reserve1.toString(),
  }, CACHE_TTL_PRICES);

  return result;
}

/**
 * Get all pool prices (optimized batch fetch)
 */
export async function getAllPoolPrices(): Promise<Record<PoolKey, PoolPrice>> {
  const cacheKey = 'pool:allPrices';

  // Try cache first
  const cached = await cacheGet<Record<PoolKey, SerializedPoolPrice>>(cacheKey);

  if (cached) {
    return {
      DIESEL_FRBTC: {
        ...cached.DIESEL_FRBTC,
        reserve0: BigInt(cached.DIESEL_FRBTC.reserve0),
        reserve1: BigInt(cached.DIESEL_FRBTC.reserve1),
      },
      DIESEL_BUSD: {
        ...cached.DIESEL_BUSD,
        reserve0: BigInt(cached.DIESEL_BUSD.reserve0),
        reserve1: BigInt(cached.DIESEL_BUSD.reserve1),
      },
    };
  }

  // Fetch both pools in parallel
  const [frbtcPrice, busdPrice] = await Promise.all([
    getPoolPrice('DIESEL_FRBTC'),
    getPoolPrice('DIESEL_BUSD'),
  ]);

  const result = {
    DIESEL_FRBTC: frbtcPrice,
    DIESEL_BUSD: busdPrice,
  };

  // Cache the combined result
  await cacheSet<Record<PoolKey, SerializedPoolPrice>>(cacheKey, {
    DIESEL_FRBTC: {
      ...frbtcPrice,
      reserve0: frbtcPrice.reserve0.toString(),
      reserve1: frbtcPrice.reserve1.toString(),
    },
    DIESEL_BUSD: {
      ...busdPrice,
      reserve0: busdPrice.reserve0.toString(),
      reserve1: busdPrice.reserve1.toString(),
    },
  }, CACHE_TTL_PRICES);

  return result;
}

/**
 * Build LEB128 encoded calldata for pool_details opcode (999)
 */
function buildPoolDetailsCalldata(poolBlock: number, poolTx: number): number[] {
  const calldata: number[] = [];

  // LEB128 encode helper
  const leb128Encode = (value: number): number[] => {
    const result: number[] = [];
    do {
      let byte = value & 0x7f;
      value = Math.floor(value / 128);
      if (value > 0) {
        byte |= 0x80;
      }
      result.push(byte);
    } while (value > 0);
    return result;
  };

  // Target alkane block
  calldata.push(...leb128Encode(poolBlock));
  // Target alkane tx
  calldata.push(...leb128Encode(poolTx));
  // Opcode 999 (POOL_DETAILS)
  calldata.push(...leb128Encode(999));

  return calldata;
}

/**
 * Parse pool details response from hex data
 * Format: token_a(32) + token_b(32) + reserve_a(16) + reserve_b(16) + total_supply(16) + name_len(4) + name
 */
function parsePoolDetailsHex(dataHex: string): { reserve0: bigint; reserve1: bigint; totalSupply: bigint } | null {
  try {
    // Remove 0x prefix if present
    const hex = dataHex.startsWith('0x') ? dataHex.slice(2) : dataHex;

    // Need at least 112 bytes = 224 hex chars (without name)
    if (hex.length < 224) {
      return null;
    }

    // Helper to parse little-endian u128 from hex
    const parseU128LE = (hexStr: string): bigint => {
      // Reverse byte pairs for little-endian
      let reversed = '';
      for (let i = hexStr.length - 2; i >= 0; i -= 2) {
        reversed += hexStr.slice(i, i + 2);
      }
      return BigInt('0x' + reversed);
    };

    // reserve_a is at offset 64 bytes (128 hex chars), 16 bytes (32 hex chars)
    const reserve0Hex = hex.slice(128, 160);
    // reserve_b is at offset 80 bytes (160 hex chars), 16 bytes (32 hex chars)
    const reserve1Hex = hex.slice(160, 192);
    // total_supply is at offset 96 bytes (192 hex chars), 16 bytes (32 hex chars)
    const totalSupplyHex = hex.slice(192, 224);

    return {
      reserve0: parseU128LE(reserve0Hex),
      reserve1: parseU128LE(reserve1Hex),
      totalSupply: parseU128LE(totalSupplyHex),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch pool reserves using metashrew_view with prebuilt protobuf payload
 * This is the recommended approach - uses the same method as alkanes-cli
 */
async function fetchPoolReservesViaMetashrewView(
  poolKey: PoolKey,
  blockTag: string = 'latest'
): Promise<{ reserve0: bigint; reserve1: bigint; totalSupply: bigint } | null> {
  const pool = POOLS[poolKey];

  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'metashrew_view',
        params: ['simulate', pool.protobufPayload, blockTag],
      }),
    });

    if (!response.ok) {
      console.error(`metashrew_view failed: ${response.status}`);
      return null;
    }

    const json = await response.json() as {
      result?: string;
      error?: { message: string };
    };

    if (json.error) {
      console.error(`RPC error:`, json.error);
      return null;
    }

    if (json.result) {
      return parseMetashrewViewResponse(json.result);
    }

    return null;
  } catch (error) {
    console.error(`Error fetching reserves via metashrew_view:`, error);
    return null;
  }
}

/**
 * Parse metashrew_view response for pool details
 * Response format: protobuf wrapper (0a XX 1a YY) + inner data
 * Inner data: token_a(32) + token_b(32) + reserve_a(16) + reserve_b(16) + total_supply(16) + name
 */
function parseMetashrewViewResponse(resultHex: string): { reserve0: bigint; reserve1: bigint; totalSupply: bigint } | null {
  try {
    let hex = resultHex.startsWith('0x') ? resultHex.slice(2) : resultHex;

    // Find inner data after protobuf wrapper (look for "1a" marker which is field 3)
    const markerPos = hex.indexOf('1a');
    if (markerPos === -1 || hex.length < markerPos + 8) {
      return null;
    }

    // Skip "1a" and length byte(s)
    const lenByte = parseInt(hex.slice(markerPos + 2, markerPos + 4), 16);
    const innerStart = markerPos + (lenByte < 128 ? 4 : 6);

    if (hex.length < innerStart + 224) { // Need at least 112 bytes for reserves
      return null;
    }

    const innerHex = hex.slice(innerStart);

    // Helper to parse little-endian u128 from hex
    const parseU128LE = (hexStr: string, byteOffset: number): bigint => {
      const hexOffset = byteOffset * 2;
      const slice = hexStr.slice(hexOffset, hexOffset + 32);
      // Reverse byte pairs for little-endian
      let reversed = '';
      for (let i = slice.length - 2; i >= 0; i -= 2) {
        reversed += slice.slice(i, i + 2);
      }
      return BigInt('0x' + (reversed || '0'));
    };

    // Parse reserves from inner data
    // token_a: bytes 0-31, token_b: bytes 32-63
    // reserve_a: bytes 64-79 (16 bytes, u128 LE)
    // reserve_b: bytes 80-95 (16 bytes, u128 LE)
    // total_supply: bytes 96-111 (16 bytes, u128 LE)
    return {
      reserve0: parseU128LE(innerHex, 64),
      reserve1: parseU128LE(innerHex, 80),
      totalSupply: parseU128LE(innerHex, 96),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch pool reserves at a specific block height using metashrew_view
 */
async function fetchPoolReservesAtHeight(
  poolKey: PoolKey,
  blockHeight: number
): Promise<{ reserve0: bigint; reserve1: bigint; totalSupply: bigint } | null> {
  return fetchPoolReservesViaMetashrewView(poolKey, blockHeight.toString());
}

/**
 * Fetch historical pool data using the shared candle-fetcher module
 * Uses lua_evalscript with metashrew_view for efficient batch queries
 */
async function fetchHistoricalPoolDataBatched(
  poolKey: PoolKey,
  startHeight: number,
  endHeight: number,
  interval: number
): Promise<Array<{ height: number; timestamp?: number; reserve0: bigint; reserve1: bigint; totalSupply: bigint }>> {
  try {
    // Use shared module's fetchPoolDataPoints
    const config: CandleFetcherConfig = { rpcUrl: RPC_URL };
    const dataPoints = await fetchPoolDataPoints(
      poolKey as CandleFetcherPoolKey,
      startHeight,
      endHeight,
      interval,
      config
    );

    return dataPoints.map(dp => ({
      height: dp.height,
      timestamp: dp.timestamp,  // Actual block timestamp (Unix seconds)
      reserve0: dp.reserve0,
      reserve1: dp.reserve1,
      totalSupply: dp.totalSupply,
    }));
  } catch (error) {
    console.error('Error in batched historical data fetch:', error);
    return [];
  }
}

/**
 * Get historical prices for building candles
 * Uses batched lua_evalscript for efficiency, falls back to individual calls
 */
export async function getHistoricalPrices(
  poolKey: PoolKey,
  startHeight: number,
  endHeight: number,
  interval: number = 144
): Promise<PoolPrice[]> {
  const pool = POOLS[poolKey];
  const cacheKey = `pool:history:${pool.id}:${startHeight}:${endHeight}:${interval}`;

  // Check cache first
  const cached = await cacheGet<SerializedPoolPrice[]>(cacheKey);
  if (cached) {
    return cached.map(p => ({
      ...p,
      reserve0: BigInt(p.reserve0),
      reserve1: BigInt(p.reserve1),
    }));
  }

  const prices: PoolPrice[] = [];

  // Try batched Lua script first for efficiency (uses metashrew_view with prebuilt protobuf)
  const batchedData = await fetchHistoricalPoolDataBatched(poolKey, startHeight, endHeight, interval);

  if (batchedData.length > 0) {
    // Use batched results
    for (const dp of batchedData) {
      if (dp.reserve0 > 0) {
        const price = calculatePrice(
          dp.reserve0,
          dp.reserve1,
          pool.token0.decimals,
          pool.token1.decimals
        );

        prices.push({
          poolId: pool.id,
          poolName: pool.name,
          price,
          priceInverse: price > 0 ? 1 / price : 0,
          reserve0: dp.reserve0,
          reserve1: dp.reserve1,
          blockHeight: dp.height,
          // Use actual block timestamp from Lua (Unix seconds -> milliseconds), fallback to Date.now()
          timestamp: dp.timestamp ? dp.timestamp * 1000 : Date.now(),
        });
      }
    }
  } else {
    // Fallback to individual RPC calls
    for (let height = startHeight; height <= endHeight; height += interval) {
      // Check individual height cache
      const heightCacheKey = `pool:reserves:${pool.id}:${height}`;
      const cachedReserves = await cacheGet<{
        reserve0: string;
        reserve1: string;
        totalSupply: string;
      }>(heightCacheKey);

      let reserves: { reserve0: bigint; reserve1: bigint; totalSupply: bigint } | null = null;

      if (cachedReserves) {
        reserves = {
          reserve0: BigInt(cachedReserves.reserve0),
          reserve1: BigInt(cachedReserves.reserve1),
          totalSupply: BigInt(cachedReserves.totalSupply),
        };
      } else {
        // Fetch from RPC using metashrew_view
        reserves = await fetchPoolReservesAtHeight(poolKey, height);

        // Cache individual height data (long TTL since historical data doesn't change)
        if (reserves) {
          await cacheSet(heightCacheKey, {
            reserve0: reserves.reserve0.toString(),
            reserve1: reserves.reserve1.toString(),
            totalSupply: reserves.totalSupply.toString(),
          }, 86400); // 24 hours
        }
      }

      if (reserves && reserves.reserve0 > 0) {
        const price = calculatePrice(
          reserves.reserve0,
          reserves.reserve1,
          pool.token0.decimals,
          pool.token1.decimals
        );

        prices.push({
          poolId: pool.id,
          poolName: pool.name,
          price,
          priceInverse: price > 0 ? 1 / price : 0,
          reserve0: reserves.reserve0,
          reserve1: reserves.reserve1,
          blockHeight: height,
          timestamp: Date.now(),
        });
      }
    }
  }

  // If we couldn't get any historical data, fall back to current price
  if (prices.length === 0) {
    const currentPrice = await getPoolPrice(poolKey);
    return [currentPrice];
  }

  // Cache the complete result (shorter TTL since it may be extended)
  const serialized: SerializedPoolPrice[] = prices.map(p => ({
    ...p,
    reserve0: p.reserve0.toString(),
    reserve1: p.reserve1.toString(),
  }));
  await cacheSet(cacheKey, serialized, CACHE_TTL_CANDLES);

  return prices;
}

/**
 * Build candles from historical prices
 * Uses actual Unix timestamps from block headers when available
 */
export function buildCandles(
  prices: PoolPrice[],
  candleBlocks: number = 144
): Candle[] {
  if (prices.length === 0) return [];

  const sorted = [...prices].sort((a, b) => a.blockHeight - b.blockHeight);

  const candles: Candle[] = [];
  let candleStartBlock = sorted[0].blockHeight;
  let candleStartTimestamp = sorted[0].timestamp || Date.now();
  let candlePrices: number[] = [];

  for (const price of sorted) {
    if (price.blockHeight >= candleStartBlock + candleBlocks) {
      if (candlePrices.length > 0) {
        candles.push({
          // Use actual Unix timestamp (milliseconds) from first price in candle
          timestamp: candleStartTimestamp,
          open: candlePrices[0],
          high: Math.max(...candlePrices),
          low: Math.min(...candlePrices),
          close: candlePrices[candlePrices.length - 1],
        });
      }

      candleStartBlock = Math.floor(price.blockHeight / candleBlocks) * candleBlocks;
      candleStartTimestamp = price.timestamp || Date.now();
      candlePrices = [price.price];
    } else {
      candlePrices.push(price.price);
    }
  }

  if (candlePrices.length > 0) {
    candles.push({
      timestamp: candleStartTimestamp,
      open: candlePrices[0],
      high: Math.max(...candlePrices),
      low: Math.min(...candlePrices),
      close: candlePrices[candlePrices.length - 1],
    });
  }

  return candles;
}

/**
 * Get current Bitcoin price in USD (with caching)
 * Uses the shared price-fetcher module
 */
export async function getBitcoinPrice(): Promise<BitcoinPrice> {
  const cacheKey = 'btc:price:usd';

  // Try cache first
  const cached = await cacheGet<BitcoinPrice>(cacheKey);
  if (cached) {
    return cached;
  }

  // Use shared price-fetcher module
  const config: PriceFetcherConfig = { dataApiUrl: DATA_API_URL };
  const result = await fetchBtcPriceFromApi(config);

  // Cache the result
  await cacheSet(cacheKey, result, CACHE_TTL_BTC_PRICE);

  return result;
}

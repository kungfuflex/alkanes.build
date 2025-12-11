/**
 * Pool Data Service for fetching AMM pool reserves and prices
 *
 * Uses the Subfrost Data API for pool data with Redis caching
 */
import { cacheGet, cacheSet } from '../redis';

// Pool configuration
export const POOLS = {
  DIESEL_FRBTC: {
    id: '2:77087',
    block: 2,
    tx: 77087,
    name: 'DIESEL/frBTC',
    token0: { block: 2, tx: 0, symbol: 'DIESEL', decimals: 6 },
    token1: { block: 32, tx: 0, symbol: 'frBTC', decimals: 8 },
  },
  DIESEL_BUSD: {
    id: '2:68441',
    block: 2,
    tx: 68441,
    name: 'DIESEL/bUSD',
    token0: { block: 2, tx: 0, symbol: 'DIESEL', decimals: 6 },
    token1: { block: 2, tx: 56801, symbol: 'bUSD', decimals: 6 },
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
 * Get the current block height
 */
export async function getCurrentBlockHeight(): Promise<number> {
  const cacheKey = 'pool:blockHeight';

  // Try cache first (short TTL)
  const cached = await cacheGet<number>(cacheKey);
  if (cached !== null) return cached;

  const result = await rpcCall('metashrew_height', []);
  const height = parseInt(result as string, 10);

  // Cache for 10 seconds
  await cacheSet(cacheKey, height, 10);

  return height;
}

/**
 * Fetch pool data from the Data API
 */
async function fetchPoolFromDataApi(poolId: string): Promise<{
  reserve0: bigint;
  reserve1: bigint;
  totalSupply: bigint;
  name: string;
} | null> {
  try {
    // Use the pools endpoint
    const response = await fetch(`${DATA_API_URL}/pools/${poolId}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error(`Data API error: ${response.status}`);
      return null;
    }

    const data = await response.json() as {
      reserve_a?: string;
      reserve_b?: string;
      total_supply?: string;
      pool_name?: string;
    };

    return {
      reserve0: BigInt(data.reserve_a || '0'),
      reserve1: BigInt(data.reserve_b || '0'),
      totalSupply: BigInt(data.total_supply || '0'),
      name: data.pool_name || '',
    };
  } catch (error) {
    console.error('Failed to fetch pool from Data API:', error);
    return null;
  }
}

/**
 * Fetch all pools data
 */
async function fetchAllPoolsFromDataApi(): Promise<Map<string, {
  reserve0: bigint;
  reserve1: bigint;
  totalSupply: bigint;
  name: string;
}>> {
  const pools = new Map();

  try {
    const response = await fetch(`${DATA_API_URL}/pools`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error(`Data API error: ${response.status}`);
      return pools;
    }

    const data = await response.json() as Array<{
      pool_id?: string;
      reserve_a?: string;
      reserve_b?: string;
      total_supply?: string;
      pool_name?: string;
    }>;

    for (const pool of data) {
      if (pool.pool_id) {
        pools.set(pool.pool_id, {
          reserve0: BigInt(pool.reserve_a || '0'),
          reserve1: BigInt(pool.reserve_b || '0'),
          totalSupply: BigInt(pool.total_supply || '0'),
          name: pool.pool_name || '',
        });
      }
    }
  } catch (error) {
    console.error('Failed to fetch pools from Data API:', error);
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

  // Fetch from Data API
  const data = await fetchPoolFromDataApi(pool.id);

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
 * Fetch pool reserves at a specific block height using alkanes_simulate
 */
async function fetchPoolReservesAtHeight(
  poolId: string,
  blockHeight: number
): Promise<{ reserve0: bigint; reserve1: bigint; totalSupply: bigint } | null> {
  try {
    const [poolBlock, poolTx] = poolId.split(':').map(Number);
    const blockTag = blockHeight.toString();
    const calldata = buildPoolDetailsCalldata(poolBlock, poolTx);

    // Use JSON-RPC to call alkanes_simulate with the pool contract
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alkanes_simulate',
        params: [{
          target: poolId,
          calldata,
          height: blockHeight,
          txindex: 0,
          vout: 0,
          pointer: 0,
          refund_pointer: 0,
          alkanes: [],
          transaction: [],
          block: [],
        }, blockTag],
      }),
    });

    if (!response.ok) {
      console.error(`Failed to fetch reserves at height ${blockHeight}: ${response.status}`);
      return null;
    }

    const json = await response.json() as {
      result?: {
        execution?: {
          data?: string;
        };
        data?: string;
      };
      error?: { message: string };
    };

    if (json.error) {
      console.error(`RPC error fetching reserves at height ${blockHeight}:`, json.error);
      return null;
    }

    // Parse the result - data can be in execution.data or result.data
    const dataHex = json.result?.execution?.data || json.result?.data;
    if (dataHex) {
      return parsePoolDetailsHex(dataHex);
    }

    return null;
  } catch (error) {
    console.error(`Error fetching reserves at height ${blockHeight}:`, error);
    return null;
  }
}

/**
 * Fetch historical pool data using batched lua_evalscript
 * This is more efficient than individual RPC calls for many data points
 */
async function fetchHistoricalPoolDataBatched(
  poolId: string,
  startHeight: number,
  endHeight: number,
  interval: number
): Promise<Array<{ height: number; reserve0: bigint; reserve1: bigint; totalSupply: bigint }>> {
  try {
    // Use lua_evalscript with the pool_candles.lua script
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'lua_evalscript',
        params: [
          'pool_candles', // Script name (loaded from public/lua-examples/)
          [poolId, startHeight.toString(), endHeight.toString(), interval.toString()],
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Lua evalscript failed: ${response.status}`);
      return [];
    }

    const json = await response.json() as {
      result?: {
        data_points?: Array<{
          height: number;
          reserve_a: number;
          reserve_b: number;
          total_supply: number;
        }>;
        error?: string;
      };
      error?: { message: string };
    };

    if (json.error || json.result?.error) {
      console.error('Lua script error:', json.error || json.result?.error);
      return [];
    }

    const dataPoints = json.result?.data_points || [];
    return dataPoints.map(dp => ({
      height: dp.height,
      reserve0: BigInt(Math.floor(dp.reserve_a)),
      reserve1: BigInt(Math.floor(dp.reserve_b)),
      totalSupply: BigInt(Math.floor(dp.total_supply)),
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

  // Try batched Lua script first for efficiency
  const batchedData = await fetchHistoricalPoolDataBatched(pool.id, startHeight, endHeight, interval);

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
          timestamp: Date.now(),
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
        // Fetch from RPC
        reserves = await fetchPoolReservesAtHeight(pool.id, height);

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
 */
export function buildCandles(
  prices: PoolPrice[],
  candleBlocks: number = 144
): Candle[] {
  if (prices.length === 0) return [];

  const sorted = [...prices].sort((a, b) => a.blockHeight - b.blockHeight);

  const candles: Candle[] = [];
  let candleStart = sorted[0].blockHeight;
  let candlePrices: number[] = [];

  for (const price of sorted) {
    if (price.blockHeight >= candleStart + candleBlocks) {
      if (candlePrices.length > 0) {
        candles.push({
          timestamp: candleStart,
          open: candlePrices[0],
          high: Math.max(...candlePrices),
          low: Math.min(...candlePrices),
          close: candlePrices[candlePrices.length - 1],
        });
      }

      candleStart = Math.floor(price.blockHeight / candleBlocks) * candleBlocks;
      candlePrices = [price.price];
    } else {
      candlePrices.push(price.price);
    }
  }

  if (candlePrices.length > 0) {
    candles.push({
      timestamp: candleStart,
      open: candlePrices[0],
      high: Math.max(...candlePrices),
      low: Math.min(...candlePrices),
      close: candlePrices[candlePrices.length - 1],
    });
  }

  return candles;
}

/**
 * Get current Bitcoin price in USD
 */
export async function getBitcoinPrice(): Promise<BitcoinPrice> {
  const cacheKey = 'btc:price:usd';

  // Try cache first
  const cached = await cacheGet<BitcoinPrice>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from Data API
  const response = await fetch(`${DATA_API_URL}/get-bitcoin-price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch BTC price: ${response.status}`);
  }

  const json = await response.json() as {
    data?: { bitcoin?: { usd?: number } };
    bitcoin?: { usd?: number };
  };

  // Handle wrapped response (with data envelope) or direct response
  const btcData = json.data?.bitcoin || json.bitcoin;
  const usd = btcData?.usd;

  if (typeof usd !== 'number') {
    throw new Error('Invalid BTC price response');
  }

  const result: BitcoinPrice = {
    usd,
    timestamp: Date.now(),
  };

  // Cache the result
  await cacheSet(cacheKey, result, CACHE_TTL_BTC_PRICE);

  return result;
}

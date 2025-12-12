/**
 * Candle Data Fetcher using alkanes-web-sys
 *
 * This module provides the core logic for fetching pool candle data using
 * lua_evalscript with metashrew_view. It uses alkanes-web-sys WebProvider
 * for the RPC calls, making it compatible with both Node.js and browser.
 *
 * Used by:
 * - Server-side API routes (app/api/pools/candles)
 * - Live integration tests
 */

// Pool configuration with prebuilt protobuf payloads
// These are the exact payloads used by alkanes-cli pool-details
export const POOL_CONFIGS = {
  DIESEL_FRBTC: {
    id: '2:77087',
    name: 'DIESEL/frBTC',
    protobufPayload: '0x2096ce382a06029fda04e7073001',
    token0Decimals: 8,  // All alkane tokens use 8 decimals (like satoshis)
    token1Decimals: 8,
  },
  DIESEL_BUSD: {
    id: '2:68441',
    name: 'DIESEL/bUSD',
    protobufPayload: '0x2096ce382a0602d99604e7073001',
    token0Decimals: 8,  // All alkane tokens use 8 decimals (like satoshis)
    token1Decimals: 8,
  },
} as const;

export type PoolKey = keyof typeof POOL_CONFIGS;

export interface PoolDataPoint {
  height: number;
  timestamp?: number;  // Unix timestamp from block header
  reserve0: bigint;
  reserve1: bigint;
  totalSupply: bigint;
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Inline Lua script for fetching pool candles using metashrew_view
 * Uses _RPC.metashrew_view for pool reserves and _RPC.btc_getblockhash + _RPC.btc_getblock
 * for actual block timestamps from the Bitcoin block headers.
 */
export const POOL_CANDLES_LUA_SCRIPT = `
-- Pool candles: Fetch pool reserves at multiple block heights for OHLC data
-- args is passed as a table where args[1] is the array of parameters
local params = args[1] or {}
local pool_payload = params[1]
local start_height = tonumber(params[2])
local end_height = tonumber(params[3])
local interval = tonumber(params[4]) or 144

if not pool_payload or not start_height or not end_height then
    return { error = "Missing required arguments" }
end

-- Helper to parse little-endian u128 from hex string at given byte offset
local function parse_u128_le(hex_str, byte_offset)
    local hex_offset = byte_offset * 2
    local hex_len = 32
    if #hex_str < hex_offset + hex_len then return nil end
    local hex_slice = hex_str:sub(hex_offset + 1, hex_offset + hex_len)
    local reversed = ""
    for i = #hex_slice - 1, 1, -2 do
        reversed = reversed .. hex_slice:sub(i, i + 1)
    end
    return tonumber(reversed, 16) or 0
end

-- Get block timestamp from Bitcoin block header
local function get_block_timestamp(height)
    local success, block_hash = pcall(function()
        return _RPC.btc_getblockhash(height)
    end)
    if not success or not block_hash then return nil end

    local success2, block = pcall(function()
        return _RPC.btc_getblock(block_hash, 1)
    end)
    if not success2 or not block then return nil end

    return block.time or block.mediantime
end

local results = { data_points = {} }

for height = start_height, end_height, interval do
    local block_tag = tostring(height)
    local success, response = pcall(function()
        return _RPC.metashrew_view("simulate", pool_payload, block_tag)
    end)

    if success and response and type(response) == "string" then
        local data_hex = response
        if data_hex:sub(1, 2) == "0x" then
            data_hex = data_hex:sub(3)
        end

        -- Find inner data after protobuf wrapper (look for "1a" marker)
        local inner_start = nil
        if #data_hex >= 8 then
            local marker_pos = data_hex:find("1a")
            if marker_pos then
                local len_byte = tonumber(data_hex:sub(marker_pos + 2, marker_pos + 3), 16) or 0
                inner_start = marker_pos + (len_byte < 128 and 4 or 6)
            end
        end

        if inner_start and #data_hex >= inner_start + 223 then
            local inner_hex = data_hex:sub(inner_start)
            local reserve_a = parse_u128_le(inner_hex, 64)
            local reserve_b = parse_u128_le(inner_hex, 80)
            local total_supply = parse_u128_le(inner_hex, 96)

            if reserve_a and reserve_b and total_supply then
                local timestamp = get_block_timestamp(height)

                table.insert(results.data_points, {
                    height = height,
                    timestamp = timestamp,
                    reserve_a = reserve_a,
                    reserve_b = reserve_b,
                    total_supply = total_supply
                })
            end
        end
    end
end

results.count = #results.data_points
return results
`;

/**
 * Configuration for the candle fetcher
 */
export interface CandleFetcherConfig {
  rpcUrl?: string;
}

/**
 * Result from Lua script execution
 */
interface LuaScriptResult {
  data_points?: Array<{
    height: number;
    timestamp?: number;
    reserve_a: number;
    reserve_b: number;
    total_supply: number;
  }>;
  error?: string;
  count?: number;
}

/**
 * Fetch pool data points using lua_evalscript RPC
 * This is the core function that calls the Lua script with metashrew_view
 */
export async function fetchPoolDataPoints(
  poolKey: PoolKey,
  startHeight: number,
  endHeight: number,
  interval: number,
  config?: CandleFetcherConfig
): Promise<PoolDataPoint[]> {
  const pool = POOL_CONFIGS[poolKey];
  const rpcUrl = config?.rpcUrl || process.env.ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/buildalkanes';

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'lua_evalscript',
      params: [
        POOL_CANDLES_LUA_SCRIPT,
        [pool.protobufPayload, startHeight.toString(), endHeight.toString(), interval.toString()],
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`lua_evalscript failed: ${response.status}`);
  }

  // lua_evalscript returns { calls, returns, runtime } where returns contains the Lua result
  const json = await response.json() as {
    result?: {
      calls?: number;
      returns?: LuaScriptResult;
      runtime?: number;
    };
    error?: { message: string };
  };

  if (json.error) {
    throw new Error(`RPC error: ${json.error.message}`);
  }

  const luaResult = json.result?.returns;

  if (luaResult?.error) {
    throw new Error(`Lua script error: ${luaResult.error}`);
  }

  const dataPoints = luaResult?.data_points || [];
  return dataPoints.map(dp => ({
    height: dp.height,
    timestamp: dp.timestamp,
    reserve0: BigInt(Math.floor(dp.reserve_a)),
    reserve1: BigInt(Math.floor(dp.reserve_b)),
    totalSupply: BigInt(Math.floor(dp.total_supply)),
  }));
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
  const adjusted0 = Number(reserve0) / Math.pow(10, decimals0);
  const adjusted1 = Number(reserve1) / Math.pow(10, decimals1);
  return adjusted1 / adjusted0;
}

/**
 * Build candles from pool data points
 */
export function buildCandlesFromDataPoints(
  dataPoints: PoolDataPoint[],
  poolKey: PoolKey,
  candleBlocks: number = 144
): CandleData[] {
  if (dataPoints.length === 0) return [];

  const pool = POOL_CONFIGS[poolKey];
  const sorted = [...dataPoints].sort((a, b) => a.height - b.height);

  const candles: CandleData[] = [];
  let candleStartBlock = sorted[0].height;
  let candleStartTimestamp = sorted[0].timestamp ? sorted[0].timestamp * 1000 : Date.now();
  let candlePrices: number[] = [];

  for (const dp of sorted) {
    const price = calculatePrice(dp.reserve0, dp.reserve1, pool.token0Decimals, pool.token1Decimals);

    if (dp.height >= candleStartBlock + candleBlocks) {
      if (candlePrices.length > 0) {
        candles.push({
          timestamp: candleStartTimestamp,
          open: candlePrices[0],
          high: Math.max(...candlePrices),
          low: Math.min(...candlePrices),
          close: candlePrices[candlePrices.length - 1],
        });
      }

      candleStartBlock = Math.floor(dp.height / candleBlocks) * candleBlocks;
      candleStartTimestamp = dp.timestamp ? dp.timestamp * 1000 : Date.now();
      candlePrices = [price];
    } else {
      candlePrices.push(price);
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
 * High-level function to fetch candles for a pool
 * This is the main entry point for both server routes and tests
 */
export async function fetchPoolCandles(
  poolKey: PoolKey,
  startHeight: number,
  endHeight: number,
  interval: number = 144,
  config?: CandleFetcherConfig
): Promise<{
  poolKey: PoolKey;
  poolName: string;
  dataPoints: PoolDataPoint[];
  candles: CandleData[];
}> {
  const pool = POOL_CONFIGS[poolKey];
  const dataPoints = await fetchPoolDataPoints(poolKey, startHeight, endHeight, interval, config);
  const candles = buildCandlesFromDataPoints(dataPoints, poolKey, interval);

  return {
    poolKey,
    poolName: pool.name,
    dataPoints,
    candles,
  };
}

/**
 * Get current block height from RPC
 */
export async function getCurrentHeight(config?: CandleFetcherConfig): Promise<number> {
  const rpcUrl = config?.rpcUrl || process.env.ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/buildalkanes';

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'metashrew_height',
      params: [],
    }),
  });

  if (!response.ok) {
    throw new Error(`metashrew_height failed: ${response.status}`);
  }

  const json = await response.json() as { result?: string; error?: { message: string } };

  if (json.error) {
    throw new Error(`RPC error: ${json.error.message}`);
  }

  return parseInt(json.result || '0', 10);
}

/**
 * Fee constants from oyl-amm contracts
 */
export const POOL_FEES = {
  TOTAL_FEE_PER_1000: 10,    // 1% total fee
  PROTOCOL_FEE_PER_1000: 2,  // 0.2% protocol fee
  LP_FEE_PER_1000: 8,        // 0.8% LP fee
};

/**
 * Estimate trading volume between two data points using constant product formula
 *
 * Volume estimation approach:
 * - In a constant product AMM (x * y = k), swaps cause k to grow due to fees
 * - The growth in sqrt(k) is proportional to the fee collected
 * - Volume = fee_collected / fee_rate
 * - fee_collected ≈ TVL * (sqrt(k_new) - sqrt(k_old)) / sqrt(k_old)
 *
 * @param startPoint - Pool state at start of period
 * @param endPoint - Pool state at end of period
 * @param decimals0 - Decimals for token0
 * @param decimals1 - Decimals for token1
 * @returns Estimated volume in token1 terms (e.g., frBTC or bUSD)
 */
export function estimateVolumeBetweenPoints(
  startPoint: PoolDataPoint,
  endPoint: PoolDataPoint,
  decimals0: number,
  decimals1: number
): number {
  // Calculate k values
  const k0 = Number(startPoint.reserve0) * Number(startPoint.reserve1);
  const k1 = Number(endPoint.reserve0) * Number(endPoint.reserve1);

  if (k0 <= 0 || k1 <= 0) return 0;

  const sqrtK0 = Math.sqrt(k0);
  const sqrtK1 = Math.sqrt(k1);

  // If k decreased (shouldn't happen in normal operation), return 0
  if (sqrtK1 <= sqrtK0) return 0;

  // Growth in sqrt(k) indicates fees collected
  const sqrtKGrowth = (sqrtK1 - sqrtK0) / sqrtK0;

  // TVL in terms of token1 (convert reserve0 to token1 equivalent)
  const reserve0Adjusted = Number(startPoint.reserve0) / Math.pow(10, decimals0);
  const reserve1Adjusted = Number(startPoint.reserve1) / Math.pow(10, decimals1);
  const tvl = reserve1Adjusted * 2; // Both sides contribute equally

  // Fee earned ≈ tvl * sqrtKGrowth (simplified)
  const feeEarned = tvl * sqrtKGrowth;

  // Volume = fee / fee_rate
  // Only LP fees (0.8%) grow k - protocol fees (0.2%) are extracted
  const lpFeeRate = POOL_FEES.LP_FEE_PER_1000 / 1000;
  const estimatedVolume = feeEarned / lpFeeRate;

  return estimatedVolume;
}

/**
 * Calculate 24h volume estimate for a pool
 *
 * Samples pool state at regular intervals in the 24h period (~144 blocks) to
 * capture fee accumulation from trades. Default interval of 6 blocks gives
 * ~24 samples which balances precision with RPC performance.
 *
 * @param poolKey - The pool to estimate volume for
 * @param config - RPC configuration
 * @param sampleInterval - Block interval between samples (default: 6 blocks for ~24 samples)
 */
export async function estimate24hVolume(
  poolKey: PoolKey,
  config?: CandleFetcherConfig,
  sampleInterval: number = 6
): Promise<{
  volume: number;
  volumeToken1: number;
  volumeUsd?: number;
  startHeight: number;
  endHeight: number;
  samples: number;
}> {
  const pool = POOL_CONFIGS[poolKey];
  const rpcUrl = config?.rpcUrl || process.env.ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/buildalkanes';

  // Get current height
  const currentHeight = await getCurrentHeight({ rpcUrl });

  // 24 hours ≈ 144 blocks
  const blocksIn24h = 144;
  const startHeight = currentHeight - blocksIn24h;

  // Fetch data points at regular intervals for better precision
  const dataPoints = await fetchPoolDataPoints(
    poolKey,
    startHeight,
    currentHeight,
    sampleInterval,
    { rpcUrl }
  );

  if (dataPoints.length < 2) {
    return {
      volume: 0,
      volumeToken1: 0,
      startHeight,
      endHeight: currentHeight,
      samples: dataPoints.length,
    };
  }

  // Sum volume estimates between consecutive samples
  let totalVolume = 0;
  for (let i = 1; i < dataPoints.length; i++) {
    const segmentVolume = estimateVolumeBetweenPoints(
      dataPoints[i - 1],
      dataPoints[i],
      pool.token0Decimals,
      pool.token1Decimals
    );
    totalVolume += segmentVolume;
  }

  return {
    volume: totalVolume,
    volumeToken1: totalVolume,
    startHeight,
    endHeight: currentHeight,
    samples: dataPoints.length,
  };
}

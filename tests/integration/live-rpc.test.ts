/**
 * Live Integration Tests for Pool Candle Data and Price Metrics
 *
 * These tests verify that the candle computation and price fetching logic
 * works correctly against the live Alkanes RPC/Data API infrastructure.
 *
 * To run these tests:
 *   npm run test:live
 *
 * Environment:
 *   RPC_URL - Override the default RPC endpoint
 *   DATA_API_URL - Override the default Data API endpoint
 */

import { describe, it, expect } from "vitest";
import {
  fetchPoolCandles,
  fetchPoolDataPoints,
  getCurrentHeight,
  POOL_CONFIGS,
  calculatePrice,
  estimate24hVolume,
  estimateVolumeBetweenPoints,
  POOL_FEES,
  type PoolKey,
  type CandleFetcherConfig,
} from "@/lib/pools/candle-fetcher";
import {
  fetchBitcoinPrice,
  fetchDieselPriceMetrics,
  calculateDieselUsdPrice,
  type PriceFetcherConfig,
} from "@/lib/pools/price-fetcher";

// Skip all tests unless explicitly running integration tests
const runIntegration = process.env.RUN_INTEGRATION === "true";

// Set longer timeout for network calls
const TEST_TIMEOUT = 60000; // 60 seconds

const rpcConfig: CandleFetcherConfig = {
  rpcUrl: process.env.RPC_URL || "https://mainnet.subfrost.io/v4/buildalkanes",
};

const priceConfig: PriceFetcherConfig = {
  dataApiUrl: process.env.DATA_API_URL || "https://mainnet.subfrost.io/v4/buildalkanes",
};

describe.skipIf(!runIntegration)("Live Pool Candle Integration Tests", () => {
  describe("getCurrentHeight", () => {
    it("should return current block height", async () => {
      const height = await getCurrentHeight(rpcConfig);

      expect(height).toBeGreaterThan(900000);
      console.log(`Current block height: ${height}`);
    });
  });

  describe("fetchPoolDataPoints", () => {
    it("should fetch DIESEL/frBTC data points for last 7 blocks", async () => {
      const currentHeight = await getCurrentHeight(rpcConfig);
      const startHeight = currentHeight - 7 * 144; // ~7 days
      const interval = 144; // ~1 day

      console.log(`Fetching DIESEL/frBTC data from block ${startHeight} to ${currentHeight}...`);

      const dataPoints = await fetchPoolDataPoints(
        "DIESEL_FRBTC",
        startHeight,
        currentHeight,
        interval,
        rpcConfig
      );

      expect(dataPoints.length).toBeGreaterThan(0);
      console.log(`Got ${dataPoints.length} data points`);

      // Verify data structure
      for (const dp of dataPoints) {
        expect(dp.height).toBeGreaterThanOrEqual(startHeight);
        expect(dp.height).toBeLessThanOrEqual(currentHeight);
        expect(dp.reserve0).toBeGreaterThan(BigInt(0));
        expect(dp.reserve1).toBeGreaterThan(BigInt(0));
        expect(dp.totalSupply).toBeGreaterThan(BigInt(0));

        // Calculate and log price
        const price = calculatePrice(
          dp.reserve0,
          dp.reserve1,
          POOL_CONFIGS.DIESEL_FRBTC.token0Decimals,
          POOL_CONFIGS.DIESEL_FRBTC.token1Decimals
        );

        const timestampStr = dp.timestamp
          ? new Date(dp.timestamp * 1000).toISOString()
          : "N/A";

        console.log(
          `  Block ${dp.height}: price=${price.toFixed(8)} frBTC/DIESEL, ` +
          `timestamp=${timestampStr}`
        );
      }
    }, TEST_TIMEOUT);

    it("should fetch DIESEL/bUSD data points for last 7 blocks", async () => {
      const currentHeight = await getCurrentHeight(rpcConfig);
      const startHeight = currentHeight - 7 * 144;
      const interval = 144;

      console.log(`Fetching DIESEL/bUSD data from block ${startHeight} to ${currentHeight}...`);

      const dataPoints = await fetchPoolDataPoints(
        "DIESEL_BUSD",
        startHeight,
        currentHeight,
        interval,
        rpcConfig
      );

      expect(dataPoints.length).toBeGreaterThan(0);
      console.log(`Got ${dataPoints.length} data points`);

      for (const dp of dataPoints) {
        const price = calculatePrice(
          dp.reserve0,
          dp.reserve1,
          POOL_CONFIGS.DIESEL_BUSD.token0Decimals,
          POOL_CONFIGS.DIESEL_BUSD.token1Decimals
        );

        const timestampStr = dp.timestamp
          ? new Date(dp.timestamp * 1000).toISOString()
          : "N/A";

        console.log(
          `  Block ${dp.height}: price=${price.toFixed(4)} bUSD/DIESEL, ` +
          `timestamp=${timestampStr}`
        );
      }
    }, TEST_TIMEOUT);
  });

  describe("fetchPoolCandles", () => {
    it("should fetch and build DIESEL/frBTC candles", async () => {
      const currentHeight = await getCurrentHeight(rpcConfig);
      const startHeight = currentHeight - 14 * 144; // ~14 days
      const interval = 144;

      console.log(`Building DIESEL/frBTC candles...`);

      const result = await fetchPoolCandles(
        "DIESEL_FRBTC",
        startHeight,
        currentHeight,
        interval,
        rpcConfig
      );

      expect(result.poolKey).toBe("DIESEL_FRBTC");
      expect(result.poolName).toBe("DIESEL/frBTC");
      expect(result.dataPoints.length).toBeGreaterThan(0);
      expect(result.candles.length).toBeGreaterThan(0);

      console.log(`Got ${result.dataPoints.length} data points, ${result.candles.length} candles`);

      for (const candle of result.candles) {
        expect(candle.open).toBeGreaterThan(0);
        expect(candle.high).toBeGreaterThanOrEqual(candle.open);
        expect(candle.high).toBeGreaterThanOrEqual(candle.close);
        expect(candle.low).toBeLessThanOrEqual(candle.open);
        expect(candle.low).toBeLessThanOrEqual(candle.close);
        expect(candle.timestamp).toBeGreaterThan(0);

        const dateStr = new Date(candle.timestamp).toISOString();
        console.log(
          `  ${dateStr}: O=${candle.open.toFixed(8)} H=${candle.high.toFixed(8)} ` +
          `L=${candle.low.toFixed(8)} C=${candle.close.toFixed(8)}`
        );
      }
    }, TEST_TIMEOUT);

    it("should fetch and build DIESEL/bUSD candles", async () => {
      const currentHeight = await getCurrentHeight(rpcConfig);
      const startHeight = currentHeight - 14 * 144;
      const interval = 144;

      console.log(`Building DIESEL/bUSD candles...`);

      const result = await fetchPoolCandles(
        "DIESEL_BUSD",
        startHeight,
        currentHeight,
        interval,
        rpcConfig
      );

      expect(result.poolKey).toBe("DIESEL_BUSD");
      expect(result.poolName).toBe("DIESEL/bUSD");
      expect(result.dataPoints.length).toBeGreaterThan(0);
      expect(result.candles.length).toBeGreaterThan(0);

      console.log(`Got ${result.dataPoints.length} data points, ${result.candles.length} candles`);

      for (const candle of result.candles) {
        const dateStr = new Date(candle.timestamp).toISOString();
        console.log(
          `  ${dateStr}: O=${candle.open.toFixed(4)} H=${candle.high.toFixed(4)} ` +
          `L=${candle.low.toFixed(4)} C=${candle.close.toFixed(4)}`
        );
      }
    }, TEST_TIMEOUT);
  });

  describe("price consistency", () => {
    it("should have consistent prices between pools", async () => {
      const currentHeight = await getCurrentHeight(rpcConfig);

      // Fetch current data for both pools
      const [frbtcData, busdData] = await Promise.all([
        fetchPoolDataPoints("DIESEL_FRBTC", currentHeight - 144, currentHeight, 144, rpcConfig),
        fetchPoolDataPoints("DIESEL_BUSD", currentHeight - 144, currentHeight, 144, rpcConfig),
      ]);

      expect(frbtcData.length).toBeGreaterThan(0);
      expect(busdData.length).toBeGreaterThan(0);

      const frbtcPrice = calculatePrice(
        frbtcData[frbtcData.length - 1].reserve0,
        frbtcData[frbtcData.length - 1].reserve1,
        6, 8
      );

      const busdPrice = calculatePrice(
        busdData[busdData.length - 1].reserve0,
        busdData[busdData.length - 1].reserve1,
        6, 6
      );

      console.log(`Current DIESEL prices:`);
      console.log(`  vs frBTC: ${frbtcPrice.toFixed(8)} frBTC/DIESEL`);
      console.log(`  vs bUSD: ${busdPrice.toFixed(4)} bUSD/DIESEL`);

      // Both prices should be positive
      expect(frbtcPrice).toBeGreaterThan(0);
      expect(busdPrice).toBeGreaterThan(0);
    }, TEST_TIMEOUT);
  });
});

describe.skipIf(!runIntegration)("Live Price Metrics Integration Tests", () => {
  describe("fetchBitcoinPrice", () => {
    it("should fetch current BTC price in USD", async () => {
      const btcPrice = await fetchBitcoinPrice(priceConfig);

      // BTC price should be positive and reasonable (between $1k and $1M)
      expect(btcPrice.usd).toBeGreaterThan(1000);
      expect(btcPrice.usd).toBeLessThan(1000000);
      expect(btcPrice.timestamp).toBeGreaterThan(0);

      console.log(`Current BTC price: $${btcPrice.usd.toLocaleString()}`);
    }, TEST_TIMEOUT);
  });

  describe("calculateDieselUsdPrice", () => {
    it("should calculate DIESEL USD price from frBTC price", () => {
      // Example: DIESEL = 0.0000005 frBTC, BTC = $100,000
      // DIESEL USD = 0.0000005 * 100000 = $0.05
      const dieselFrbtcPrice = 0.0000005;
      const btcUsdPrice = 100000;

      const dieselUsd = calculateDieselUsdPrice(dieselFrbtcPrice, btcUsdPrice);

      expect(dieselUsd).toBeCloseTo(0.05, 6);
      console.log(`Test calculation: ${dieselFrbtcPrice} frBTC * $${btcUsdPrice} = $${dieselUsd.toFixed(4)}`);
    });
  });

  describe("fetchDieselPriceMetrics", () => {
    it("should fetch comprehensive DIESEL price metrics", async () => {
      // First get pool prices from live data
      const currentHeight = await getCurrentHeight(rpcConfig);

      const [frbtcData, busdData] = await Promise.all([
        fetchPoolDataPoints("DIESEL_FRBTC", currentHeight - 144, currentHeight, 144, rpcConfig),
        fetchPoolDataPoints("DIESEL_BUSD", currentHeight - 144, currentHeight, 144, rpcConfig),
      ]);

      expect(frbtcData.length).toBeGreaterThan(0);
      expect(busdData.length).toBeGreaterThan(0);

      const dieselFrbtcPrice = calculatePrice(
        frbtcData[frbtcData.length - 1].reserve0,
        frbtcData[frbtcData.length - 1].reserve1,
        POOL_CONFIGS.DIESEL_FRBTC.token0Decimals,
        POOL_CONFIGS.DIESEL_FRBTC.token1Decimals
      );

      const dieselBusdPrice = calculatePrice(
        busdData[busdData.length - 1].reserve0,
        busdData[busdData.length - 1].reserve1,
        POOL_CONFIGS.DIESEL_BUSD.token0Decimals,
        POOL_CONFIGS.DIESEL_BUSD.token1Decimals
      );

      // Fetch comprehensive metrics
      const metrics = await fetchDieselPriceMetrics(
        dieselFrbtcPrice,
        dieselBusdPrice,
        priceConfig
      );

      // Verify all metrics are present and reasonable
      expect(metrics.dieselFrbtcPrice).toBe(dieselFrbtcPrice);
      expect(metrics.dieselBusdPrice).toBe(dieselBusdPrice);
      expect(metrics.btcUsdPrice).toBeGreaterThan(1000);
      expect(metrics.dieselUsdViaFrbtc).toBeGreaterThan(0);
      expect(metrics.timestamp).toBeGreaterThan(0);

      // Log all the metrics
      console.log(`\nDIESEL Price Metrics:`);
      console.log(`  DIESEL/frBTC: ${metrics.dieselFrbtcPrice.toFixed(8)} frBTC`);
      console.log(`  DIESEL/bUSD:  ${metrics.dieselBusdPrice.toFixed(4)} bUSD`);
      console.log(`  BTC/USD:      $${metrics.btcUsdPrice.toLocaleString()}`);
      console.log(`  DIESEL/USD:   $${metrics.dieselUsdViaFrbtc.toFixed(4)} (via frBTC)`);

      // Compare bUSD price vs calculated USD price (should be similar if market is efficient)
      const priceDifference = Math.abs(metrics.dieselBusdPrice - metrics.dieselUsdViaFrbtc);
      const percentDiff = (priceDifference / metrics.dieselBusdPrice) * 100;
      console.log(`\nPrice Comparison:`);
      console.log(`  bUSD price:   $${metrics.dieselBusdPrice.toFixed(4)}`);
      console.log(`  frBTC->USD:   $${metrics.dieselUsdViaFrbtc.toFixed(4)}`);
      console.log(`  Difference:   ${percentDiff.toFixed(2)}%`);
    }, TEST_TIMEOUT);
  });

  describe("end-to-end price flow", () => {
    it("should fetch all price data in a single flow", async () => {
      console.log("\n=== End-to-End Price Data Flow ===\n");

      // 1. Get current block height
      const currentHeight = await getCurrentHeight(rpcConfig);
      console.log(`1. Current block height: ${currentHeight}`);

      // 2. Fetch pool data for both pools
      const [frbtcData, busdData] = await Promise.all([
        fetchPoolDataPoints("DIESEL_FRBTC", currentHeight, currentHeight, 1, rpcConfig),
        fetchPoolDataPoints("DIESEL_BUSD", currentHeight, currentHeight, 1, rpcConfig),
      ]);

      expect(frbtcData.length).toBeGreaterThan(0);
      expect(busdData.length).toBeGreaterThan(0);

      const dieselFrbtcPrice = calculatePrice(
        frbtcData[0].reserve0,
        frbtcData[0].reserve1,
        POOL_CONFIGS.DIESEL_FRBTC.token0Decimals,
        POOL_CONFIGS.DIESEL_FRBTC.token1Decimals
      );

      const dieselBusdPrice = calculatePrice(
        busdData[0].reserve0,
        busdData[0].reserve1,
        POOL_CONFIGS.DIESEL_BUSD.token0Decimals,
        POOL_CONFIGS.DIESEL_BUSD.token1Decimals
      );

      console.log(`2. Pool prices fetched:`);
      console.log(`   DIESEL/frBTC: ${dieselFrbtcPrice.toFixed(8)}`);
      console.log(`   DIESEL/bUSD:  ${dieselBusdPrice.toFixed(4)}`);

      // 3. Fetch BTC price
      const btcPrice = await fetchBitcoinPrice(priceConfig);
      console.log(`3. BTC price: $${btcPrice.usd.toLocaleString()}`);

      // 4. Calculate DIESEL USD price
      const dieselUsd = calculateDieselUsdPrice(dieselFrbtcPrice, btcPrice.usd);
      console.log(`4. DIESEL/USD (calculated): $${dieselUsd.toFixed(4)}`);

      // 5. Summary
      console.log(`\n=== Summary ===`);
      console.log(`DIESEL token value: $${dieselUsd.toFixed(4)}`);
      console.log(`Equivalent to: ${(dieselFrbtcPrice * 100000000).toFixed(2)} sats`);

      // All values should be positive
      expect(dieselFrbtcPrice).toBeGreaterThan(0);
      expect(dieselBusdPrice).toBeGreaterThan(0);
      expect(btcPrice.usd).toBeGreaterThan(0);
      expect(dieselUsd).toBeGreaterThan(0);
    }, TEST_TIMEOUT);
  });
});

describe.skipIf(!runIntegration)("Live Volume Estimation Integration Tests", () => {
  describe("POOL_FEES constants", () => {
    it("should have correct fee structure", () => {
      // Verify fee constants match oyl-amm contracts
      expect(POOL_FEES.TOTAL_FEE_PER_1000).toBe(10);    // 1%
      expect(POOL_FEES.PROTOCOL_FEE_PER_1000).toBe(2);  // 0.2%
      expect(POOL_FEES.LP_FEE_PER_1000).toBe(8);        // 0.8%

      // Verify LP + protocol = total
      expect(POOL_FEES.LP_FEE_PER_1000 + POOL_FEES.PROTOCOL_FEE_PER_1000)
        .toBe(POOL_FEES.TOTAL_FEE_PER_1000);

      console.log("Fee structure verified:");
      console.log(`  Total fee:    ${POOL_FEES.TOTAL_FEE_PER_1000 / 10}%`);
      console.log(`  Protocol fee: ${POOL_FEES.PROTOCOL_FEE_PER_1000 / 10}%`);
      console.log(`  LP fee:       ${POOL_FEES.LP_FEE_PER_1000 / 10}%`);
    });
  });

  describe("estimateVolumeBetweenPoints", () => {
    it("should estimate volume from pool data changes for DIESEL/frBTC", async () => {
      const currentHeight = await getCurrentHeight(rpcConfig);
      const blocksIn24h = 144;
      const startHeight = currentHeight - blocksIn24h;

      console.log(`\nFetching DIESEL/frBTC pool state at blocks ${startHeight} and ${currentHeight}...`);

      // Fetch data at start and end of 24h period
      const [startData, endData] = await Promise.all([
        fetchPoolDataPoints("DIESEL_FRBTC", startHeight, startHeight, 1, rpcConfig),
        fetchPoolDataPoints("DIESEL_FRBTC", currentHeight, currentHeight, 1, rpcConfig),
      ]);

      expect(startData.length).toBeGreaterThan(0);
      expect(endData.length).toBeGreaterThan(0);

      const start = startData[0];
      const end = endData[0];

      console.log(`\nPool state comparison:`);
      console.log(`  Start (block ${start.height}):`);
      console.log(`    reserve0: ${start.reserve0.toString()}`);
      console.log(`    reserve1: ${start.reserve1.toString()}`);
      console.log(`    totalSupply: ${start.totalSupply.toString()}`);
      console.log(`  End (block ${end.height}):`);
      console.log(`    reserve0: ${end.reserve0.toString()}`);
      console.log(`    reserve1: ${end.reserve1.toString()}`);
      console.log(`    totalSupply: ${end.totalSupply.toString()}`);

      // Calculate k values
      const k0 = Number(start.reserve0) * Number(start.reserve1);
      const k1 = Number(end.reserve0) * Number(end.reserve1);
      const sqrtK0 = Math.sqrt(k0);
      const sqrtK1 = Math.sqrt(k1);

      console.log(`\nConstant product analysis:`);
      console.log(`  k_start: ${k0.toExponential(4)}`);
      console.log(`  k_end:   ${k1.toExponential(4)}`);
      console.log(`  sqrt(k) growth: ${((sqrtK1 - sqrtK0) / sqrtK0 * 100).toFixed(6)}%`);

      // Estimate volume
      const volume = estimateVolumeBetweenPoints(
        start,
        end,
        POOL_CONFIGS.DIESEL_FRBTC.token0Decimals,
        POOL_CONFIGS.DIESEL_FRBTC.token1Decimals
      );

      console.log(`\n24h Volume Estimate (DIESEL/frBTC):`);
      console.log(`  Volume: ${volume.toFixed(8)} frBTC`);

      // Volume should be non-negative
      expect(volume).toBeGreaterThanOrEqual(0);
    }, TEST_TIMEOUT);

    it("should estimate volume from pool data changes for DIESEL/bUSD", async () => {
      const currentHeight = await getCurrentHeight(rpcConfig);
      const blocksIn24h = 144;
      const startHeight = currentHeight - blocksIn24h;

      console.log(`\nFetching DIESEL/bUSD pool state at blocks ${startHeight} and ${currentHeight}...`);

      const [startData, endData] = await Promise.all([
        fetchPoolDataPoints("DIESEL_BUSD", startHeight, startHeight, 1, rpcConfig),
        fetchPoolDataPoints("DIESEL_BUSD", currentHeight, currentHeight, 1, rpcConfig),
      ]);

      expect(startData.length).toBeGreaterThan(0);
      expect(endData.length).toBeGreaterThan(0);

      const start = startData[0];
      const end = endData[0];

      console.log(`\nPool state comparison:`);
      console.log(`  Start (block ${start.height}):`);
      console.log(`    reserve0: ${start.reserve0.toString()}`);
      console.log(`    reserve1: ${start.reserve1.toString()}`);
      console.log(`  End (block ${end.height}):`);
      console.log(`    reserve0: ${end.reserve0.toString()}`);
      console.log(`    reserve1: ${end.reserve1.toString()}`);

      const volume = estimateVolumeBetweenPoints(
        start,
        end,
        POOL_CONFIGS.DIESEL_BUSD.token0Decimals,
        POOL_CONFIGS.DIESEL_BUSD.token1Decimals
      );

      console.log(`\n24h Volume Estimate (DIESEL/bUSD):`);
      console.log(`  Volume: ${volume.toFixed(2)} bUSD`);

      expect(volume).toBeGreaterThanOrEqual(0);
    }, TEST_TIMEOUT);
  });

  describe("estimate24hVolume", () => {
    it("should estimate 24h volume for DIESEL/frBTC pool", async () => {
      console.log("\n=== 24h Volume Estimation: DIESEL/frBTC ===\n");

      const result = await estimate24hVolume("DIESEL_FRBTC", rpcConfig);

      console.log(`Block range: ${result.startHeight} -> ${result.endHeight}`);
      console.log(`Blocks covered: ${result.endHeight - result.startHeight}`);
      console.log(`Volume (frBTC): ${result.volumeToken1.toFixed(8)}`);

      // Volume should be non-negative
      expect(result.volume).toBeGreaterThanOrEqual(0);
      expect(result.volumeToken1).toBeGreaterThanOrEqual(0);
      expect(result.startHeight).toBeLessThan(result.endHeight);
      expect(result.endHeight - result.startHeight).toBe(144); // ~24 hours
    }, TEST_TIMEOUT);

    it("should estimate 24h volume for DIESEL/bUSD pool", async () => {
      console.log("\n=== 24h Volume Estimation: DIESEL/bUSD ===\n");

      const result = await estimate24hVolume("DIESEL_BUSD", rpcConfig);

      console.log(`Block range: ${result.startHeight} -> ${result.endHeight}`);
      console.log(`Blocks covered: ${result.endHeight - result.startHeight}`);
      console.log(`Volume (bUSD): ${result.volumeToken1.toFixed(2)}`);

      expect(result.volume).toBeGreaterThanOrEqual(0);
      expect(result.volumeToken1).toBeGreaterThanOrEqual(0);
      expect(result.startHeight).toBeLessThan(result.endHeight);
    }, TEST_TIMEOUT);
  });

  describe("volume with USD conversion", () => {
    it("should calculate volume in USD terms", async () => {
      console.log("\n=== 24h Volume in USD ===\n");

      // Fetch volumes and BTC price in parallel
      const [frbtcVolume, busdVolume, btcPrice] = await Promise.all([
        estimate24hVolume("DIESEL_FRBTC", rpcConfig),
        estimate24hVolume("DIESEL_BUSD", rpcConfig),
        fetchBitcoinPrice(priceConfig),
      ]);

      // Calculate USD volumes
      const frbtcVolumeUsd = frbtcVolume.volumeToken1 * btcPrice.usd;
      const busdVolumeUsd = busdVolume.volumeToken1; // bUSD is already in USD

      const totalVolumeUsd = frbtcVolumeUsd + busdVolumeUsd;

      console.log(`BTC Price: $${btcPrice.usd.toLocaleString()}`);
      console.log(`\nDIESEL/frBTC Pool:`);
      console.log(`  Volume: ${frbtcVolume.volumeToken1.toFixed(8)} frBTC`);
      console.log(`  Volume: $${frbtcVolumeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD`);
      console.log(`\nDIESEL/bUSD Pool:`);
      console.log(`  Volume: ${busdVolume.volumeToken1.toFixed(2)} bUSD`);
      console.log(`  Volume: $${busdVolumeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD`);
      console.log(`\nTotal 24h Volume: $${totalVolumeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD`);

      // Volumes should be non-negative
      expect(frbtcVolumeUsd).toBeGreaterThanOrEqual(0);
      expect(busdVolumeUsd).toBeGreaterThanOrEqual(0);
    }, TEST_TIMEOUT);
  });

  describe("end-to-end volume and metrics flow", () => {
    it("should fetch complete pool metrics including volume", async () => {
      console.log("\n=== Complete Pool Metrics ===\n");

      // Get current height
      const currentHeight = await getCurrentHeight(rpcConfig);
      console.log(`Current block height: ${currentHeight}`);

      // Fetch all data in parallel
      const [
        frbtcData,
        busdData,
        frbtcVolume,
        busdVolume,
        btcPrice,
      ] = await Promise.all([
        fetchPoolDataPoints("DIESEL_FRBTC", currentHeight, currentHeight, 1, rpcConfig),
        fetchPoolDataPoints("DIESEL_BUSD", currentHeight, currentHeight, 1, rpcConfig),
        estimate24hVolume("DIESEL_FRBTC", rpcConfig),
        estimate24hVolume("DIESEL_BUSD", rpcConfig),
        fetchBitcoinPrice(priceConfig),
      ]);

      // Calculate prices
      const frbtcPrice = calculatePrice(
        frbtcData[0].reserve0,
        frbtcData[0].reserve1,
        POOL_CONFIGS.DIESEL_FRBTC.token0Decimals,
        POOL_CONFIGS.DIESEL_FRBTC.token1Decimals
      );

      const busdPrice = calculatePrice(
        busdData[0].reserve0,
        busdData[0].reserve1,
        POOL_CONFIGS.DIESEL_BUSD.token0Decimals,
        POOL_CONFIGS.DIESEL_BUSD.token1Decimals
      );

      const dieselUsd = frbtcPrice * btcPrice.usd;

      // Calculate TVL (all alkane tokens use 8 decimals)
      const frbtcTvl = (Number(frbtcData[0].reserve1) / 1e8) * btcPrice.usd * 2;
      const busdTvl = (Number(busdData[0].reserve1) / 1e8) * 2;  // bUSD also 8 decimals
      const totalTvl = frbtcTvl + busdTvl;

      // Calculate volumes in USD
      const frbtcVolumeUsd = frbtcVolume.volumeToken1 * btcPrice.usd;
      const busdVolumeUsd = busdVolume.volumeToken1;
      const totalVolume = frbtcVolumeUsd + busdVolumeUsd;

      console.log(`\n--- DIESEL Token ---`);
      console.log(`  Price (frBTC): ${frbtcPrice.toFixed(8)} frBTC`);
      console.log(`  Price (bUSD):  ${busdPrice.toFixed(4)} bUSD`);
      console.log(`  Price (USD):   $${dieselUsd.toFixed(4)}`);

      console.log(`\n--- Pool TVL ---`);
      console.log(`  DIESEL/frBTC: $${frbtcTvl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
      console.log(`  DIESEL/bUSD:  $${busdTvl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
      console.log(`  Total:        $${totalTvl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

      console.log(`\n--- 24h Volume ---`);
      console.log(`  DIESEL/frBTC: $${frbtcVolumeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
      console.log(`  DIESEL/bUSD:  $${busdVolumeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
      console.log(`  Total:        $${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);

      // All values should be positive
      expect(frbtcPrice).toBeGreaterThan(0);
      expect(busdPrice).toBeGreaterThan(0);
      expect(dieselUsd).toBeGreaterThan(0);
      expect(frbtcTvl).toBeGreaterThan(0);
      expect(busdTvl).toBeGreaterThan(0);
    }, TEST_TIMEOUT);
  });
});

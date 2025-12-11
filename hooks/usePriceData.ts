"use client";

import { useQuery } from "@tanstack/react-query";

interface BitcoinPrice {
  usd: number;
  timestamp: number;
}

interface PriceApiResponse {
  success: boolean;
  data?: BitcoinPrice;
  error?: string;
}

interface PoolData {
  poolId: string;
  poolName: string;
  price: number;
  priceInverse: number;
  reserve0: string;
  reserve1: string;
  blockHeight: number;
}

interface PoolsApiResponse {
  success: boolean;
  data?: {
    currentHeight: number;
    pools: {
      DIESEL_FRBTC: PoolData;
      DIESEL_BUSD: PoolData;
    };
  };
  error?: string;
}

/**
 * Hook to fetch BTC price in USD
 * Cached globally via react-query with 60s stale time
 */
export function useBtcPrice() {
  return useQuery({
    queryKey: ["btc-price"],
    queryFn: async (): Promise<BitcoinPrice> => {
      const res = await fetch("/api/btc-price");
      const data: PriceApiResponse = await res.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || "Failed to fetch BTC price");
      }

      return data.data;
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

/**
 * Hook to fetch all pool data
 * Cached globally via react-query with 30s stale time
 */
export function usePoolPrices() {
  return useQuery({
    queryKey: ["pool-prices"],
    queryFn: async () => {
      const res = await fetch("/api/pools?pool=all");
      const data: PoolsApiResponse = await res.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || "Failed to fetch pool prices");
      }

      return data.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
}

/**
 * Hook to get DIESEL price in USD
 * Combines BTC price with DIESEL/frBTC pool price
 */
export function useDieselUsdPrice() {
  const { data: btcPrice, isLoading: btcLoading } = useBtcPrice();
  const { data: pools, isLoading: poolsLoading } = usePoolPrices();

  const isLoading = btcLoading || poolsLoading;

  if (!btcPrice || !pools) {
    return { priceUsd: null, isLoading };
  }

  // DIESEL/frBTC price = frBTC per DIESEL
  // frBTC is 1:1 with BTC
  // So DIESEL USD = (frBTC per DIESEL) * BTC USD
  const dieselFrbtcPrice = pools.pools.DIESEL_FRBTC.price;
  const priceUsd = dieselFrbtcPrice * btcPrice.usd;

  return { priceUsd, isLoading, btcPrice: btcPrice.usd };
}

/**
 * Format USD price with appropriate precision
 */
export function formatUsd(value: number): string {
  if (value >= 1000) {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  if (value >= 1) {
    return `$${value.toFixed(2)}`;
  }
  if (value >= 0.01) {
    return `$${value.toFixed(4)}`;
  }
  return `$${value.toFixed(6)}`;
}

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CandlesApiResponse {
  success: boolean;
  data?: {
    pool: string;
    poolId: string;
    interval: string;
    currentHeight: number;
    candles: Candle[];
  };
  error?: string;
}

/**
 * Hook to fetch candle data for a pool
 * @param pool Pool key (e.g., "DIESEL_FRBTC")
 * @param interval "hourly" | "daily" | "weekly"
 * @param limit Number of candles to fetch
 */
export function usePoolCandles(pool: string, interval: string = "daily", limit: number = 30) {
  return useQuery({
    queryKey: ["pool-candles", pool, interval, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        pool,
        interval,
        limit: limit.toString(),
      });
      const res = await fetch(`/api/pools/candles?${params}`);
      const data: CandlesApiResponse = await res.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || "Failed to fetch candle data");
      }

      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - candles don't change frequently
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { usePoolPrices, useBtcPrice, usePoolCandles, formatUsd, formatCompact } from "@/hooks/usePriceData";

interface Vault {
  id: string;
  name: string;
  symbol: string;
  poolKey: string;
  priceNative: string;
  priceUsd: string | null;
  tvl: string;
  tvlUsd: string | null;
  token0Symbol: string;
  token1Symbol: string;
  reserve0: string;
  reserve1: string;
}

function formatReserve(reserve: string, decimals: number): number {
  return Number(reserve) / Math.pow(10, decimals);
}

export default function VaultsPage() {
  const t = useTranslations();
  const { data: pools, isLoading: poolsLoading, error: poolsError } = usePoolPrices();
  const { data: btcPrice, isLoading: btcLoading } = useBtcPrice();

  const loading = poolsLoading;
  const error = poolsError?.message || null;

  // Build vault list from live pool data
  const vaults: Vault[] = pools
    ? [
        {
          id: "diesel-frbtc",
          name: "DIESEL/frBTC",
          symbol: "D-frBTC",
          poolKey: "DIESEL_FRBTC",
          priceNative: pools.pools.DIESEL_FRBTC.price.toFixed(8),
          priceUsd: btcPrice
            ? formatUsd(pools.pools.DIESEL_FRBTC.price * btcPrice.usd)
            : null,
          tvl: `${formatCompact(formatReserve(pools.pools.DIESEL_FRBTC.reserve0, 6))} DIESEL`,
          tvlUsd: btcPrice
            ? formatUsd(
                formatReserve(pools.pools.DIESEL_FRBTC.reserve0, 6) *
                  pools.pools.DIESEL_FRBTC.price *
                  btcPrice.usd
              )
            : null,
          token0Symbol: "DIESEL",
          token1Symbol: "frBTC",
          reserve0: pools.pools.DIESEL_FRBTC.reserve0,
          reserve1: pools.pools.DIESEL_FRBTC.reserve1,
        },
        {
          id: "diesel-busd",
          name: "DIESEL/bUSD",
          symbol: "D-bUSD",
          poolKey: "DIESEL_BUSD",
          priceNative: pools.pools.DIESEL_BUSD.price.toFixed(4),
          priceUsd: formatUsd(pools.pools.DIESEL_BUSD.price),
          tvl: `${formatCompact(formatReserve(pools.pools.DIESEL_BUSD.reserve0, 6))} DIESEL`,
          tvlUsd: formatUsd(
            formatReserve(pools.pools.DIESEL_BUSD.reserve0, 6) *
              pools.pools.DIESEL_BUSD.price
          ),
          token0Symbol: "DIESEL",
          token1Symbol: "bUSD",
          reserve0: pools.pools.DIESEL_BUSD.reserve0,
          reserve1: pools.pools.DIESEL_BUSD.reserve1,
        },
      ]
    : [];

  // Calculate total DIESEL in pools and USD value
  const totalDieselAmount = pools
    ? formatReserve(pools.pools.DIESEL_FRBTC.reserve0, 6) +
      formatReserve(pools.pools.DIESEL_BUSD.reserve0, 6)
    : 0;

  const totalTvlUsd =
    pools && btcPrice
      ? formatReserve(pools.pools.DIESEL_FRBTC.reserve0, 6) *
          pools.pools.DIESEL_FRBTC.price *
          btcPrice.usd +
        formatReserve(pools.pools.DIESEL_BUSD.reserve0, 6) *
          pools.pools.DIESEL_BUSD.price
      : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-[color:var(--sf-text)]">
              {t("dashboard.vaults.title")}
            </h1>
            <p className="text-[color:var(--sf-muted)]">
              Liquidity pools for DIESEL token pairs
            </p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-6">
            <p className="text-sm text-[color:var(--sf-muted)] mb-1">{t("dashboard.vaults.totalTvl")}</p>
            <p className="text-2xl font-bold text-[color:var(--sf-primary)]">
              {totalTvlUsd ? formatUsd(totalTvlUsd) : `${formatCompact(totalDieselAmount)} DIESEL`}
            </p>
            {totalTvlUsd && (
              <p className="text-sm text-[color:var(--sf-muted)]">
                {formatCompact(totalDieselAmount)} DIESEL
              </p>
            )}
          </div>
          <div className="glass-card p-6">
            <p className="text-sm text-[color:var(--sf-muted)] mb-1">Active Pools</p>
            <p className="text-2xl font-bold text-[color:var(--sf-text)]">{vaults.length}</p>
          </div>
          <div className="glass-card p-6">
            <p className="text-sm text-[color:var(--sf-muted)] mb-1">Current Block</p>
            <p className="text-2xl font-bold text-[color:var(--sf-text)]">
              {pools ? `#${pools.currentHeight.toLocaleString()}` : "..."}
            </p>
          </div>
        </div>

        {/* Vaults List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="h-8 bg-[color:var(--sf-surface)] rounded w-1/4 mb-4" />
                <div className="h-4 bg-[color:var(--sf-surface)] rounded w-1/2 mb-2" />
                <div className="h-32 bg-[color:var(--sf-surface)] rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="glass-card p-6 text-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {vaults.map((vault) => (
              <VaultCard key={vault.id} vault={vault} btcPrice={btcPrice?.usd} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function VaultCard({ vault, btcPrice }: { vault: Vault; btcPrice?: number }) {
  const t = useTranslations();
  const { data: candles, isLoading: candlesLoading } = usePoolCandles(vault.poolKey, "daily", 14);

  // Calculate price change from candles
  let priceChange: number | null = null;
  let priceChangePercent: number | null = null;
  if (candles && candles.candles.length >= 2) {
    const firstCandle = candles.candles[0];
    const lastCandle = candles.candles[candles.candles.length - 1];
    priceChange = lastCandle.close - firstCandle.open;
    priceChangePercent = firstCandle.open > 0 ? (priceChange / firstCandle.open) * 100 : 0;
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--sf-primary)] to-[var(--sf-primary-pressed)] flex items-center justify-center">
              <span className="text-black font-bold text-lg">{vault.symbol.charAt(0)}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[color:var(--sf-text)]">{vault.name}</h2>
              <p className="text-sm text-[color:var(--sf-muted)]">{vault.symbol}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[color:var(--sf-primary)]">
              {vault.priceUsd || `${vault.priceNative} ${vault.token1Symbol}`}
            </p>
            <p className="text-sm text-[color:var(--sf-muted)]">
              {vault.priceNative} {vault.token1Symbol}
            </p>
            {priceChangePercent !== null && (
              <p className={`text-sm font-medium ${priceChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}% (14d)
              </p>
            )}
          </div>
        </div>

        {/* Price Chart */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-[color:var(--sf-muted)] mb-3">14 Day Price History</h3>
          {candlesLoading ? (
            <div className="h-32 rounded-lg bg-[color:var(--sf-surface)]/50 animate-pulse" />
          ) : candles && candles.candles.length > 0 ? (
            <PriceChart candles={candles.candles} />
          ) : (
            <div className="h-32 rounded-lg bg-[color:var(--sf-surface)]/50 flex items-center justify-center">
              <p className="text-sm text-[color:var(--sf-muted)]">No price history available</p>
            </div>
          )}
        </div>

        {/* Pool Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-[color:var(--sf-surface)]/50">
            <p className="text-xs text-[color:var(--sf-muted)] mb-1">{t("dashboard.vaults.tvl")}</p>
            <p className="font-bold text-[color:var(--sf-text)]">{vault.tvlUsd || vault.tvl}</p>
          </div>
          <div className="p-4 rounded-lg bg-[color:var(--sf-surface)]/50">
            <p className="text-xs text-[color:var(--sf-muted)] mb-1">{vault.token0Symbol} Reserve</p>
            <p className="font-bold text-[color:var(--sf-text)]">
              {formatCompact(formatReserve(vault.reserve0, 6))}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[color:var(--sf-surface)]/50">
            <p className="text-xs text-[color:var(--sf-muted)] mb-1">{vault.token1Symbol} Reserve</p>
            <p className="font-bold text-[color:var(--sf-text)]">
              {formatCompact(formatReserve(vault.reserve1, vault.token1Symbol === 'frBTC' ? 8 : 6))}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[color:var(--sf-surface)]/50">
            <p className="text-xs text-[color:var(--sf-muted)] mb-1">Pool ID</p>
            <p className="font-mono text-sm text-[color:var(--sf-text)]">{vault.poolKey}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

function PriceChart({ candles }: { candles: Candle[] }) {
  if (candles.length === 0) return null;

  const prices = candles.map(c => c.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const chartHeight = 128;
  const chartWidth = 100; // percentage
  const padding = 8;

  // Create SVG path for line chart
  const points = candles.map((candle, i) => {
    const x = (i / (candles.length - 1)) * 100;
    const y = chartHeight - padding - ((candle.close - minPrice) / priceRange) * (chartHeight - 2 * padding);
    return `${x},${y}`;
  });
  const linePath = `M ${points.join(' L ')}`;

  // Create area path
  const areaPath = `${linePath} L 100,${chartHeight} L 0,${chartHeight} Z`;

  const isPositive = candles[candles.length - 1].close >= candles[0].open;
  const strokeColor = isPositive ? '#22c55e' : '#ef4444';
  const fillColor = isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  return (
    <div className="relative h-32 rounded-lg bg-[color:var(--sf-surface)]/30 overflow-hidden">
      <svg
        viewBox={`0 0 100 ${chartHeight}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Area fill */}
        <path d={areaPath} fill={fillColor} />
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Price labels */}
      <div className="absolute top-2 left-2 text-xs text-[color:var(--sf-muted)]">
        High: {maxPrice.toFixed(maxPrice < 0.01 ? 8 : 4)}
      </div>
      <div className="absolute bottom-2 left-2 text-xs text-[color:var(--sf-muted)]">
        Low: {minPrice.toFixed(minPrice < 0.01 ? 8 : 4)}
      </div>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { usePoolPrices, useBtcPrice, usePoolCandles, formatUsd, formatCompact } from "@/hooks/usePriceData";
import { AreaPriceChart, type CandleDataPoint } from "@/components/charts";

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
  const { data: btcPrice } = useBtcPrice();

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
          tvl: `${formatCompact(formatReserve(pools.pools.DIESEL_FRBTC.reserve0, 8))} DIESEL`,
          tvlUsd: btcPrice
            ? formatUsd(
                formatReserve(pools.pools.DIESEL_FRBTC.reserve0, 8) *
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
          tvl: `${formatCompact(formatReserve(pools.pools.DIESEL_BUSD.reserve0, 8))} DIESEL`,
          tvlUsd: formatUsd(
            formatReserve(pools.pools.DIESEL_BUSD.reserve0, 8) *
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
    ? formatReserve(pools.pools.DIESEL_FRBTC.reserve0, 8) +
      formatReserve(pools.pools.DIESEL_BUSD.reserve0, 8)
    : 0;

  const totalTvlUsd =
    pools && btcPrice
      ? formatReserve(pools.pools.DIESEL_FRBTC.reserve0, 8) *
          pools.pools.DIESEL_FRBTC.price *
          btcPrice.usd +
        formatReserve(pools.pools.DIESEL_BUSD.reserve0, 8) *
          pools.pools.DIESEL_BUSD.price
      : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[color:var(--sf-text)]">
              {t("dashboard.vaults.title")}
            </h1>
            <p className="text-sm text-[color:var(--sf-muted)]">
              Liquidity pools for DIESEL token pairs
            </p>
          </div>

          {/* Stats Summary */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="glass-card p-4">
              <p className="text-xs text-[color:var(--sf-muted)] mb-1">{t("dashboard.vaults.totalTvl")}</p>
              <p className="text-xl font-bold text-[color:var(--sf-text)] font-mono tabular-nums">
                {totalTvlUsd ? formatUsd(totalTvlUsd) : `${formatCompact(totalDieselAmount)} DIESEL`}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-[color:var(--sf-muted)] mb-1">Active Pools</p>
              <p className="text-xl font-bold text-[color:var(--sf-text)]">{vaults.length}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-[color:var(--sf-muted)] mb-1">Current Block</p>
              <p className="text-xl font-bold text-[color:var(--sf-text)] font-mono tabular-nums">
                {pools ? `#${pools.currentHeight.toLocaleString()}` : "..."}
              </p>
            </div>
          </div>

          {/* Vaults List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="glass-card p-5 animate-pulse">
                  <div className="h-6 bg-[color:var(--sf-outline)] rounded w-1/4 mb-4" />
                  <div className="h-4 bg-[color:var(--sf-outline)] rounded w-1/2 mb-4" />
                  <div className="h-24 bg-[color:var(--sf-outline)] rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="glass-card p-5 text-center">
              <p className="text-[color:var(--sf-muted)]">{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vaults.map((vault) => (
                <VaultCard key={vault.id} vault={vault} btcPrice={btcPrice?.usd} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function VaultCard({ vault, btcPrice }: { vault: Vault; btcPrice?: number }) {
  const t = useTranslations();
  const { data: candles, isLoading: candlesLoading } = usePoolCandles(vault.poolKey, "daily", 14);

  // Calculate price change from candles
  let priceChangePercent: number | null = null;
  if (candles && candles.candles.length >= 2) {
    const firstCandle = candles.candles[0];
    const lastCandle = candles.candles[candles.candles.length - 1];
    const priceChange = lastCandle.close - firstCandle.open;
    priceChangePercent = firstCandle.open > 0 ? (priceChange / firstCandle.open) * 100 : 0;
  }

  const isPositive = priceChangePercent !== null && priceChangePercent >= 0;

  return (
    <div className="glass-card">
      {/* Header */}
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[color:var(--sf-outline)] flex items-center justify-center">
            <span className="text-[color:var(--sf-text)] font-semibold">{vault.symbol.charAt(0)}</span>
          </div>
          <div>
            <h2 className="font-semibold text-[color:var(--sf-text)]">{vault.name}</h2>
            <p className="text-xs text-[color:var(--sf-muted)]">{vault.symbol}</p>
          </div>
        </div>
        {priceChangePercent !== null && (
          <span className={`badge ${isPositive ? 'badge-active' : 'badge-danger'}`}>
            {isPositive ? '+' : ''}{priceChangePercent.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="p-5">
        {/* Price */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[color:var(--sf-text)] font-mono tabular-nums">
              {vault.priceNative}
            </span>
            <span className="text-sm text-[color:var(--sf-muted)]">{vault.token1Symbol}</span>
          </div>
          {vault.priceUsd && (
            <div className="text-lg text-[color:var(--sf-muted)] font-mono tabular-nums">
              {vault.priceUsd}
            </div>
          )}
        </div>

        {/* Price Chart */}
        <div className="mb-4">
          {candlesLoading ? (
            <div className="h-24 rounded-lg bg-[color:var(--sf-outline)] animate-pulse" />
          ) : candles && candles.candles.length > 0 ? (
            <AreaPriceChart
              data={candles.candles as CandleDataPoint[]}
              height={96}
              showGradient={true}
            />
          ) : (
            <div className="h-24 rounded-lg bg-[color:var(--sf-bg-end)] flex items-center justify-center">
              <p className="text-xs text-[color:var(--sf-muted)]">No price history</p>
            </div>
          )}
        </div>

        {/* Pool Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-[color:var(--sf-muted)] mb-1">{t("dashboard.vaults.tvl")}</p>
            <p className="text-sm font-medium text-[color:var(--sf-text)] font-mono tabular-nums">
              {vault.tvlUsd || vault.tvl}
            </p>
          </div>
          <div>
            <p className="text-xs text-[color:var(--sf-muted)] mb-1">{vault.token0Symbol}</p>
            <p className="text-sm font-medium text-[color:var(--sf-text)] font-mono tabular-nums">
              {formatCompact(formatReserve(vault.reserve0, 8))}
            </p>
          </div>
          <div>
            <p className="text-xs text-[color:var(--sf-muted)] mb-1">{vault.token1Symbol}</p>
            <p className="text-sm font-medium text-[color:var(--sf-text)] font-mono tabular-nums">
              {formatCompact(formatReserve(vault.reserve1, 8))}
            </p>
          </div>
          <div>
            <p className="text-xs text-[color:var(--sf-muted)] mb-1">Pool ID</p>
            <p className="text-sm font-mono text-[color:var(--sf-text)]">{vault.poolKey}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

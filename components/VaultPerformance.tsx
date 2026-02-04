"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePoolPrices, useBtcPrice, useTvlStats, formatUsd, formatCompact } from "@/hooks/usePriceData";

interface Vault {
  id: string;
  name: string;
  symbol: string;
  priceNative: string;
  priceUsd: string | null;
  tvl: string;
  tvlUsd: string | null;
  token1Symbol: string;
}

// All alkane tokens use 8 decimals
const TOKEN_DECIMALS = 8;

function formatReserve(reserve: string, decimals: number): number {
  return Number(reserve) / Math.pow(10, decimals);
}

export function VaultPerformance() {
  const t = useTranslations("dashboard.vaults");
  const tCommon = useTranslations("common");

  const { data: pools, isLoading: poolsLoading } = usePoolPrices();
  const { data: btcPrice, isLoading: btcLoading } = useBtcPrice();
  const { data: tvlStats, isLoading: tvlLoading } = useTvlStats();

  const loading = poolsLoading || tvlLoading;
  const hasData = !!pools;

  // Build vault list from live pool data with proper TVL calculation
  // TVL = both sides of the pool valued in USD (2 * reserve1 value)
  const vaults: Vault[] = pools
    ? [
        {
          id: "diesel-frbtc",
          name: "DIESEL/frBTC",
          symbol: "D-frBTC",
          priceNative: pools.pools.DIESEL_FRBTC.price.toFixed(8),
          priceUsd: btcPrice
            ? formatUsd(pools.pools.DIESEL_FRBTC.price * btcPrice.usd)
            : null,
          tvl: `${formatCompact(formatReserve(pools.pools.DIESEL_FRBTC.reserve0, TOKEN_DECIMALS) * 2)} DIESEL`,
          // TVL = value of both sides = 2 * (reserve1 * btcPrice)
          tvlUsd: tvlStats?.pools.DIESEL_FRBTC
            ? formatUsd(tvlStats.pools.DIESEL_FRBTC.tvlUsd)
            : btcPrice
            ? formatUsd(
                formatReserve(pools.pools.DIESEL_FRBTC.reserve1, TOKEN_DECIMALS) *
                  btcPrice.usd *
                  2
              )
            : null,
          token1Symbol: "frBTC",
        },
        {
          id: "diesel-busd",
          name: "DIESEL/bUSD",
          symbol: "D-bUSD",
          priceNative: pools.pools.DIESEL_BUSD.price.toFixed(4),
          priceUsd: formatUsd(pools.pools.DIESEL_BUSD.price), // bUSD is already USD
          tvl: `${formatCompact(formatReserve(pools.pools.DIESEL_BUSD.reserve0, TOKEN_DECIMALS) * 2)} DIESEL`,
          // TVL = value of both sides = 2 * reserve1 (bUSD is 1:1 USD)
          tvlUsd: tvlStats?.pools.DIESEL_BUSD
            ? formatUsd(tvlStats.pools.DIESEL_BUSD.tvlUsd)
            : formatUsd(
                formatReserve(pools.pools.DIESEL_BUSD.reserve1, TOKEN_DECIMALS) * 2
              ),
          token1Symbol: "bUSD",
        },
      ]
    : [];

  // Calculate total DIESEL in pools (both sides)
  const totalDieselAmount = pools
    ? formatReserve(pools.pools.DIESEL_FRBTC.reserve0, TOKEN_DECIMALS) * 2 +
      formatReserve(pools.pools.DIESEL_BUSD.reserve0, TOKEN_DECIMALS) * 2
    : 0;

  // Use TVL stats if available, otherwise calculate
  const totalTvlUsd = tvlStats
    ? tvlStats.totalTvlUsd
    : pools && btcPrice
    ? formatReserve(pools.pools.DIESEL_FRBTC.reserve1, TOKEN_DECIMALS) *
        btcPrice.usd *
        2 +
      formatReserve(pools.pools.DIESEL_BUSD.reserve1, TOKEN_DECIMALS) * 2
    : null;

  return (
    <div className="glass-card overflow-hidden w-full">
      {/* Header */}
      <div className="card-header flex items-center justify-between gap-2">
        <h3 className="font-semibold text-[color:var(--sf-text)] truncate">{t("title")}</h3>
        <Link
          href="/vaults"
          className="text-sm text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] transition-colors whitespace-nowrap flex-shrink-0"
        >
          {tCommon("viewAll")} →
        </Link>
      </div>

      {/* Pool List */}
      <div className="p-4 space-y-2 overflow-hidden">
        {hasData ? (
          <>
            {vaults.map((vault) => (
              <VaultRow key={vault.id} vault={vault} tvlLabel={t("tvl")} />
            ))}
          </>
        ) : (
          <>
            {[1, 2].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-[color:var(--sf-bg-end)] animate-pulse">
                <div className="h-4 bg-[color:var(--sf-outline)] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[color:var(--sf-outline)] rounded w-1/2" />
              </div>
            ))}
          </>
        )}

        {/* Total TVL */}
        {hasData && (
          <div className="mt-4 pt-4 border-t border-[color:var(--sf-outline)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[color:var(--sf-muted)] mb-1">{t("totalTvl")}</p>
                <p className="text-xl font-bold text-[color:var(--sf-text)] font-mono tabular-nums">
                  {totalTvlUsd ? formatUsd(totalTvlUsd) : `${formatCompact(totalDieselAmount)} DIESEL`}
                </p>
              </div>
              <div className="text-right text-xs text-[color:var(--sf-muted)]">
                {pools && <p>Block #{pools.currentHeight.toLocaleString()}</p>}
                {btcPrice && <p>BTC: {formatUsd(btcPrice.usd)}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VaultRow({ vault, tvlLabel }: { vault: Vault; tvlLabel: string }) {
  return (
    <Link
      href="/vaults"
      className="flex items-center justify-between p-3 rounded-lg bg-black/20 backdrop-blur-sm border border-white/5 hover:bg-black/30 transition-colors group gap-2 overflow-hidden"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <img
          src="/logo.png"
          alt={vault.name}
          className="w-8 h-8 rounded-lg flex-shrink-0"
        />
        <div className="min-w-0">
          <p className="font-medium text-sm text-[color:var(--sf-text)] truncate">{vault.name}</p>
          <p className="text-xs text-[color:var(--sf-muted)] truncate">
            {tvlLabel}: {vault.tvlUsd || vault.tvl}
          </p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-medium text-sm text-[color:var(--sf-text)] font-mono tabular-nums">
          {vault.priceUsd || `${vault.priceNative} ${vault.token1Symbol}`}
        </p>
        <p className="text-xs text-[color:var(--sf-muted)] font-mono">
          {vault.priceNative} {vault.token1Symbol}
        </p>
      </div>
    </Link>
  );
}

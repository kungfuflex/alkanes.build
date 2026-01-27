"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePoolPrices, useBtcPrice, usePoolCandles, usePoolVolume, useMarketStats, formatUsd, formatCompact } from "@/hooks/usePriceData";
import { AreaPriceChart, type CandleDataPoint } from "@/components/charts";

export function DieselPriceCard() {
  const t = useTranslations("dashboard.diesel");
  const { data: pools, isLoading: poolsLoading } = usePoolPrices();
  const { data: btcPrice, isLoading: btcLoading } = useBtcPrice();
  const { data: candles } = usePoolCandles("DIESEL_FRBTC", "hourly", 24);
  const { data: volume } = usePoolVolume("DIESEL_FRBTC");
  const { data: marketStats } = useMarketStats();

  const isLoading = poolsLoading || btcLoading;

  const dieselPriceFrbtc = pools?.pools.DIESEL_FRBTC.price || 0;
  const dieselPriceUsd = btcPrice ? dieselPriceFrbtc * btcPrice.usd : 0;

  let change24h = 0;
  if (candles && candles.candles.length > 0) {
    const firstCandle = candles.candles[0];
    const lastCandle = candles.candles[candles.candles.length - 1];
    if (firstCandle.open > 0) {
      change24h = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100;
    }
  }

  const change24hStr = change24h >= 0 ? `+${change24h.toFixed(1)}%` : `${change24h.toFixed(1)}%`;
  const isPositiveChange = change24h >= 0;

  // Calculate 24h High/Low from candles
  let high24h = 0;
  let low24h = 0;
  if (candles && candles.candles.length > 0) {
    const highs = candles.candles.map(c => c.high);
    const lows = candles.candles.map(c => c.low);
    high24h = Math.max(...highs);
    low24h = Math.min(...lows);
  }

  const high24hUsd = btcPrice && high24h > 0 ? high24h * btcPrice.usd : 0;
  const low24hUsd = btcPrice && low24h > 0 ? low24h * btcPrice.usd : 0;

  let volume24hStr = "--";
  if (volume) {
    if (volume.volume24hUsd !== undefined && volume.volume24hUsd > 0) {
      volume24hStr = formatUsd(volume.volume24hUsd);
    } else if (volume.volume24h > 0) {
      volume24hStr = `${formatCompact(volume.volume24h)} frBTC`;
    }
  }

  let marketCapStr = "--";
  if (marketStats && marketStats.marketCapUsd > 0) {
    marketCapStr = formatUsd(marketStats.marketCapUsd);
  }

  return (
    <div className="glass-card overflow-hidden w-full">
      {/* Header */}
      <div className="card-header flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Image
            src="/images/diesel-logo.png"
            alt="DIESEL"
            width={32}
            height={32}
            className="rounded-lg flex-shrink-0"
          />
          <span className="font-semibold text-[color:var(--sf-text)] truncate">{t("title")}</span>
        </div>
        <span className={`badge ${isPositiveChange ? 'badge-active' : 'badge-danger'} flex-shrink-0`}>
          {change24hStr}
        </span>
      </div>

      <div className="p-5 overflow-hidden">
        {/* Price */}
        <div className="mb-5">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-8 w-40 max-w-full bg-[color:var(--sf-outline)] rounded animate-pulse" />
              <div className="h-6 w-24 max-w-full bg-[color:var(--sf-outline)] rounded animate-pulse" />
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl sm:text-3xl font-bold text-[color:var(--sf-text)] font-mono tabular-nums break-all">
                  {dieselPriceFrbtc.toFixed(8)}
                </span>
                <span className="text-sm text-[color:var(--sf-muted)]">BTC</span>
              </div>
              <div className="text-lg sm:text-xl text-[color:var(--sf-muted)] font-mono tabular-nums">
                {formatUsd(dieselPriceUsd)}
              </div>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="mb-5 -mx-1 overflow-hidden">
          <AreaPriceChart
            data={(candles?.candles || []) as CandleDataPoint[]}
            height={100}
            showGradient={true}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="min-w-0">
            <div className="text-[color:var(--sf-muted)] text-xs mb-1">{t("high")}</div>
            <div className="text-[color:var(--sf-text)] font-medium font-mono tabular-nums truncate">
              {high24hUsd > 0 ? formatUsd(high24hUsd) : "--"}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[color:var(--sf-muted)] text-xs mb-1">{t("low")}</div>
            <div className="text-[color:var(--sf-text)] font-medium font-mono tabular-nums truncate">
              {low24hUsd > 0 ? formatUsd(low24hUsd) : "--"}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[color:var(--sf-muted)] text-xs mb-1">{t("volume")}</div>
            <div className="text-[color:var(--sf-text)] font-medium font-mono tabular-nums truncate">{volume24hStr}</div>
          </div>
          <div className="min-w-0">
            <div className="text-[color:var(--sf-muted)] text-xs mb-1">{t("marketCap")}</div>
            <div className="text-[color:var(--sf-text)] font-medium font-mono tabular-nums truncate">{marketCapStr}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

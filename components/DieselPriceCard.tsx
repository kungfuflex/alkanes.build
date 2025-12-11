"use client";

import { useTranslations } from "next-intl";

export function DieselPriceCard() {
  const t = useTranslations("dashboard.diesel");

  // Mock data - in production, fetch from API
  const priceData = {
    priceBTC: "0.00000842",
    priceUSD: "$0.89",
    change24h: "+5.2%",
    high24h: "0.00000891",
    low24h: "0.00000798",
    volume24h: "12.4 BTC",
    marketCap: "$8.9M",
  };

  const isPositiveChange = priceData.change24h.startsWith("+");

  return (
    <div className="glass-card overflow-hidden">
      {/* Header with rainbow accent */}
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--sf-primary)] to-[var(--sf-primary-pressed)] flex items-center justify-center">
            <span className="text-black font-bold text-lg">D</span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-[color:var(--sf-text)]">{t("title")}</h3>
            <p className="text-xs text-[color:var(--sf-muted)]">{t("subtitle")}</p>
          </div>
        </div>
        <span className={`badge ${isPositiveChange ? 'badge-active' : 'badge-closed'}`}>
          {priceData.change24h}
        </span>
      </div>

      {/* Price Display */}
      <div className="p-6">
        <div className="mb-6">
          <div className="text-3xl font-bold text-[color:var(--sf-primary)] mb-1">
            {priceData.priceBTC} BTC
          </div>
          <div className="text-lg text-[color:var(--sf-muted)]">
            {priceData.priceUSD}
          </div>
        </div>

        {/* Mini Chart Placeholder */}
        <div className="chart-placeholder h-24 mb-6">
          <div className="flex items-end gap-1 h-16">
            {[40, 55, 45, 60, 50, 70, 65, 80, 75, 85, 70, 90].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${h}%`,
                  background: `linear-gradient(180deg, var(--sf-primary) 0%, var(--sf-primary-pressed) 100%)`,
                  opacity: 0.3 + (i / 12) * 0.7,
                }}
              />
            ))}
          </div>
          <p className="text-xs text-[color:var(--sf-muted)] mt-2">{t("chart")}</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid grid-cols-2">
          <div className="stat-item">
            <span className="stat-label">{t("high")}</span>
            <span className="stat-value">{priceData.high24h}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t("low")}</span>
            <span className="stat-value">{priceData.low24h}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t("volume")}</span>
            <span className="stat-value">{priceData.volume24h}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t("marketCap")}</span>
            <span className="stat-value">{priceData.marketCap}</span>
          </div>
        </div>
      </div>

      {/* Rainbow bar at bottom */}
      <div className="diesel-rainbow-bar" />
    </div>
  );
}

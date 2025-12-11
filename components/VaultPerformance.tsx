"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Vault {
  id: string;
  name: string;
  symbol: string;
  apy: string;
  tvl: string;
  yourBalance?: string;
  change24h: string;
}

export function VaultPerformance() {
  const t = useTranslations("dashboard.vaults");
  const tCommon = useTranslations("common");

  // Mock data - in production, fetch from API
  const vaults: Vault[] = [
    {
      id: "diesel-btc",
      name: "DIESEL-BTC",
      symbol: "D-BTC",
      apy: "12.4%",
      tvl: "245.8 BTC",
      change24h: "+2.1%",
    },
    {
      id: "diesel-usdt",
      name: "DIESEL-USDT",
      symbol: "D-USDT",
      apy: "8.7%",
      tvl: "$2.1M",
      change24h: "+0.8%",
    },
    {
      id: "diesel-eth",
      name: "DIESEL-ETH",
      symbol: "D-ETH",
      apy: "15.2%",
      tvl: "892 ETH",
      change24h: "+3.4%",
    },
  ];

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="card-header flex items-center justify-between">
        <h3 className="font-bold text-lg text-[color:var(--sf-text)]">{t("title")}</h3>
        <Link
          href="/vaults"
          className="text-sm text-[color:var(--sf-primary)] hover:text-[color:var(--sf-boost-label)] transition-colors"
        >
          {tCommon("viewAll")} →
        </Link>
      </div>

      {/* Vault List */}
      <div className="p-4">
        <div className="space-y-3">
          {vaults.map((vault) => (
            <VaultRow key={vault.id} vault={vault} tvlLabel={t("tvl")} apyLabel={t("apy")} />
          ))}
        </div>

        {/* Total TVL */}
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[var(--sf-boost-bg-from)] to-[var(--sf-boost-bg-to)] border border-[color:var(--sf-primary)]/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[color:var(--sf-boost-label)] uppercase tracking-wider font-bold">{t("totalTvl")}</p>
              <p className="text-2xl font-bold text-[color:var(--sf-boost-value)]">$12.4M</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--sf-boost-icon-from)] to-[var(--sf-boost-icon-to)] flex items-center justify-center">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VaultRow({ vault, tvlLabel, apyLabel }: { vault: Vault; tvlLabel: string; apyLabel: string }) {
  const isPositive = vault.change24h.startsWith("+");

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-[color:var(--sf-surface)]/50 border border-[color:var(--sf-outline)] hover:border-[color:var(--sf-primary)]/40 transition-colors cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--sf-primary)] to-[var(--sf-primary-pressed)] flex items-center justify-center">
          <span className="text-black font-bold text-sm">{vault.symbol.charAt(0)}</span>
        </div>
        <div>
          <p className="font-semibold text-[color:var(--sf-text)]">{vault.name}</p>
          <p className="text-xs text-[color:var(--sf-muted)]">{tvlLabel}: {vault.tvl}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-[color:var(--sf-primary)]">{vault.apy} {apyLabel}</p>
        <p className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {vault.change24h}
        </p>
      </div>
    </div>
  );
}

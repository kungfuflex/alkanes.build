"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Proposal {
  id: string;
  title: string;
  state: "ACTIVE" | "PENDING" | "CLOSED" | "EXECUTED";
  votesFor: number;
  votesAgainst: number;
  endTime: string;
  author: string;
}

export function ActiveProposals() {
  const t = useTranslations("dashboard.proposals");
  const tGov = useTranslations("governance");
  const tCommon = useTranslations("common");

  // Mock data - in production, fetch from API
  const proposals: Proposal[] = [
    {
      id: "1",
      title: "Increase DIESEL staking rewards by 15%",
      state: "ACTIVE",
      votesFor: 72,
      votesAgainst: 28,
      endTime: "2 days",
      author: "bc1q...x7k4",
    },
    {
      id: "2",
      title: "Add new BTC-USDT vault with boosted APY",
      state: "ACTIVE",
      votesFor: 85,
      votesAgainst: 15,
      endTime: "5 days",
      author: "bc1q...m3n2",
    },
    {
      id: "3",
      title: "Treasury allocation for development fund",
      state: "PENDING",
      votesFor: 0,
      votesAgainst: 0,
      endTime: "1 day",
      author: "bc1q...p9r8",
    },
  ];

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center animate-pulse-glow">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-bold text-lg text-[color:var(--sf-text)]">{t("title")}</h3>
        </div>
        <Link
          href="/governance"
          className="btn-primary text-sm !py-2 !px-4"
        >
          {tCommon("viewAll")} →
        </Link>
      </div>

      {/* Proposals List */}
      <div className="p-4 space-y-3">
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            forLabel={tGov("proposal.for")}
            againstLabel={tGov("proposal.against")}
            byLabel={t("by", { author: proposal.author })}
            endsLabel={t("ends", { time: proposal.endTime })}
            startsLabel={t("starts", { time: proposal.endTime })}
            stateLabel={tGov(`states.${proposal.state}`)}
          />
        ))}
      </div>

      {/* CTA Banner */}
      <div className="p-4 bg-gradient-to-r from-[var(--sf-boost-bg-from)] to-[var(--sf-boost-bg-to)] border-t border-[color:var(--sf-primary)]/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-[color:var(--sf-text)]">{t("cta.title")}</p>
            <p className="text-sm text-[color:var(--sf-muted)]">{t("cta.description")}</p>
          </div>
          <Link href="/governance" className="btn-secondary !py-2 !px-4 text-sm">
            {t("cta.button")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProposalCard({
  proposal,
  forLabel,
  againstLabel,
  byLabel,
  endsLabel,
  startsLabel,
  stateLabel
}: {
  proposal: Proposal;
  forLabel: string;
  againstLabel: string;
  byLabel: string;
  endsLabel: string;
  startsLabel: string;
  stateLabel: string;
}) {
  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPercentage = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 50;

  const stateClass = {
    ACTIVE: "badge-active",
    PENDING: "badge-pending",
    CLOSED: "badge-closed",
    EXECUTED: "badge-executed",
  }[proposal.state];

  return (
    <Link
      href={`/governance/${proposal.id}`}
      className="block p-4 rounded-xl bg-[color:var(--sf-surface)]/50 border border-[color:var(--sf-outline)] hover:border-[color:var(--sf-primary)]/40 transition-all hover:shadow-lg group"
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-[color:var(--sf-text)] group-hover:text-[color:var(--sf-primary)] transition-colors line-clamp-2 flex-1 mr-3">
          {proposal.title}
        </h4>
        <span className={`badge ${stateClass} flex-shrink-0`}>
          {stateLabel}
        </span>
      </div>

      {/* Vote Progress Bar */}
      {proposal.state === "ACTIVE" && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-green-500">{forLabel}: {proposal.votesFor}%</span>
            <span className="text-red-500">{againstLabel}: {proposal.votesAgainst}%</span>
          </div>
          <div className="h-2 rounded-full bg-[color:var(--sf-outline)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400"
              style={{ width: `${forPercentage}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-[color:var(--sf-muted)]">
        <span>{byLabel}</span>
        <span>{proposal.state === "PENDING" ? startsLabel : endsLabel}</span>
      </div>
    </Link>
  );
}

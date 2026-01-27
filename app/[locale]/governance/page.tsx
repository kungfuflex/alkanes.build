"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/context/WalletContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ViewToggle } from "@/components/governance/ViewToggle";
import {
  formatAddress,
  formatDiesel,
  formatTimeRemaining,
  formatRelativeTime,
} from "@/lib/utils";

interface Proposal {
  id: string;
  title: string;
  body: string;
  choices: string[];
  author: string;
  snapshot: number;
  start: string;
  end: string;
  state: "PENDING" | "ACTIVE" | "CLOSED" | "EXECUTED" | "CANCELLED";
  scores: string[];
  totalVotes: string;
  _count: {
    votes: number;
  };
}

export default function GovernancePage() {
  const t = useTranslations();
  const { isConnected } = useWallet();
  const [view, setView] = useState<"proposals" | "voters">("proposals");
  const [filter, setFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["proposals", filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set("state", filter);
      }
      const res = await fetch(`/api/governance/proposals?${params}`);
      if (!res.ok) throw new Error("Failed to fetch proposals");
      return res.json();
    },
  });

  const filters = [
    { key: "all", label: t("governance.filters.all") },
    { key: "active", label: t("governance.filters.active") },
    { key: "pending", label: t("governance.filters.pending") },
    { key: "closed", label: t("governance.filters.closed") },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[color:var(--sf-text)]">{t("governance.title")}</h1>
              <p className="text-sm text-[color:var(--sf-muted)]">
                {t("governance.subtitle")}
              </p>
            </div>
            {isConnected && view === "proposals" && (
              <Link
                href="/governance/create"
                className="btn-primary text-sm"
              >
                {t("governance.createProposal")}
              </Link>
            )}
          </div>

          {/* View Toggle */}
          <div className="mb-6">
            <ViewToggle view={view} onViewChange={setView} />
          </div>

          {/* Filters - only show for proposals */}
          {view === "proposals" && (
            <div className="flex gap-2 mb-6 flex-wrap">
              {filters.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === key
                      ? "bg-[color:var(--sf-text)] text-[color:var(--sf-bg-start)]"
                      : "text-[color:var(--sf-muted)] border border-[color:var(--sf-outline)] hover:border-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Content based on view */}
          {view === "proposals" ? (
            <>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-card p-5 animate-pulse">
                      <div className="h-5 bg-[color:var(--sf-outline)] rounded w-3/4 mb-3" />
                      <div className="h-4 bg-[color:var(--sf-outline)] rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="glass-card p-5 text-center">
                  <p className="text-[color:var(--sf-muted)]">{t("governance.error")}</p>
                </div>
              ) : data?.proposals?.length === 0 ? (
                <div className="glass-card p-5 text-center">
                  <p className="text-[color:var(--sf-muted)]">
                    {t("governance.noProposals")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data?.proposals?.map((proposal: Proposal) => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      byLabel={t("governance.proposal.by")}
                      votesLabel={t("governance.proposal.votes")}
                      voteLabel={t("governance.proposal.vote")}
                      startsLabel={t("governance.proposal.starts")}
                      stateLabels={{
                        ACTIVE: t("governance.states.ACTIVE"),
                        PENDING: t("governance.states.PENDING"),
                        CLOSED: t("governance.states.CLOSED"),
                        EXECUTED: t("governance.states.EXECUTED"),
                        CANCELLED: t("governance.states.CANCELLED"),
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <VotersView />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ProposalCard({
  proposal,
  byLabel,
  votesLabel,
  voteLabel,
  startsLabel,
  stateLabels,
}: {
  proposal: Proposal;
  byLabel: string;
  votesLabel: string;
  voteLabel: string;
  startsLabel: string;
  stateLabels: Record<string, string>;
}) {
  const totalVotes = BigInt(proposal.totalVotes || "0");

  // Handle scores - it might be a JSON string or already an array
  let scoresArray: string[] = [];
  if (typeof proposal.scores === "string") {
    try {
      scoresArray = JSON.parse(proposal.scores);
    } catch {
      scoresArray = [];
    }
  } else if (Array.isArray(proposal.scores)) {
    scoresArray = proposal.scores;
  }
  const scores = scoresArray.map((s) => BigInt(s || "0"));

  const stateClass = {
    ACTIVE: "badge-active",
    PENDING: "badge-pending",
    CLOSED: "badge-closed",
    EXECUTED: "badge-executed",
    CANCELLED: "badge-closed",
  }[proposal.state];

  // Binary voting: For vs Against
  const forVotes = scores[0] || BigInt(0);
  const againstVotes = scores[1] || BigInt(0);
  const totalBinary = forVotes + againstVotes;

  let forPercentage = 50;
  if (totalBinary > BigInt(0)) {
    forPercentage = Number((forVotes * BigInt(100)) / totalBinary);
  }

  const hasVotes = totalBinary > BigInt(0);

  return (
    <Link href={`/governance/${proposal.id}`} className="block">
      <div className="glass-card hover:border-[color:var(--sf-muted)] transition-colors">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`badge ${stateClass} text-[10px]`}>
                  {stateLabels[proposal.state]}
                </span>
                <span className="text-xs text-[color:var(--sf-muted)]">
                  {byLabel} {formatAddress(proposal.author)}
                </span>
              </div>
              <h2 className="font-semibold text-[color:var(--sf-text)] line-clamp-2">
                {proposal.title}
              </h2>
            </div>
          </div>

          {/* Progress Bar for Active Proposals */}
          {proposal.state === "ACTIVE" && (
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 flex gap-px">
                {Array.from({ length: 160 }).map((_, i) => {
                  const segmentThreshold = ((i + 1) / 160) * 100;
                  const isFilled = hasVotes && forPercentage >= segmentThreshold;
                  return (
                    <div
                      key={i}
                      className={`flex-1 h-2.5 rounded-[1px] transition-colors ${
                        isFilled
                          ? "bg-[#4ade80]"
                          : "bg-[#3a3a3a]"
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-[color:var(--sf-muted)] tabular-nums w-16 text-right">
                {hasVotes ? `${forPercentage}% For` : "No votes"}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-[color:var(--sf-muted)]">
            <span>
              {proposal._count.votes} {proposal._count.votes !== 1 ? votesLabel : voteLabel}
              {totalVotes > BigInt(0) && ` · ${formatDiesel(totalVotes)} DIESEL`}
            </span>
            <span>
              {proposal.state === "ACTIVE"
                ? formatTimeRemaining(proposal.end)
                : proposal.state === "PENDING"
                ? `${startsLabel} ${formatRelativeTime(proposal.start)}`
                : formatRelativeTime(proposal.end)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function VotersView() {
  const t = useTranslations();

  const { data, isLoading, error } = useQuery({
    queryKey: ["voters"],
    queryFn: async () => {
      const res = await fetch(`/api/governance/voters`);
      if (!res.ok) throw new Error("Failed to fetch voters");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="glass-card">
        <div className="p-5 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-10 bg-[color:var(--sf-outline)] rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-5 text-center">
        <p className="text-[color:var(--sf-muted)]">{t("governance.error")}</p>
      </div>
    );
  }

  if (!data?.voters || data.voters.length === 0) {
    return (
      <div className="glass-card p-5 text-center">
        <p className="text-[color:var(--sf-muted)]">
          {t("governance.noVoters")}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[color:var(--sf-outline)]">
              <th className="text-left py-3 px-4 text-xs font-medium text-[color:var(--sf-muted)]">
                {t("governance.voters.rank")}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[color:var(--sf-muted)]">
                {t("governance.voters.address")}
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-[color:var(--sf-muted)]">
                {t("governance.voters.votingPower")}
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-[color:var(--sf-muted)]">
                {t("governance.voters.votes")}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.voters.map((voter: any, index: number) => (
              <tr
                key={voter.voter}
                className="border-b border-[color:var(--sf-outline)] last:border-0 hover:bg-[color:var(--sf-outline)]/50 transition-colors"
              >
                <td className="py-3 px-4 text-sm text-[color:var(--sf-muted)]">
                  #{index + 1}
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm font-medium text-[color:var(--sf-text)] font-mono">
                    {formatAddress(voter.voter)}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm text-[color:var(--sf-text)] font-mono tabular-nums">
                    {formatDiesel(BigInt(voter.totalVotingPower || "0"))}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm text-[color:var(--sf-muted)]">
                    {voter.voteCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

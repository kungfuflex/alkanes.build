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
  const { isConnected, address, onConnectModalOpenChange } = useWallet();
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

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-[color:var(--sf-text)]">{t("governance.title")}</h1>
            <p className="text-[color:var(--sf-muted)]">
              {t("governance.subtitle")}
            </p>
          </div>
          {isConnected && view === "proposals" && (
            <Link
              href="/governance/create"
              className="btn-primary"
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
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === key
                    ? "bg-[color:var(--sf-primary)] text-black"
                    : "bg-[color:var(--sf-surface)] text-[color:var(--sf-muted)] border border-[color:var(--sf-outline)] hover:border-[color:var(--sf-primary)] hover:text-[color:var(--sf-primary)]"
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
            {/* Proposals List */}
            {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass-card p-6 animate-pulse"
              >
                <div className="h-6 bg-[color:var(--sf-surface)] rounded w-3/4 mb-4" />
                <div className="h-4 bg-[color:var(--sf-surface)] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="glass-card p-6 text-center">
            <p className="text-red-500">{t("governance.error")}</p>
          </div>
        ) : data?.proposals?.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <p className="text-[color:var(--sf-muted)]">
              {t("governance.noProposals")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
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
  const maxScore = scores.reduce((a, b) => (a > b ? a : b), BigInt(0));

  const stateClass = {
    ACTIVE: "badge-active",
    PENDING: "badge-pending",
    CLOSED: "badge-closed",
    EXECUTED: "badge-executed",
    CANCELLED: "badge-closed",
  }[proposal.state];

  // Find For and Against indices for progress bar
  // Support multiple naming conventions: "For"/"Against", "Approve"/"Reject", etc.
  const forIndex = proposal.choices.findIndex(
    (c) => {
      const lower = c.toLowerCase();
      return lower === "for" || lower === "approve" || lower === "yes";
    }
  );
  const againstIndex = proposal.choices.findIndex(
    (c) => {
      const lower = c.toLowerCase();
      return lower === "against" || lower === "reject" || lower === "no";
    }
  );
  const hasForAgainst = forIndex !== -1 && againstIndex !== -1;
  const forScore = hasForAgainst ? scores[forIndex] || BigInt(0) : BigInt(0);
  const againstScore = hasForAgainst
    ? scores[againstIndex] || BigInt(0)
    : BigInt(0);
  const forPercentage =
    hasForAgainst && totalVotes > BigInt(0)
      ? Number((forScore * BigInt(100)) / totalVotes)
      : hasForAgainst
      ? 0
      : 0;

  // Debug: log if progress bar should show but doesn't
  if (proposal.state === "ACTIVE" && !hasForAgainst) {
    console.log("Progress bar not showing - choices:", proposal.choices, "forIndex:", forIndex, "againstIndex:", againstIndex);
  }

  return (
    <Link href={`/governance/${proposal.id}`} className="block">
      <div className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge ${stateClass}`}>
                {stateLabels[proposal.state]}
              </span>
              <span className="text-sm text-[color:var(--sf-muted)]">
                {byLabel} {formatAddress(proposal.author)}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-[color:var(--sf-text)] group-hover:text-[color:var(--sf-primary)] transition-colors">
              {proposal.title}
            </h2>
          </div>

          {/* Progress Bar - Right side, compact */}
          {proposal.state === "ACTIVE" && hasForAgainst && (
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="relative h-2 w-32 bg-gray-500/50 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-green-500 transition-all duration-300"
                  style={{ width: `${Math.max(forPercentage, 0)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-[color:var(--sf-text)] whitespace-nowrap">
                {forPercentage.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-[color:var(--sf-muted)]">
          <span>
            {proposal._count.votes} {proposal._count.votes !== 1 ? votesLabel : voteLabel}{" "}
            · {formatDiesel(totalVotes)} DIESEL
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
      <div className="glass-card overflow-hidden">
        <div className="p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 bg-[color:var(--sf-surface)] rounded animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-red-500">{t("governance.error")}</p>
      </div>
    );
  }

  if (!data?.voters || data.voters.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
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
              <th className="text-left py-4 px-6 text-sm font-semibold text-[color:var(--sf-text)]">
                {t("governance.voters.rank")}
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[color:var(--sf-text)]">
                {t("governance.voters.address")}
              </th>
              <th className="text-right py-4 px-6 text-sm font-semibold text-[color:var(--sf-text)]">
                {t("governance.voters.votingPower")}
              </th>
              <th className="text-right py-4 px-6 text-sm font-semibold text-[color:var(--sf-text)]">
                {t("governance.voters.votes")}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.voters.map((voter: any, index: number) => (
              <tr
                key={voter.voter}
                className="border-b border-[color:var(--sf-outline)] hover:bg-[color:var(--sf-surface)]/50 transition-colors"
              >
                <td className="py-4 px-6 text-sm text-[color:var(--sf-muted)]">
                  #{index + 1}
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-medium text-[color:var(--sf-text)]">
                    {formatAddress(voter.voter)}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <span className="text-sm font-semibold text-[color:var(--sf-text)]">
                    {formatDiesel(BigInt(voter.totalVotingPower || "0"))} DIESEL
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <span className="text-sm text-[color:var(--sf-muted)]">
                    {voter.voteCount} {voter.voteCount !== 1 ? t("governance.proposal.votes") : t("governance.proposal.vote")}
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

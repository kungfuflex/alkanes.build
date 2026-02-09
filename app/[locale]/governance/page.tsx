"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/context/WalletContext";
import { ViewToggle } from "@/components/governance/ViewToggle";
import {
  formatAddress,
  formatDiesel,
  formatTimeRemaining,
  formatRelativeTime,
} from "@/lib/utils";
import { VotingProgressBar } from "@/components/governance/VotingProgressBar";
import AddressAvatar from "@/components/AddressAvatar";
import { Plus } from "lucide-react";

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
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["proposals", filter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "12");
      if (filter !== "all") {
        params.set("state", filter);
      }
      const res = await fetch(`/api/governance/proposals?${params}`);
      if (!res.ok) throw new Error("Failed to fetch proposals");
      return res.json();
    },
  });

  const totalPages = data?.pagination?.pages || 1;

  const filters = [
    { key: "all", label: t("governance.filters.all") },
    { key: "active", label: t("governance.filters.active") },
    { key: "pending", label: t("governance.filters.pending") },
    { key: "closed", label: t("governance.filters.closed") },
  ];

  return (
    <main className="py-8 px-4">
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
                className="btn-primary flex-shrink-0 !rounded-full !w-9 !h-9 !p-0 flex items-center justify-center sm:!rounded-xl sm:!w-auto sm:!h-auto sm:!px-5 sm:!py-2.5 text-sm"
              >
                <Plus size={16} className="sm:hidden" />
                <span className="hidden sm:inline">{t("governance.createProposal")}</span>
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
                  onClick={() => { setFilter(key); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
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
                <>
                  <div className="glass-card overflow-hidden divide-y divide-[color:var(--sf-outline)]">
                    {data?.proposals?.map((proposal: Proposal) => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        byLabel={t("governance.proposal.by")}
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

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-xl bg-[color:var(--sf-surface)] text-[color:var(--sf-muted)] disabled:opacity-50 hover:bg-[color:var(--sf-outline)] transition-colors"
                      >
                        {t("governance.pagination.previous")}
                      </button>
                      <span className="text-sm text-[color:var(--sf-muted)]">
                        {page} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 rounded-xl bg-[color:var(--sf-surface)] text-[color:var(--sf-muted)] disabled:opacity-50 hover:bg-[color:var(--sf-outline)] transition-colors"
                      >
                        {t("governance.pagination.next")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <VotersView />
          )}
        </div>
      </main>
  );
}

function ProposalCard({
  proposal,
  byLabel,
  startsLabel,
  stateLabels,
}: {
  proposal: Proposal;
  byLabel: string;
  startsLabel: string;
  stateLabels: Record<string, string>;
}) {
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

  // Binary voting: For vs Against
  const forVotes = scores[0] || BigInt(0);
  const againstVotes = scores[1] || BigInt(0);
  const totalBinary = forVotes + againstVotes;

  let forPercentage = 50;
  if (totalBinary > BigInt(0)) {
    forPercentage = Number((forVotes * BigInt(100)) / totalBinary);
  }

  const hasVotes = totalBinary > BigInt(0);

  const dotColor =
    proposal.state === "ACTIVE" ? "bg-green-400" :
    proposal.state === "PENDING" ? "bg-yellow-400" :
    proposal.state === "EXECUTED" ? "bg-blue-400" : "bg-gray-400";

  return (
    <Link
      href={`/governance/${proposal.id}`}
      className="flex items-center gap-3 px-5 py-5 hover:bg-white/[0.02] transition-colors overflow-hidden"
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0 mb-0.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
          <h2 className="text-[15px] font-medium text-[color:var(--sf-text)] truncate">
            {proposal.title}
          </h2>
        </div>
        <p className="text-[13px] text-[color:var(--sf-muted)] truncate pl-3.5">
          {byLabel} {formatAddress(proposal.author)}
          {" · "}
          {proposal.state === "ACTIVE"
            ? formatTimeRemaining(proposal.end)
            : proposal.state === "PENDING"
            ? `${startsLabel} ${formatRelativeTime(proposal.start)}`
            : formatRelativeTime(proposal.end)}
        </p>
      </div>

      {/* Progress bar */}
      {proposal.state === "ACTIVE" && (
        <div className="flex-shrink-0 w-[18%]">
          <VotingProgressBar
            forPercentage={forPercentage}
            hasVotes={hasVotes}
            forVotes={forVotes}
            againstVotes={againstVotes}
            showLabel={false}
          />
        </div>
      )}
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
                  <div className="flex items-center gap-2">
                    <AddressAvatar address={voter.voter} size={24} />
                    <span className="text-sm font-medium text-[color:var(--sf-text)] font-mono">
                      {formatAddress(voter.voter)}
                    </span>
                  </div>
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

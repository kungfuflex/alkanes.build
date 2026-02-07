"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/context/WalletContext";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import {
  formatAddress,
  formatDiesel,
  formatTimeRemaining,
  formatRelativeTime,
} from "@/lib/utils";
import { ArrowLeft, ExternalLink, Check, AlertCircle, CheckCircle2, Circle } from "lucide-react";

interface Vote {
  id: string;
  voter: string;
  choice: number;
  votingPower: string;
  createdAt: string;
}

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
  quorum: string;
  totalVotes: string;
  createdAt: string;
  updatedAt?: string;
  votes?: Vote[];
  _count: {
    votes: number;
  };
  discussion?: {
    id: string;
    slug: string;
    postsCount: number;
    viewsCount: number;
  };
}

function formatCompactDiesel(amount: bigint): string {
  const value = Number(amount) / 1_000_000;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (value === 0) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProposalDetailPage() {
  const t = useTranslations();
  const params = useParams();
  const proposalId = params.id as string;
  const queryClient = useQueryClient();
  const { isConnected, address, publicKey, signMessage, onConnectModalOpenChange } = useWallet();
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  // Fetch DIESEL balance via client-side hook (uses alkanes_protorunesbyaddress RPC)
  const { data: walletData } = useWalletBalances(isConnected ? address : undefined);
  const dieselBalance = useMemo(() => {
    if (!walletData?.tokens) return BigInt(0);
    const diesel = walletData.tokens.find(t => t.runeId === '2:0');
    return diesel ? BigInt(diesel.balance) : BigInt(0);
  }, [walletData]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: async () => {
      const res = await fetch(`/api/governance/proposals/${proposalId}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Proposal not found");
        }
        throw new Error("Failed to fetch proposal");
      }
      return res.json();
    },
    enabled: !!proposalId,
  });

  const proposal: Proposal | undefined = data?.proposal;

  const voteMutation = useMutation({
    mutationFn: async ({ choice }: { choice: number }) => {
      if (!address) throw new Error("Not connected");
      if (dieselBalance <= BigInt(0)) throw new Error("No DIESEL balance to vote with");

      // Create vote message with timestamp
      const timestamp = Date.now();
      const message = JSON.stringify({
        proposalId,
        choice,
        timestamp,
      });

      // Sign the message (BIP-322)
      const signature = await signMessage(message);

      // Submit vote with signature and timestamp for verification
      const res = await fetch("/api/governance/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId,
          choice,
          voter: address,
          voterSig: signature,
          voterPubkey: publicKey,
          timestamp,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit vote");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
      setSelectedChoice(null);
      setVoteError(null);
    },
    onError: (error: Error) => {
      setVoteError(error.message);
    },
  });

  const handleVote = async () => {
    if (selectedChoice === null) return;
    setIsVoting(true);
    setVoteError(null);

    try {
      await voteMutation.mutateAsync({ choice: selectedChoice });
    } finally {
      setIsVoting(false);
    }
  };

  // Calculate totals
  const scoresArray = Array.isArray(proposal?.scores) ? proposal.scores : [];
  const scores = scoresArray.map((s) => BigInt(s || "0"));
  const totalVotes = scores.reduce((a, b) => a + b, BigInt(0));
  const maxScore = scores.reduce((a, b) => (a > b ? a : b), BigInt(0));
  const forPercentage =
    totalVotes > BigInt(0)
      ? Math.round(Number((scores[0] || BigInt(0)) * BigInt(10000) / totalVotes) / 100)
      : 0;

  // Check if user has voted
  const userVote = proposal?.votes?.find((v) => v.voter === address);

  const stateClass = {
    ACTIVE: "badge-active",
    PENDING: "badge-pending",
    CLOSED: "badge-closed",
    EXECUTED: "badge-executed",
    CANCELLED: "badge-closed",
  }[proposal?.state || "PENDING"];

  if (isLoading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8 w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[color:var(--sf-surface)] rounded w-1/4" />
          <div className="h-12 bg-[color:var(--sf-surface)] rounded w-3/4" />
          <div className="h-64 bg-[color:var(--sf-surface)] rounded" />
        </div>
      </main>
    );
  }

  if (error || !proposal) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8 w-full">
        <Link
          href="/governance"
          className="inline-flex items-center gap-2 text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] mb-6"
        >
          <ArrowLeft size={20} />
          {t("governance.backToProposals")}
        </Link>
        <div className="glass-card p-8 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2 text-[color:var(--sf-text)]">
            {t("governance.proposalNotFound")}
          </h2>
          <p className="text-[color:var(--sf-muted)]">
            {error?.message || t("governance.proposalNotFoundDesc")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 w-full">
        {/* Back Link */}
        <Link
          href="/governance"
          className="inline-flex items-center gap-2 text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] mb-6"
        >
          <ArrowLeft size={20} />
          {t("governance.backToProposals")}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className={`badge ${stateClass}`}>
                  {t(`governance.states.${proposal.state}`)}
                </span>
                <span className="text-sm text-[color:var(--sf-muted)]">
                  {t("governance.proposal.by")} {formatAddress(proposal.author)}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-[color:var(--sf-text)] mb-4">
                {proposal.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-[color:var(--sf-muted)]">
                <span>
                  {proposal.state === "ACTIVE"
                    ? formatTimeRemaining(proposal.end)
                    : proposal.state === "PENDING"
                    ? `${t("governance.proposal.starts")} ${formatRelativeTime(proposal.start)}`
                    : formatRelativeTime(proposal.end)}
                </span>
                <span>
                  {proposal._count.votes} {proposal._count.votes !== 1 ? t("governance.proposal.votes") : t("governance.proposal.vote")}
                </span>
                <span>{formatDiesel(totalVotes)} DIESEL</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="max-w-none text-white">
                {proposal.body.split("\n").map((line, i) => (
                  <p key={i} className="mb-2">{line}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Voting Activity */}
            <div className="glass-card overflow-hidden">
              {/* Results — single progress bar + score list */}
              <div className="px-6 pt-6 pb-5">
                <h2 className="text-lg font-semibold text-[color:var(--sf-text)] mb-5">
                  Voting Activity
                </h2>

                {/* Main progress bar: For vs Against */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5 text-xs tabular-nums">
                    <span className="text-green-400">
                      {formatCompactDiesel(scores[0] || BigInt(0))} For
                    </span>
                    <span className="text-red-400">
                      {formatCompactDiesel(scores[1] || BigInt(0))} Against
                    </span>
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ background: totalVotes > BigInt(0) ? "#f87171" : "#1a1a1a" }}
                  >
                    {totalVotes > BigInt(0) && forPercentage > 0 && (
                      <div
                        className="h-full rounded-full transition-all bg-green-400"
                        style={{ width: `${forPercentage}%` }}
                      />
                    )}
                  </div>
                  <div className="text-xs text-[color:var(--sf-muted)] mt-1.5 tabular-nums">
                    {formatCompactDiesel(totalVotes)} DIESEL total &middot; {proposal._count.votes} {proposal._count.votes !== 1 ? t("governance.proposal.votes") : t("governance.proposal.vote")}
                  </div>
                </div>

              </div>

              {/* Quorum */}
              {(() => {
                const quorum = BigInt(proposal.quorum || "0");
                const quorumMet = quorum > BigInt(0) && totalVotes >= quorum;
                const quorumPct = quorum > BigInt(0)
                  ? Math.min(100, Math.round(Number(totalVotes * BigInt(100) / quorum)))
                  : 0;

                return quorum > BigInt(0) ? (
                  <div className="border-t border-[color:var(--sf-outline)] px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[color:var(--sf-muted)]">Quorum</span>
                      {quorumMet ? (
                        <CheckCircle2 size={16} className="text-green-400" />
                      ) : (
                        <Circle size={16} className="text-[color:var(--sf-muted)]" />
                      )}
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all ${quorumMet ? "bg-green-400" : "bg-[color:var(--sf-primary)]"}`}
                        style={{ width: `${quorumPct}%` }}
                      />
                    </div>
                    <div className="text-xs text-[color:var(--sf-muted)] tabular-nums">
                      {formatCompactDiesel(totalVotes)} / {formatCompactDiesel(quorum)} Required
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Cast your vote */}
              {proposal.state === "ACTIVE" && !userVote && (
                <div className="border-t border-[color:var(--sf-outline)] px-6 py-5">
                  {!isConnected ? (
                    <button
                      onClick={() => onConnectModalOpenChange(true)}
                      className="w-full btn-primary"
                    >
                      {t("governance.connectToVote")}
                    </button>
                  ) : dieselBalance <= BigInt(0) ? (
                    <div className="text-center text-sm text-[color:var(--sf-muted)] py-2">
                      No DIESEL balance to vote with
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xs font-medium uppercase tracking-wider text-[color:var(--sf-muted)] mb-3">
                        Cast your vote
                      </h3>
                      <div className="flex gap-2 mb-3">
                        {proposal.choices.map((choice, index) => {
                          const isSelected = selectedChoice === index;
                          const borderColor =
                            choice.toUpperCase() === "FOR" || index === 0
                              ? "border-green-400 ring-green-400/30"
                              : choice.toUpperCase() === "AGAINST"
                              ? "border-red-400 ring-red-400/30"
                              : "border-yellow-500 ring-yellow-500/30";
                          const textColor =
                            choice.toUpperCase() === "FOR" || index === 0
                              ? "text-green-400"
                              : choice.toUpperCase() === "AGAINST"
                              ? "text-red-400"
                              : "text-yellow-400";

                          return (
                            <button
                              key={index}
                              onClick={() => setSelectedChoice(index)}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                                isSelected
                                  ? `${borderColor} ring-1 ${textColor}`
                                  : "border-[color:var(--sf-outline)] text-[color:var(--sf-muted)] hover:border-white/15"
                              }`}
                            >
                              {choice}
                            </button>
                          );
                        })}
                      </div>
                      <div className="text-center text-xs text-[color:var(--sf-muted)] mb-2">
                        Your voting power: {formatDiesel(dieselBalance)} DIESEL
                      </div>
                      <button
                        onClick={handleVote}
                        disabled={selectedChoice === null || isVoting}
                        className="w-full btn-primary disabled:opacity-50"
                      >
                        {isVoting ? t("governance.voting") : t("governance.castVote")}
                      </button>
                    </>
                  )}

                  {voteError && (
                    <div className="mt-2 text-sm text-red-500 text-center">
                      {voteError}
                    </div>
                  )}
                </div>
              )}

              {/* Recent votes */}
              {proposal.votes && proposal.votes.length > 0 && (
                <div className="border-t border-[color:var(--sf-outline)] px-6 py-4">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-[color:var(--sf-muted)] mb-3">
                    Recent Votes
                  </h3>
                  <div className="max-h-40 overflow-y-auto space-y-0">
                    {proposal.votes.map((vote) => (
                      <div
                        key={vote.id}
                        className="flex items-center justify-between py-1.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              vote.choice === 0 ? "bg-green-400" : vote.choice === 1 ? "bg-red-400" : "bg-yellow-400"
                            }`}
                          />
                          <span className="text-[color:var(--sf-text)] truncate font-mono text-xs">
                            {formatAddress(vote.voter)}
                          </span>
                        </div>
                        <span className="text-[color:var(--sf-muted)] flex-shrink-0 ml-2 tabular-nums text-xs">
                          {formatCompactDiesel(BigInt(vote.votingPower))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="border-t border-[color:var(--sf-outline)] px-6 py-4">
                <div className="space-y-0">
                  {[
                    {
                      label: "Proposal created",
                      date: proposal.createdAt,
                      done: true,
                    },
                    {
                      label: "Voting period start",
                      date: proposal.start,
                      done: new Date() >= new Date(proposal.start),
                    },
                    {
                      label: "Voting period end",
                      date: proposal.end,
                      done: new Date() >= new Date(proposal.end),
                    },
                    ...(proposal.state === "EXECUTED"
                      ? [{
                          label: "Proposal executed",
                          date: proposal.updatedAt || proposal.end,
                          done: true,
                        }]
                      : []),
                  ].map((step, i, arr) => (
                    <div key={i} className="flex gap-3">
                      {/* Vertical line + dot */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            step.done ? "bg-green-400" : "bg-white/20"
                          }`}
                        />
                        {i < arr.length - 1 && (
                          <div className="w-px flex-1 bg-white/10 my-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <div className="text-sm text-[color:var(--sf-text)]">
                          {step.label}
                        </div>
                        <div className="text-xs text-[color:var(--sf-muted)]">
                          {formatDateTime(step.date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Discussion Link */}
            {proposal.discussion && (
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4 text-[color:var(--sf-text)]">
                  {t("governance.proposal.discussion")}
                </h2>
                <Link
                  href={`/forum/${proposal.discussion.slug}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-[color:var(--sf-surface)] hover:bg-[color:var(--sf-surface)]/80 transition-colors"
                >
                  <div>
                    <div className="text-[color:var(--sf-text)]">
                      {proposal.discussion.postsCount} {t("governance.posts")}
                    </div>
                    <div className="text-sm text-[color:var(--sf-muted)]">
                      {proposal.discussion.viewsCount} {t("governance.views")}
                    </div>
                  </div>
                  <ExternalLink size={20} className="text-[color:var(--sf-muted)]" />
                </Link>
              </div>
            )}

          </div>
        </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/context/WalletContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
  const { isConnected, address, onConnectModalOpenChange } = useWallet();
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-[color:var(--sf-text)]">DIESEL Governance</h1>
            <p className="text-[color:var(--sf-muted)]">
              Vote on proposals to shape the future of Alkanes
            </p>
          </div>
          {isConnected && (
            <Link
              href="/governance/create"
              className="btn-primary"
            >
              Create Proposal
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", "active", "pending", "closed"].map((state) => (
            <button
              key={state}
              onClick={() => setFilter(state)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === state
                  ? "bg-[color:var(--sf-primary)] text-black"
                  : "bg-[color:var(--sf-surface)] text-[color:var(--sf-muted)] border border-[color:var(--sf-outline)] hover:border-[color:var(--sf-primary)] hover:text-[color:var(--sf-primary)]"
              }`}
            >
              {state.charAt(0).toUpperCase() + state.slice(1)}
            </button>
          ))}
        </div>

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
            <p className="text-red-500">Failed to load proposals</p>
          </div>
        ) : data?.proposals?.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <p className="text-[color:var(--sf-muted)]">
              No proposals found
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.proposals?.map((proposal: Proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const totalVotes = BigInt(proposal.totalVotes || "0");
  const scores = proposal.scores.map((s) => BigInt(s || "0"));
  const maxScore = scores.reduce((a, b) => (a > b ? a : b), BigInt(0));

  const stateClass = {
    ACTIVE: "badge-active",
    PENDING: "badge-pending",
    CLOSED: "badge-closed",
    EXECUTED: "badge-executed",
    CANCELLED: "badge-closed",
  }[proposal.state];

  return (
    <Link href={`/governance/${proposal.id}`}>
      <div className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge ${stateClass}`}>
                {proposal.state}
              </span>
              <span className="text-sm text-[color:var(--sf-muted)]">
                by {formatAddress(proposal.author)}
              </span>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-[color:var(--sf-text)] group-hover:text-[color:var(--sf-primary)] transition-colors">
              {proposal.title}
            </h2>
            <p className="text-[color:var(--sf-muted)] line-clamp-2">
              {proposal.body}
            </p>
          </div>
        </div>

        {/* Results Preview */}
        {totalVotes > 0 && (
          <div className="space-y-2 mb-4">
            {proposal.choices.map((choice, index) => {
              const score = scores[index];
              const percentage =
                totalVotes > 0
                  ? Number((score * BigInt(100)) / totalVotes)
                  : 0;
              const isWinning = score === maxScore && maxScore > 0;

              return (
                <div key={index} className="relative">
                  <div
                    className={`absolute inset-0 rounded ${
                      isWinning
                        ? "bg-green-500/20"
                        : "bg-[color:var(--sf-surface)]"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="relative flex justify-between px-3 py-1.5 text-sm">
                    <span className="text-[color:var(--sf-text)]">{choice}</span>
                    <span className="font-medium text-[color:var(--sf-text)]">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-[color:var(--sf-muted)]">
          <span>
            {proposal._count.votes} vote{proposal._count.votes !== 1 ? "s" : ""}{" "}
            · {formatDiesel(totalVotes)} DIESEL
          </span>
          <span>
            {proposal.state === "ACTIVE"
              ? formatTimeRemaining(proposal.end)
              : proposal.state === "PENDING"
              ? `Starts ${formatRelativeTime(proposal.start)}`
              : formatRelativeTime(proposal.end)}
          </span>
        </div>
      </div>
    </Link>
  );
}

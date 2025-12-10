"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/context/WalletContext";
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-alkane rounded-lg" />
                <span className="font-bold text-xl">Alkanes</span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link
                  href="/docs"
                  className="text-slate-600 hover:text-alkane-600 dark:text-slate-300 dark:hover:text-alkane-400 transition-colors"
                >
                  Documentation
                </Link>
                <Link
                  href="/governance"
                  className="text-alkane-600 dark:text-alkane-400 font-medium"
                >
                  Governance
                </Link>
              </nav>
            </div>
            <div>
              {isConnected ? (
                <div className="px-4 py-2 bg-alkane-100 dark:bg-alkane-900 rounded-lg text-sm font-mono">
                  {formatAddress(address)}
                </div>
              ) : (
                <button
                  onClick={() => onConnectModalOpenChange(true)}
                  className="px-4 py-2 bg-gradient-alkane text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">DIESEL Governance</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Vote on proposals to shape the future of Alkanes
            </p>
          </div>
          {isConnected && (
            <Link
              href="/governance/create"
              className="px-4 py-2 bg-gradient-alkane text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Create Proposal
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {["all", "active", "pending", "closed"].map((state) => (
            <button
              key={state}
              onClick={() => setFilter(state)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === state
                  ? "bg-alkane-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
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
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="glass-card p-6 text-center">
            <p className="text-red-500">Failed to load proposals</p>
          </div>
        ) : data?.proposals?.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <p className="text-slate-600 dark:text-slate-400">
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
    </div>
  );
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const totalVotes = BigInt(proposal.totalVotes || "0");
  const scores = proposal.scores.map((s) => BigInt(s || "0"));
  const maxScore = scores.reduce((a, b) => (a > b ? a : b), BigInt(0));

  return (
    <Link href={`/governance/${proposal.id}`}>
      <div className="proposal-card cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  proposal.state === "ACTIVE"
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : proposal.state === "PENDING"
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {proposal.state}
              </span>
              <span className="text-sm text-slate-500">
                by {formatAddress(proposal.author)}
              </span>
            </div>
            <h2 className="text-xl font-semibold mb-2">{proposal.title}</h2>
            <p className="text-slate-600 dark:text-slate-400 line-clamp-2">
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
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-slate-100 dark:bg-slate-800"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="relative flex justify-between px-3 py-1.5 text-sm">
                    <span>{choice}</span>
                    <span className="font-medium">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-slate-500">
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

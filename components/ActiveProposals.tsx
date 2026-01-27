"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatAddress, formatTimeRemaining, formatRelativeTime } from "@/lib/utils";

interface Proposal {
  id: string;
  title: string;
  author: string;
  start: string;
  end: string;
  state: "PENDING" | "ACTIVE" | "CLOSED" | "EXECUTED" | "CANCELLED";
  scores: string[] | string;
  totalVotes: string;
  _count: { votes: number };
}

export function ActiveProposals() {
  const t = useTranslations("dashboard.proposals");
  const tGov = useTranslations("governance");

  const { data, isLoading, error } = useQuery({
    queryKey: ["activeProposals"],
    queryFn: async () => {
      const [activeRes, pendingRes] = await Promise.all([
        fetch("/api/governance/proposals?state=active&limit=3"),
        fetch("/api/governance/proposals?state=pending&limit=3"),
      ]);

      if (!activeRes.ok || !pendingRes.ok) {
        throw new Error("Failed to fetch proposals");
      }

      const [activeData, pendingData] = await Promise.all([
        activeRes.json(),
        pendingRes.json(),
      ]);

      return [...activeData.proposals, ...pendingData.proposals].slice(0, 3) as Proposal[];
    },
    staleTime: 30000,
  });

  const proposals = data || [];

  return (
    <div className="glass-card overflow-hidden w-full">
      <div className="card-header flex items-center justify-between gap-2">
        <h3 className="font-semibold text-[color:var(--sf-text)] truncate">{t("title")}</h3>
        <Link
          href="/governance"
          className="text-sm text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] transition-colors whitespace-nowrap flex-shrink-0"
        >
          View all →
        </Link>
      </div>

      <div className="p-4 space-y-2 overflow-hidden">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-[color:var(--sf-bg-end)] animate-pulse">
              <div className="h-4 bg-[color:var(--sf-outline)] rounded w-3/4 mb-2" />
              <div className="h-3 bg-[color:var(--sf-outline)] rounded w-1/2" />
            </div>
          ))
        ) : error ? (
          <div className="p-4 text-center text-[color:var(--sf-muted)]">{tGov("error")}</div>
        ) : proposals.length === 0 ? (
          <div className="p-4 text-center text-[color:var(--sf-muted)]">{tGov("noProposals")}</div>
        ) : (
          proposals.map((proposal) => (
            <ProposalRow
              key={proposal.id}
              proposal={proposal}
              stateLabel={tGov(`states.${proposal.state}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ProposalRow({ proposal, stateLabel }: { proposal: Proposal; stateLabel: string }) {
  // Handle both array and JSON string formats for scores
  let scoresArray: string[] = [];
  if (Array.isArray(proposal.scores)) {
    scoresArray = proposal.scores;
  } else if (typeof proposal.scores === "string") {
    try {
      scoresArray = JSON.parse(proposal.scores);
    } catch {
      scoresArray = [];
    }
  }
  const scores = scoresArray.map((s) => BigInt(s || "0"));

  // Binary voting: For (scores[0]) vs Against (scores[1])
  const forVotes = scores[0] || BigInt(0);
  const againstVotes = scores[1] || BigInt(0);
  const totalVotes = forVotes + againstVotes;

  let forPercentage = 50;
  let againstPercentage = 50;
  if (totalVotes > BigInt(0)) {
    forPercentage = Number((forVotes * BigInt(100)) / totalVotes);
    againstPercentage = 100 - forPercentage;
  }

  const stateClass = {
    ACTIVE: "badge-active",
    PENDING: "badge-pending",
    CLOSED: "badge-closed",
    EXECUTED: "badge-executed",
    CANCELLED: "badge-closed",
  }[proposal.state];

  const hasVotes = totalVotes > BigInt(0);

  // Match governance page segment count
  const segmentCount = 160;

  return (
    <Link
      href={`/governance/${proposal.id}`}
      className="block p-3 rounded-lg bg-black/20 backdrop-blur-sm border border-white/5 hover:bg-black/30 transition-colors group overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h4 className="font-medium text-sm text-[color:var(--sf-text)] truncate flex-1 min-w-0">
          {proposal.title}
        </h4>
        <span className={`badge ${stateClass} text-[10px] flex-shrink-0`}>{stateLabel}</span>
      </div>

      {proposal.state === "ACTIVE" && (
        <div className="mt-3 flex items-center gap-2 overflow-hidden">
          <div className="flex-1 flex gap-px min-w-0 overflow-hidden">
            {Array.from({ length: segmentCount }).map((_, i) => {
              const segmentThreshold = ((i + 1) / segmentCount) * 100;
              const isFilled = hasVotes && forPercentage >= segmentThreshold;
              return (
                <div
                  key={i}
                  className={`flex-1 h-2.5 rounded-[1px] transition-colors min-w-0 ${
                    isFilled
                      ? "bg-[#4ade80]"
                      : "bg-[#3a3a3a]"
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[10px] text-[color:var(--sf-muted)] tabular-nums whitespace-nowrap flex-shrink-0">
            {hasVotes ? `${forPercentage}%` : "No votes"}
          </span>
        </div>
      )}
    </Link>
  );
}

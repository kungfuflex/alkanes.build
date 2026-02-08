"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatAddress, formatTimeRemaining, formatRelativeTime } from "@/lib/utils";
import { VotingProgressBar } from "@/components/governance/VotingProgressBar";
import { Vote, AlertCircle } from "lucide-react";

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
  const tCommon = useTranslations("common");
  const tGov = useTranslations("governance");

  const { data, error } = useQuery({
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

  const { data: votersData } = useQuery({
    queryKey: ["votersCount"],
    queryFn: async () => {
      const res = await fetch("/api/governance/voters");
      if (!res.ok) throw new Error("Failed to fetch voters");
      return res.json();
    },
    staleTime: 60000,
  });

  const proposals = data || [];
  const hasData = !!data;
  const activeCount = proposals.filter((p) => p.state === "ACTIVE").length;
  const totalVoters = votersData?.total || 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <h3 className="text-lg font-bold text-[color:var(--sf-text)] truncate">{t("title")}</h3>
        <Link
          href="/governance"
          className="text-sm text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] transition-colors whitespace-nowrap flex-shrink-0"
        >
          {tCommon("viewAll")} →
        </Link>
      </div>

      <div className="glass-card overflow-hidden" style={{ background: "#101010" }}>
        <div className="rounded-b-3xl overflow-hidden bg-[color:var(--sf-surface)] divide-y divide-[color:var(--sf-outline)]">
          {error ? (
            <div className="flex flex-col items-center justify-center min-h-[160px] gap-3 p-6">
              <div className="w-10 h-10 rounded-full bg-[color:var(--sf-outline)] flex items-center justify-center">
                <AlertCircle size={18} className="text-[color:var(--sf-muted)]" />
              </div>
              <p className="text-sm text-[color:var(--sf-muted)]">{tGov("error")}</p>
            </div>
          ) : hasData && proposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[160px] gap-3 p-6">
              <div className="w-10 h-10 rounded-full bg-[color:var(--sf-outline)] flex items-center justify-center">
                <Vote size={18} className="text-[color:var(--sf-muted)]" />
              </div>
              <p className="text-sm text-[color:var(--sf-muted)]">{tGov("noProposals")}</p>
              <Link
                href="/governance/create"
                className="text-xs text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] transition-colors border border-[color:var(--sf-outline)] rounded-lg px-3 py-1.5"
              >
                {tGov("createProposal")} →
              </Link>
            </div>
          ) : hasData ? (
            proposals.map((proposal) => (
              <ProposalRow
                key={proposal.id}
                proposal={proposal}
                stateLabel={tGov(`states.${proposal.state}`)}
              />
            ))
          ) : (
            [1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-[color:var(--sf-bg-end)] animate-pulse">
                <div className="h-4 bg-[color:var(--sf-outline)] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[color:var(--sf-outline)] rounded w-1/2" />
              </div>
            ))
          )}
        </div>
        {/* Footer */}
        {hasData && (
          <div className="px-5 py-3 flex items-center justify-between">
            <p className="text-xs text-[color:var(--sf-muted)]">
              Active: <span className="text-[color:var(--sf-text)] font-semibold tabular-nums">{activeCount}</span>
            </p>
            <p className="text-xs text-[color:var(--sf-muted)]">
              Voters: <span className="text-[color:var(--sf-text)] font-semibold tabular-nums">{totalVoters}</span>
            </p>
          </div>
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

  return (
    <Link
      href={`/governance/${proposal.id}`}
      className="flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors group overflow-hidden"
    >
      {/* Left: content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0 mb-0.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              proposal.state === "ACTIVE" ? "bg-green-400" :
              proposal.state === "PENDING" ? "bg-yellow-400" :
              proposal.state === "EXECUTED" ? "bg-blue-400" : "bg-gray-400"
            }`}
          />
          <h4 className="text-[15px] text-[color:var(--sf-text)] truncate">
            {proposal.title}
          </h4>
        </div>
        <p className="text-[13px] text-[color:var(--sf-muted)] truncate pl-3.5">
          {formatAddress(proposal.author)}
          {" · "}
          {proposal.state === "ACTIVE"
            ? formatTimeRemaining(proposal.end)
            : proposal.state === "PENDING"
            ? formatRelativeTime(proposal.start)
            : formatRelativeTime(proposal.end)}
        </p>
      </div>

      {/* Right: progress bar */}
      {proposal.state === "ACTIVE" && (
        <div className="flex-shrink-0 w-[20%]">
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

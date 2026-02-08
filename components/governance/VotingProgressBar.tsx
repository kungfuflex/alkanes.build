"use client";

interface VotingProgressBarProps {
  forPercentage: number;
  hasVotes: boolean;
  forVotes?: bigint;
  againstVotes?: bigint;
  showLabel?: boolean;
  labelWidth?: string;
}

function formatCompactDiesel(amount: bigint): string {
  const value = Number(amount) / 1_000_000;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (value === 0) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Compact voting progress bar for governance proposals.
 * Green = For, Red = Against. Grey when no votes.
 */
export function VotingProgressBar({
  forPercentage,
  hasVotes,
  forVotes,
  againstVotes,
  showLabel = true,
  labelWidth = "w-16",
}: VotingProgressBarProps) {
  return (
    <div>
      {hasVotes && forVotes !== undefined && againstVotes !== undefined && (
        <div className="hidden md:flex items-center justify-between mb-1 text-[11px] tabular-nums">
          <span className="text-[#4ade80]">{formatCompactDiesel(forVotes)} For</span>
          <span className="text-[#f87171]">{formatCompactDiesel(againstVotes)} Against</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div
          className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{
            background: hasVotes ? "#f87171" : "#2a2a2a",
          }}
        >
          {hasVotes && forPercentage > 0 && (
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${forPercentage}%`,
                background: "#4ade80",
              }}
            />
          )}
        </div>
        {showLabel && (
          <span className={`text-[11px] text-[color:var(--sf-muted)] tabular-nums whitespace-nowrap flex-shrink-0 text-right ${labelWidth}`}>
            {hasVotes ? `${forPercentage}%` : "—"}
          </span>
        )}
      </div>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";

interface BlockTracesResponse {
  success: boolean;
  data?: {
    height: number;
    txCount: number;
    timestamp: number;
  };
  error?: string;
}

function GaugeChart({ value, max = 3000 }: { value: number; max?: number }) {
  const clampedValue = Math.min(value, max);
  const percentage = (clampedValue / max) * 100;

  // Arc calculations
  const radius = 65;
  const strokeWidth = 8;
  const centerX = 100;
  const centerY = 80;

  // Semi-circle arc length
  const circumference = Math.PI * radius;
  const filledLength = (percentage / 100) * circumference;

  // Arc path (semi-circle from left to right)
  const arcPath = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`;

  // Needle angle (180° = left, 0° = right)
  const needleAngle = 180 - (percentage / 100) * 180;
  const needleLength = radius - 15;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleX = centerX + needleLength * Math.cos(needleRad);
  const needleY = centerY - needleLength * Math.sin(needleRad);

  // Determine color based on value
  let color: string;
  let level: string;
  if (value < 300) {
    color = "#6b7280"; // gray
    level = "Low";
  } else if (value < 1500) {
    color = "#fbbf24"; // yellow
    level = "Medium";
  } else {
    color = "#4ade80"; // green
    level = "High";
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 100" className="w-full max-w-[180px]">
        {/* Background arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="var(--sf-outline)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Value arc using stroke-dasharray */}
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${circumference}`}
          className="transition-all duration-700"
        />

        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke="var(--sf-text)"
          strokeWidth="2"
          strokeLinecap="round"
          className="transition-all duration-700"
        />

        {/* Center circle */}
        <circle cx={centerX} cy={centerY} r="4" fill="var(--sf-text)" />

      </svg>

      {/* Value display */}
      <div className="text-center -mt-1">
        <span className="text-2xl font-bold text-[color:var(--sf-text)] font-mono tabular-nums">
          {value.toLocaleString()}
        </span>
        <span className="text-xs text-[color:var(--sf-muted)] ml-1">txs</span>
        <div className="text-xs font-medium mt-0.5" style={{ color }}>
          {level}
        </div>
      </div>
    </div>
  );
}

export function BlockActivity() {
  const { data } = useQuery({
    queryKey: ["block-traces"],
    queryFn: async (): Promise<BlockTracesResponse["data"]> => {
      const res = await fetch("/api/block-traces");
      const json: BlockTracesResponse = await res.json();

      if (!json.success || !json.data) {
        throw new Error(json.error || "Failed to fetch block traces");
      }

      return json.data;
    },
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
  });

  // Show stale data if available, even when there's an error
  const hasData = !!data;

  // Match dot color to gauge level
  let dotColor = "#6b7280"; // gray (default/low)
  if (data) {
    if (data.txCount >= 1500) dotColor = "#4ade80"; // green (high)
    else if (data.txCount >= 300) dotColor = "#fbbf24"; // yellow (medium)
  }

  return (
    <div className="glass-card overflow-hidden w-full">
      <div className="card-header flex items-center justify-between">
        <h3 className="text-lg font-bold text-[color:var(--sf-text)]">Alkanes Block Activity</h3>
        {data && (
          <span className="text-xs text-[color:var(--sf-muted)] font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: dotColor }} />
            {data.height.toLocaleString()}
          </span>
        )}
      </div>

      <div className="p-5">
        {hasData ? (
          <GaugeChart value={data.txCount} />
        ) : (
          <div className="flex flex-col items-center py-4">
            <div className="h-16 w-32 bg-[color:var(--sf-outline)] rounded animate-pulse mb-2" />
            <div className="h-6 w-20 bg-[color:var(--sf-outline)] rounded animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}

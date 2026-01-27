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
  const radius = 70;
  const strokeWidth = 8;
  const centerX = 100;
  const centerY = 85;

  // Arc goes from 180deg to 0deg (left to right, bottom half)
  const startAngle = 180;
  const endAngle = 0;
  const totalAngle = startAngle - endAngle;

  // Calculate the arc path
  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY - radius * Math.sin(rad),
    };
  };

  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);

  // Background arc path
  const bgArcPath = `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;

  // Calculate current position for the value arc
  const valueAngle = startAngle - (percentage / 100) * totalAngle;
  const valueEnd = polarToCartesian(valueAngle);
  const largeArcFlag = percentage > 50 ? 1 : 0;
  const valueArcPath = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${valueEnd.x} ${valueEnd.y}`;

  // Needle angle
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
      <svg viewBox="0 0 200 110" className="w-full max-w-[180px]">
        {/* Background arc */}
        <path
          d={bgArcPath}
          fill="none"
          stroke="var(--sf-outline)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Value arc */}
        <path
          d={valueArcPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
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
  const { data, isLoading, error } = useQuery({
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

  return (
    <div className="glass-card overflow-hidden w-full">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-semibold text-[color:var(--sf-text)]">Last Block Activity</h3>
        {data && (
          <span className="text-xs text-[color:var(--sf-muted)] font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            {data.height.toLocaleString()}
          </span>
        )}
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="flex flex-col items-center py-4">
            <div className="h-16 w-32 bg-[color:var(--sf-outline)] rounded animate-pulse mb-2" />
            <div className="h-6 w-20 bg-[color:var(--sf-outline)] rounded animate-pulse" />
          </div>
        ) : error ? (
          <div className="text-sm text-[color:var(--sf-muted)] text-center py-4">Failed to load</div>
        ) : data ? (
          <GaugeChart value={data.txCount} />
        ) : null}
      </div>
    </div>
  );
}

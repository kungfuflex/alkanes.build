"use client";

import { useRef, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface ViewToggleProps {
  view: "proposals" | "voters";
  onViewChange: (view: "proposals" | "voters") => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const t = useTranslations();
  const containerRef = useRef<HTMLDivElement>(null);
  const proposalsRef = useRef<HTMLButtonElement>(null);
  const votersRef = useRef<HTMLButtonElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const activeRef = view === "proposals" ? proposalsRef : votersRef;
    const el = activeRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicator({
      left: elRect.left - containerRect.left,
      width: elRect.width,
    });
  }, [view]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center border border-[color:var(--sf-outline)] rounded-xl p-1 gap-1"
    >
      {/* Sliding indicator */}
      <div
        className="absolute rounded-lg bg-[color:var(--sf-text)] transition-all duration-250 ease-out"
        style={{
          left: indicator.left,
          width: indicator.width,
          top: 4,
          bottom: 4,
        }}
      />
      <button
        ref={proposalsRef}
        onClick={() => onViewChange("proposals")}
        className={`relative z-10 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
          view === "proposals"
            ? "text-[color:var(--sf-bg-start)]"
            : "text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)]"
        }`}
      >
        {t("governance.tabs.proposals")}
      </button>
      <button
        ref={votersRef}
        onClick={() => onViewChange("voters")}
        className={`relative z-10 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
          view === "voters"
            ? "text-[color:var(--sf-bg-start)]"
            : "text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)]"
        }`}
      >
        {t("governance.tabs.voters")}
      </button>
    </div>
  );
}

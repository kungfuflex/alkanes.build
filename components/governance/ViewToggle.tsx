"use client";

import { useTranslations } from "next-intl";

interface ViewToggleProps {
  view: "proposals" | "voters";
  onViewChange: (view: "proposals" | "voters") => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const t = useTranslations();

  return (
    <div className="inline-flex items-center border border-[color:var(--sf-outline)] rounded-lg p-1 gap-1">
      <button
        onClick={() => onViewChange("proposals")}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          view === "proposals"
            ? "bg-[color:var(--sf-text)] text-[color:var(--sf-bg-start)]"
            : "text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)]"
        }`}
      >
        {t("governance.tabs.proposals")}
      </button>
      <button
        onClick={() => onViewChange("voters")}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          view === "voters"
            ? "bg-[color:var(--sf-text)] text-[color:var(--sf-bg-start)]"
            : "text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)]"
        }`}
      >
        {t("governance.tabs.voters")}
      </button>
    </div>
  );
}

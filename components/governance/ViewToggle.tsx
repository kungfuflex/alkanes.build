"use client";

import { useTranslations } from "next-intl";

interface ViewToggleProps {
  view: "proposals" | "voters";
  onViewChange: (view: "proposals" | "voters") => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const t = useTranslations();

  return (
    <div className="relative inline-flex items-center bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] rounded-lg p-1">
      {/* Background slider */}
      <div
        className="absolute top-1 bottom-1 rounded-md bg-[color:var(--sf-primary)] transition-all duration-300 ease-in-out"
        style={{
          left: view === "proposals" ? "4px" : "50%",
          width: "calc(50% - 4px)",
        }}
      />

      {/* Buttons */}
      <button
        onClick={() => onViewChange("proposals")}
        className={`relative z-10 px-6 py-2 rounded-md font-medium transition-colors duration-300 ${
          view === "proposals"
            ? "text-black"
            : "text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)]"
        }`}
      >
        {t("governance.tabs.proposals")}
      </button>
      <button
        onClick={() => onViewChange("voters")}
        className={`relative z-10 px-6 py-2 rounded-md font-medium transition-colors duration-300 ${
          view === "voters"
            ? "text-black"
            : "text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)]"
        }`}
      >
        {t("governance.tabs.voters")}
      </button>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LayoutDashboard, Vote, MessageSquare, BookOpen, Sparkles } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, labelKey: "navigation.dashboard" },
  { href: "/governance", icon: Vote, labelKey: "navigation.governance" },
  { href: "/forum", icon: MessageSquare, labelKey: "navigation.forum" },
  { href: "/docs", icon: BookOpen, labelKey: "navigation.docs" },
  { href: "/aries", icon: Sparkles, labelKey: "navigation.aries" },
] as const;

export function BottomNav() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-[color:var(--sf-outline)] bg-[#0d0d0d]">
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
          const isActive =
            href === "/"
              ? pathname === "/" || pathname === ""
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive
                  ? "text-[color:var(--sf-text)]"
                  : "text-[color:var(--sf-muted)]"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

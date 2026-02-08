"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";

/** Routes that render without the shared Header/Footer chrome. */
const BARE_ROUTES = ["/terminal"];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Strip locale prefix (e.g. "/en/terminal" → "/terminal")
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  const isBare = BARE_ROUTES.some((r) => pathWithoutLocale.startsWith(r));

  if (isBare) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col pb-14 md:pb-0">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
      <BottomNav />
    </div>
  );
}

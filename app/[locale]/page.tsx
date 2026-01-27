"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DieselPriceCard } from "@/components/DieselPriceCard";
import { VaultPerformance } from "@/components/VaultPerformance";
import { ActiveProposals } from "@/components/ActiveProposals";
import { BlockActivity } from "@/components/BlockActivity";

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />

      <main className="flex-1 py-8 px-4 w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto w-full">
          {/* Dashboard Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Price Card & Block Activity */}
            <div className="lg:col-span-1 min-w-0 space-y-6">
              <DieselPriceCard />
              <BlockActivity />
            </div>

            {/* Right Column - Proposals & Vaults */}
            <div className="lg:col-span-2 space-y-6 min-w-0">
              <ActiveProposals />
              <VaultPerformance />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

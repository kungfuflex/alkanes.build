import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DieselPriceCard } from "@/components/DieselPriceCard";
import { VaultPerformance } from "@/components/VaultPerformance";
import { ActiveProposals } from "@/components/ActiveProposals";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* DIESEL Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--sf-primary)] to-[var(--sf-primary-pressed)] flex items-center justify-center shadow-lg animate-pulse-glow">
                <span className="text-black font-bold text-4xl">D</span>
              </div>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-[color:var(--sf-text)]">
              DIESEL
            </h1>

            {/* Rainbow bar */}
            <div className="diesel-rainbow-bar-thick max-w-xs mx-auto mb-6" />

            <p className="text-xl text-[color:var(--sf-muted)] mb-8 max-w-2xl mx-auto">
              Governance, vaults, and documentation for the Alkanes metaprotocol on Bitcoin.
              Stake, vote, and shape the future of Bitcoin DeFi.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/governance" className="btn-primary">
                View Proposals
              </Link>
              <Link href="/docs" className="btn-secondary">
                Read the Docs
              </Link>
            </div>
          </div>
        </section>

        {/* Dashboard Grid */}
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Column - Price Card */}
              <div className="lg:col-span-1">
                <DieselPriceCard />
              </div>

              {/* Right Column - Vaults & Proposals */}
              <div className="lg:col-span-2 space-y-6">
                {/* Active Proposals - Featured prominently */}
                <ActiveProposals />

                {/* Vault Performance */}
                <VaultPerformance />
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links Section */}
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-[color:var(--sf-text)]">
              Explore DIESEL
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickLinkCard
                href="/governance"
                icon="🗳️"
                title="Governance"
                description="Vote on proposals and shape the protocol"
              />
              <QuickLinkCard
                href="/forum"
                icon="💬"
                title="Forum"
                description="Discuss proposals and ideas with the community"
              />
              <QuickLinkCard
                href="/docs"
                icon="📚"
                title="Documentation"
                description="Learn how to build with Alkanes"
              />
              <QuickLinkCard
                href="/docs/quickstart"
                icon="⚡"
                title="Quick Start"
                description="Deploy your first smart contract"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-[color:var(--sf-text)]">
              Why DIESEL?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard
                icon="🔒"
                title="Bitcoin Security"
                description="All state is anchored to Bitcoin. No sidechains, no bridges - just Bitcoin."
              />
              <FeatureCard
                icon="⚡"
                title="WASM Runtime"
                description="Write smart contracts in Rust, compile to WebAssembly, deploy to Bitcoin."
              />
              <FeatureCard
                icon="🗳️"
                title="Community Governed"
                description="DIESEL holders vote on protocol upgrades, treasury allocation, and more."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-8 text-center overflow-hidden relative">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--sf-boost-bg-from)] to-[var(--sf-boost-bg-to)] opacity-50" />

              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-4 text-[color:var(--sf-text)]">
                  Ready to participate?
                </h2>
                <p className="text-lg text-[color:var(--sf-muted)] mb-8">
                  Connect your wallet to vote on proposals and stake your DIESEL tokens.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link href="/governance" className="btn-primary">
                    View Active Proposals
                  </Link>
                  <a
                    href="https://github.com/kungfuflex/alkanes-rs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                  >
                    Explore on GitHub
                  </a>
                </div>
              </div>

              {/* Rainbow bar at bottom */}
              <div className="absolute bottom-0 left-0 right-0 diesel-rainbow-bar" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function QuickLinkCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="glass-card-hover p-6 group"
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-[color:var(--sf-text)] group-hover:text-[color:var(--sf-primary)] transition-colors mb-2">
        {title}
      </h3>
      <p className="text-sm text-[color:var(--sf-muted)]">{description}</p>
    </Link>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card p-6 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-[color:var(--sf-text)] mb-2">{title}</h3>
      <p className="text-[color:var(--sf-muted)]">{description}</p>
    </div>
  );
}

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-alkane rounded-lg" />
              <span className="font-bold text-xl">Alkanes</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/docs"
                className="text-slate-600 hover:text-alkane-600 dark:text-slate-300 dark:hover:text-alkane-400 transition-colors"
              >
                Documentation
              </Link>
              <Link
                href="/governance"
                className="text-slate-600 hover:text-alkane-600 dark:text-slate-300 dark:hover:text-alkane-400 transition-colors"
              >
                Governance
              </Link>
              <a
                href="https://github.com/kungfuflex/alkanes-rs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-alkane-600 dark:text-slate-300 dark:hover:text-alkane-400 transition-colors"
              >
                GitHub
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-alkane-600 to-alkane-400 bg-clip-text text-transparent">
              Smart Contracts on Bitcoin
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Alkanes is a metaprotocol built on Protorunes that brings
              programmable smart contracts to Bitcoin. Build DeFi, NFTs, and
              more - all secured by Bitcoin.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/docs"
                className="px-8 py-3 bg-gradient-alkane text-white font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-lg"
              >
                Read the Docs
              </Link>
              <Link
                href="/docs/quickstart"
                className="px-8 py-3 bg-white dark:bg-slate-800 text-alkane-600 dark:text-alkane-400 font-semibold rounded-lg border border-alkane-200 dark:border-alkane-800 hover:bg-alkane-50 dark:hover:bg-slate-700 transition-colors"
              >
                Quick Start
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Why Alkanes?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                title="Bitcoin Security"
                description="All state is anchored to Bitcoin. No sidechains, no bridges - just Bitcoin."
                icon="🔒"
              />
              <FeatureCard
                title="WASM Runtime"
                description="Write smart contracts in Rust, compile to WebAssembly, deploy to Bitcoin."
                icon="⚡"
              />
              <FeatureCard
                title="DIESEL Governance"
                description="Community-driven governance for protocol upgrades and treasury management."
                icon="🗳️"
              />
              <FeatureCard
                title="Subfrost API"
                description="Powerful indexing and querying infrastructure for alkane state."
                icon="🔍"
              />
              <FeatureCard
                title="CLI Tools"
                description="Deploy and interact with alkanes from the command line."
                icon="💻"
              />
              <FeatureCard
                title="Open Source"
                description="Fully open source. Build, contribute, and own the protocol."
                icon="🌐"
              />
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="py-16 px-4 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Get Started
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <QuickLinkCard
                href="/docs/quickstart"
                title="Build Your First Alkane"
                description="Step-by-step guide to creating and deploying your first smart contract on Bitcoin."
              />
              <QuickLinkCard
                href="/docs/cli"
                title="CLI Reference"
                description="Complete reference for the alkanes-cli tool including wallet management and deployment."
              />
              <QuickLinkCard
                href="/docs/api"
                title="Subfrost API"
                description="Query alkane state, balances, and transaction history via REST and JSON-RPC."
              />
              <QuickLinkCard
                href="/governance"
                title="DIESEL Governance"
                description="Participate in protocol governance by voting on proposals with your DIESEL tokens."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-alkane rounded" />
              <span className="font-semibold">Alkanes</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-600 dark:text-slate-400">
              <a href="https://github.com/kungfuflex/alkanes-rs" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a href="https://twitter.com/ptrk_btc" target="_blank" rel="noopener noreferrer">
                Twitter
              </a>
              <Link href="/docs">Docs</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="glass-card p-6">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}

function QuickLinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="glass-card p-6 hover:shadow-xl transition-all duration-200 group"
    >
      <h3 className="text-xl font-semibold mb-2 group-hover:text-alkane-600 dark:group-hover:text-alkane-400 transition-colors">
        {title} →
      </h3>
      <p className="text-slate-600 dark:text-slate-400">{description}</p>
    </Link>
  );
}

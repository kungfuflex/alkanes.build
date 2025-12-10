import Link from "next/link";

// Navigation structure
const navigation = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Quick Start", href: "/docs/quickstart" },
      { title: "Installation", href: "/docs/installation" },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      { title: "How Alkanes Work", href: "/docs/concepts/alkanes" },
      { title: "Protorunes", href: "/docs/concepts/protorunes" },
      { title: "DIESEL Token", href: "/docs/concepts/diesel" },
      { title: "Metashrew Indexer", href: "/docs/concepts/metashrew" },
    ],
  },
  {
    title: "CLI Reference",
    items: [
      { title: "Overview", href: "/docs/cli" },
      { title: "Wallet Commands", href: "/docs/cli/wallet" },
      { title: "Deploy Commands", href: "/docs/cli/deploy" },
      { title: "Execute Commands", href: "/docs/cli/execute" },
    ],
  },
  {
    title: "Subfrost API",
    items: [
      { title: "Overview", href: "/docs/api" },
      { title: "REST Endpoints", href: "/docs/api/rest" },
      { title: "JSON-RPC", href: "/docs/api/jsonrpc" },
      { title: "Alkanes Queries", href: "/docs/api/alkanes" },
    ],
  },
  {
    title: "Building Contracts",
    items: [
      { title: "Project Setup", href: "/docs/contracts/setup" },
      { title: "alkanes-std Library", href: "/docs/contracts/std" },
      { title: "Storage & State", href: "/docs/contracts/storage" },
      { title: "Testing", href: "/docs/contracts/testing" },
      { title: "Deployment", href: "/docs/contracts/deployment" },
    ],
  },
  {
    title: "Tutorials",
    items: [
      { title: "Wrap/Unwrap BTC", href: "/docs/tutorials/wrap-btc" },
      { title: "Build a Token", href: "/docs/tutorials/token" },
      { title: "Build an AMM", href: "/docs/tutorials/amm" },
    ],
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-alkane rounded-lg" />
                <span className="font-bold text-xl">Alkanes</span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link
                  href="/docs"
                  className="text-alkane-600 dark:text-alkane-400 font-medium"
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
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <nav className="sticky top-24 space-y-8">
              {navigation.map((section) => (
                <div key={section.title}>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="block py-1.5 px-3 rounded-lg text-slate-600 hover:text-alkane-600 hover:bg-alkane-50 dark:text-slate-400 dark:hover:text-alkane-400 dark:hover:bg-alkane-900/20 transition-colors"
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <article className="prose dark:prose-invert max-w-none">
              {children}
            </article>
          </main>
        </div>
      </div>
    </div>
  );
}

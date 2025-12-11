import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

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
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <nav className="sticky top-24 space-y-8">
              {navigation.map((section) => (
                <div key={section.title}>
                  <h3 className="font-semibold text-[color:var(--sf-text)] mb-2">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="block py-1.5 px-3 rounded-lg text-[color:var(--sf-muted)] hover:text-[color:var(--sf-primary)] hover:bg-[color:var(--sf-surface)] transition-colors"
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
            <article className="prose prose-invert max-w-none prose-headings:text-[color:var(--sf-text)] prose-p:text-[color:var(--sf-text)] prose-a:text-[color:var(--sf-primary)] prose-strong:text-[color:var(--sf-text)] prose-code:text-[color:var(--sf-primary)]">
              {children}
            </article>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}

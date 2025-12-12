"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("docs.nav");

  // Navigation structure with translation keys
  const navigation = [
    {
      titleKey: "gettingStarted.title",
      items: [
        { titleKey: "gettingStarted.introduction", href: "/docs" },
        { titleKey: "gettingStarted.quickStart", href: "/docs/quickstart" },
      ],
    },
    {
      titleKey: "coreConcepts.title",
      items: [
        { titleKey: "coreConcepts.alkanes", href: "/docs/concepts/alkanes" },
        { titleKey: "coreConcepts.protorunes", href: "/docs/concepts/protorunes" },
      ],
    },
    {
      titleKey: "cli.title",
      items: [
        { titleKey: "cli.overview", href: "/docs/cli" },
        { titleKey: "cli.installation", href: "/docs/cli/installation" },
        { titleKey: "cli.wallet", href: "/docs/cli/wallet" },
        { titleKey: "cli.alkanes", href: "/docs/cli/alkanes" },
        { titleKey: "cli.ord", href: "/docs/cli/ord" },
        { titleKey: "cli.esplora", href: "/docs/cli/esplora" },
        { titleKey: "cli.brc20prog", href: "/docs/cli/brc20-prog" },
        { titleKey: "cli.dataapi", href: "/docs/cli/dataapi" },
      ],
    },
    {
      titleKey: "jsonrpc.title",
      items: [
        { titleKey: "jsonrpc.overview", href: "/docs/jsonrpc/overview" },
        { titleKey: "jsonrpc.alkanes", href: "/docs/jsonrpc/alkanes" },
        { titleKey: "jsonrpc.bitcoind", href: "/docs/jsonrpc/bitcoind" },
        { titleKey: "jsonrpc.esplora", href: "/docs/jsonrpc/esplora" },
      ],
    },
    {
      titleKey: "api.title",
      items: [
        { titleKey: "api.overview", href: "/docs/api" },
        { titleKey: "api.rest", href: "/docs/rest" },
      ],
    },
    {
      titleKey: "integration.title",
      items: [
        { titleKey: "integration.tsSdk", href: "/docs/guides/ts-sdk" },
        { titleKey: "integration.alkanesWebSys", href: "/docs/integration/alkanes-web-sys" },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <nav className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4 space-y-8 pb-8">
              {navigation.map((section) => (
                <div key={section.titleKey}>
                  <h3 className="font-semibold text-[color:var(--sf-text)] mb-2">
                    {t(section.titleKey)}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="block py-1.5 px-3 rounded-lg text-[color:var(--sf-muted)] hover:text-[color:var(--sf-primary)] hover:bg-[color:var(--sf-surface)] transition-colors"
                        >
                          {t(item.titleKey)}
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

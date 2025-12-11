"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const t = useTranslations();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  return (
    <header className="glass sticky top-0 z-50">
      {/* Rainbow bar accent at top */}
      <div className="diesel-rainbow-bar" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--sf-primary)] to-[var(--sf-primary-pressed)] flex items-center justify-center shadow-lg group-hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-shadow">
              <span className="text-black font-bold text-lg">D</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl text-[color:var(--sf-text)]">DIESEL</span>
              <span className="text-[10px] text-[color:var(--sf-muted)] uppercase tracking-widest">Alkanes</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-[color:var(--sf-muted)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {t("navigation.dashboard")}
            </Link>
            <Link
              href="/governance"
              className="flex items-center gap-2 text-[color:var(--sf-muted)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t("navigation.governance")}
            </Link>
            <Link
              href="/forum"
              className="flex items-center gap-2 text-[color:var(--sf-muted)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              {t("navigation.forum")}
            </Link>
            <Link
              href="/docs"
              className="flex items-center gap-2 text-[color:var(--sf-muted)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {t("navigation.docs")}
            </Link>
            <a
              href="https://github.com/kungfuflex/alkanes-rs/tree/develop"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[color:var(--sf-muted)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              {t("navigation.github")}
            </a>
          </nav>

          {/* Right side: Language Switcher + Connect Wallet */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher />

            {isConnected ? (
              <button
                onClick={() => setIsConnected(false)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] hover:border-[color:var(--sf-primary)] transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-[color:var(--sf-text)]">bc1q...x7k4</span>
              </button>
            ) : (
              <button
                onClick={() => setIsConnected(true)}
                className="btn-primary hidden sm:block text-sm"
              >
                {t("wallet.connectWallet")}
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-[color:var(--sf-surface)] transition-colors"
            >
              <svg
                className="w-6 h-6 text-[color:var(--sf-text)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-[color:var(--sf-outline)]">
            <div className="flex flex-col gap-4">
              <Link
                href="/"
                className="flex items-center gap-3 text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {t("navigation.dashboard")}
              </Link>
              <Link
                href="/governance"
                className="flex items-center gap-3 text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t("navigation.governance")}
              </Link>
              <Link
                href="/forum"
                className="flex items-center gap-3 text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
                {t("navigation.forum")}
              </Link>
              <Link
                href="/docs"
                className="flex items-center gap-3 text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {t("navigation.docs")}
              </Link>
              <a
                href="https://github.com/kungfuflex/alkanes-rs/tree/develop"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                {t("navigation.github")}
              </a>
              {!isConnected && (
                <button
                  onClick={() => {
                    setIsConnected(true);
                    setIsMenuOpen(false);
                  }}
                  className="btn-primary text-sm w-full mt-2"
                >
                  {t("wallet.connectWallet")}
                </button>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

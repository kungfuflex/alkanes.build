"use client";

import Link from "next/link";
import { useState } from "react";

export function Header() {
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
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-[color:var(--sf-muted)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/governance"
              className="text-[color:var(--sf-muted)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
            >
              Governance
            </Link>
            <Link
              href="/forum"
              className="text-[color:var(--sf-muted)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
            >
              Forum
            </Link>
            <Link
              href="/docs"
              className="text-[color:var(--sf-muted)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
            >
              Docs
            </Link>
            <a
              href="https://github.com/kungfuflex/alkanes-rs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--sf-muted)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
            >
              GitHub
            </a>
          </nav>

          {/* Connect Wallet Button */}
          <div className="flex items-center gap-4">
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
                Connect Wallet
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
                className="text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/governance"
                className="text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Governance
              </Link>
              <Link
                href="/forum"
                className="text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Forum
              </Link>
              <Link
                href="/docs"
                className="text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Docs
              </Link>
              <a
                href="https://github.com/kungfuflex/alkanes-rs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
              >
                GitHub
              </a>
              {!isConnected && (
                <button
                  onClick={() => {
                    setIsConnected(true);
                    setIsMenuOpen(false);
                  }}
                  className="btn-primary text-sm w-full mt-2"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

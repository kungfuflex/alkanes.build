"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useWallet } from "@/context/WalletContext";
import AddressAvatar from "./AddressAvatar";
import ConnectWalletModal from "./ConnectWalletModal";
import { ShaderLogo } from "./ShaderLogo";

export function Header() {
  const t = useTranslations();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    isConnected,
    address,
    onConnectModalOpenChange,
    disconnect,
  } = useWallet();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  const handleDisconnect = () => {
    disconnect();
    setIsDropdownOpen(false);
  };

  return (
    <>
      <header className="header-fade sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-24">
            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <div className="hidden md:block">
                <ShaderLogo size={156} className="rounded-lg" />
              </div>
              <div className="md:hidden">
                <ShaderLogo size={64} className="rounded-lg" />
              </div>
              <div className="flex flex-col -ml-4 md:-ml-12">
                <span className="font-bold text-lg md:text-xl text-[color:var(--sf-text)]">ALKANES</span>
                <span className="inline-block px-1 md:px-1.5 py-0.5 border border-[color:var(--sf-outline)] text-[color:var(--sf-muted)] text-[8px] md:text-[10px] uppercase tracking-widest font-medium rounded text-center">
                  Protocol
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className="text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] transition-colors font-medium"
              >
                {t("navigation.dashboard")}
              </Link>
              <Link
                href="/governance"
                className="text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] transition-colors font-medium"
              >
                {t("navigation.governance")}
              </Link>
              <Link
                href="/forum"
                className="text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] transition-colors font-medium"
              >
                {t("navigation.forum")}
              </Link>
              <Link
                href="/docs"
                className="text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] transition-colors font-medium"
              >
                {t("navigation.docs")}
              </Link>
              <a
                href="https://github.com/kungfuflex/alkanes-rs/tree/develop"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] transition-colors font-medium"
              >
                {t("navigation.github")}
              </a>
            </nav>

            {/* Right side: Language Switcher + Connect Wallet */}
            <div className="flex items-center gap-4">
              <LanguageSwitcher />

              {isConnected ? (
                <div className="relative hidden sm:block" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] hover:border-[color:var(--sf-primary)] transition-colors"
                  >
                    <AddressAvatar address={address} size={24} />
                    <span className="text-sm font-medium text-[color:var(--sf-text)]">{truncatedAddress}</span>
                    <svg
                      className={`w-4 h-4 text-[color:var(--sf-muted)] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[color:var(--sf-outline)] bg-[color:var(--sf-surface)] shadow-lg overflow-hidden z-50">
                      <Link
                        href="/wallet"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-[color:var(--sf-text)] hover:bg-[color:var(--sf-primary)]/10 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Wallet Dashboard
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-[color:var(--sf-text)] hover:bg-[color:var(--sf-primary)]/10 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Forum Profile
                      </Link>
                      <div className="border-t border-[color:var(--sf-outline)]" />
                      <button
                        onClick={handleDisconnect}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Disconnect
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => onConnectModalOpenChange(true)}
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
                  className="text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("navigation.dashboard")}
                </Link>
                <Link
                  href="/governance"
                  className="text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("navigation.governance")}
                </Link>
                <Link
                  href="/forum"
                  className="text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("navigation.forum")}
                </Link>
                <Link
                  href="/docs"
                  className="text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("navigation.docs")}
                </Link>
                <a
                  href="https://github.com/kungfuflex/alkanes-rs/tree/develop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium"
                >
                  {t("navigation.github")}
                </a>

                {/* Mobile wallet section */}
                {isConnected ? (
                  <div className="border-t border-[color:var(--sf-outline)] pt-4 mt-2">
                    <div className="flex items-center gap-3 mb-3">
                      <AddressAvatar address={address} size={32} />
                      <span className="text-sm font-medium text-[color:var(--sf-text)]">{truncatedAddress}</span>
                    </div>
                    <Link
                      href="/wallet"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 text-[color:var(--sf-text)] hover:text-[color:var(--sf-primary)] transition-colors font-medium mb-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Wallet Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        handleDisconnect();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-3 text-red-500 hover:text-red-400 transition-colors font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      onConnectModalOpenChange(true);
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

      {/* Connect Wallet Modal */}
      <ConnectWalletModal />
    </>
  );
}

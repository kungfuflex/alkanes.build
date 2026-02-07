"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useWallet } from "@/context/WalletContext";
import AddressAvatar from "./AddressAvatar";
import ConnectWalletModal from "./ConnectWalletModal";
import AccountSidebar from "./AccountSidebar";
import { ShaderLogo } from "./ShaderLogo";

export function Header() {
  const t = useTranslations();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarClosing, setIsSidebarClosing] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const {
    isConnected,
    address,
    onConnectModalOpenChange,
    disconnect,
  } = useWallet();

  const handleOpenSidebar = useCallback(() => {
    setIsSidebarVisible(true);
    setIsSidebarClosing(false);
    setIsSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarClosing(true);
    setTimeout(() => {
      setIsSidebarOpen(false);
      setIsSidebarVisible(false);
      setIsSidebarClosing(false);
    }, 250);
  }, []);

  // Close sidebar on escape key
  useEffect(() => {
    if (!isSidebarOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") handleCloseSidebar();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isSidebarOpen, handleCloseSidebar]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (isSidebarVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isSidebarVisible]);

  const truncatedAddress = address
    ? `${address.slice(0, 4)}···${address.slice(-4)}`
    : "";

  const handleDisconnect = () => {
    disconnect();
    handleCloseSidebar();
  };

  return (
    <>
      <header className="header-fade sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 md:h-24">
            {/* Logo */}
            <Link href="/" className="flex items-center group md:-ml-10">
              <div className="hidden md:block">
                <ShaderLogo size={156} className="rounded-lg" />
              </div>
              <div className="flex flex-col md:-ml-12">
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
            <div className="flex items-center gap-2 sm:gap-4">
              <LanguageSwitcher />

              {isConnected ? (
                <>
                  {/* Desktop: avatar + address */}
                  <button
                    onClick={handleOpenSidebar}
                    className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full liquid-glass transition-all duration-200"
                  >
                    <AddressAvatar address={address} size={24} />
                    <span className="text-sm font-medium text-[color:var(--sf-text)]">{truncatedAddress}</span>
                  </button>
                  {/* Mobile: compact avatar */}
                  <button
                    onClick={handleOpenSidebar}
                    className="sm:hidden flex items-center justify-center w-9 h-9 rounded-full liquid-glass transition-all duration-200"
                  >
                    <AddressAvatar address={address} size={22} />
                  </button>
                </>
              ) : (
                <>
                  {/* Desktop */}
                  <button
                    onClick={() => onConnectModalOpenChange(true)}
                    className="btn-primary hidden sm:block text-[13px] !px-5 !py-2.5 !rounded-xl"
                  >
                    {t("wallet.connectWallet")}
                  </button>
                  {/* Mobile */}
                  <button
                    onClick={() => onConnectModalOpenChange(true)}
                    className="btn-primary sm:hidden text-[13px] !px-3.5 !py-2 !rounded-xl"
                  >
                    Connect
                  </button>
                </>
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

      {/* Wallet Sidebar */}
      <AccountSidebar
        isVisible={isSidebarVisible}
        isClosing={isSidebarClosing}
        onClose={handleCloseSidebar}
        onDisconnect={handleDisconnect}
      />

      {/* Connect Wallet Modal */}
      <ConnectWalletModal />
    </>
  );
}

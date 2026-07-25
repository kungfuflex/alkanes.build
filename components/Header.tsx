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
                <span className="flex justify-between text-[color:var(--sf-muted)] text-[8px] md:text-[10px] uppercase font-medium">
                  {"Protocol".split("").map((ch, i) => <span key={i}>{ch}</span>)}
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
              <Link
                href="/aries"
                className="text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] transition-colors font-medium"
              >
                {t("navigation.aries")}
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

            </div>
          </div>

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

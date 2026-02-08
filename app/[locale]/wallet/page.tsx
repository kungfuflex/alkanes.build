"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Copy, Check, Download, Cloud, AlertTriangle, Shield, ExternalLink, RefreshCw } from "lucide-react";

import { useWallet } from "@/context/WalletContext";
import AddressAvatar from "@/components/AddressAvatar";
import { GoogleDriveBackup, type WalletBackupInfo } from "@alkanes/ts-sdk";
import { useMergedWalletBalances, formatBalance, formatBtcBalance } from "@/hooks/useWalletBalances";
import { BtcIcon, BtcSkeletonIcon, AlkaneSkeletonIcon } from "@/components/SkeletonIcons";
import { useBtcPrice, useDieselUsdPrice, formatUsd } from "@/hooks/usePriceData";

export default function WalletDashboardPage() {
  const t = useTranslations();
  const router = useRouter();
  const {
    isConnected,
    address,
    paymentAddress,
    publicKey,
    network,
    wallet,
    browserWallet,
    disconnect,
    onConnectModalOpenChange,
    hasStoredKeystore,
  } = useWallet();

  const [copied, setCopied] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [existingBackups, setExistingBackups] = useState<WalletBackupInfo[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [driveBackup] = useState(() => new GoogleDriveBackup());
  const [driveConfigured, setDriveConfigured] = useState(false);

  // Check if Google Drive is configured
  useEffect(() => {
    setDriveConfigured(driveBackup.isConfigured());
  }, [driveBackup]);

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      onConnectModalOpenChange(true);
    }
  }, [isConnected, onConnectModalOpenChange]);

  // Fetch wallet balances (merged from primary + payment addresses)
  const { data: btcPrice, isLoading: btcPriceLoading } = useBtcPrice();
  const { priceUsd: dieselPriceUsd } = useDieselUsdPrice();
  const { data: mergedBalances, isFetching: isBalancesFetching, refetch: handleRefetchBalances } = useMergedWalletBalances(address, paymentAddress);

  // Show skeleton until both balance data and BTC price are ready
  const balancesReady = !!mergedBalances && !btcPriceLoading;

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleExportKeystore = () => {
    if (typeof window === "undefined") return;

    const keystore = localStorage.getItem("alkanes_encrypted_keystore");
    if (!keystore) {
      alert("No keystore found to export");
      return;
    }

    setIsExporting(true);

    try {
      const blob = new Blob([keystore], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `alkanes-wallet-${address?.slice(0, 8) || "backup"}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackupToDrive = async () => {
    if (!driveConfigured) {
      setBackupError("Google Drive is not configured");
      return;
    }

    const keystore = localStorage.getItem("alkanes_encrypted_keystore");
    if (!keystore) {
      setBackupError("No keystore found to backup");
      return;
    }

    setIsBackingUp(true);
    setBackupError(null);
    setBackupSuccess(false);

    try {
      await driveBackup.initialize();
      await driveBackup.backupWallet(
        keystore,
        `Wallet ${address?.slice(0, 8) || "backup"}`,
        undefined
      );
      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 3000);
    } catch (err) {
      console.error("Backup error:", err);
      setBackupError(err instanceof Error ? err.message : "Failed to backup to Google Drive");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleLoadBackups = async () => {
    if (!driveConfigured) return;

    setLoadingBackups(true);
    try {
      await driveBackup.initialize();
      const backups = await driveBackup.listWallets();
      setExistingBackups(backups);
    } catch (err) {
      console.error("Failed to load backups:", err);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleDeleteBackup = async (folderId: string) => {
    if (!confirm("Are you sure you want to delete this backup?")) return;

    try {
      await driveBackup.deleteWallet(folderId);
      setExistingBackups((prev) => prev.filter((b) => b.folderId !== folderId));
    } catch (err) {
      console.error("Failed to delete backup:", err);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    router.push("/");
  };

  if (!isConnected) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[color:var(--sf-muted)] mb-4">Please connect your wallet to continue</p>
          <button
            onClick={() => onConnectModalOpenChange(true)}
            className="btn-primary"
          >
            Connect Wallet
          </button>
        </div>
      </main>
    );
  }

  const isKeystoreWallet = !!wallet && !browserWallet;
  const isBrowserWallet = !!browserWallet;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 w-full">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--sf-text)]">Wallet</h1>
            <p className="text-sm text-[color:var(--sf-muted)]">
              Manage your wallet, addresses, and backups
            </p>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
          >
            Disconnect
          </button>
        </div>

        {/* Wallet Identity */}
        <div className="glass-card overflow-hidden mb-6" style={{ background: "#101010" }}>
          <div className="bg-[color:var(--sf-surface)] px-5 py-5">
            <div className="flex items-center gap-4">
              <AddressAvatar address={address} size={48} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-[color:var(--sf-text)]">
                    {isBrowserWallet ? (browserWallet?.info?.name || "Browser Wallet") : "Keystore Wallet"}
                  </span>
                  {isBrowserWallet && browserWallet?.info?.icon && (
                    <img src={browserWallet.info.icon} alt="" className="w-5 h-5" />
                  )}
                  {isKeystoreWallet && (
                    <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-medium flex items-center gap-1">
                      <Shield size={10} /> Local
                    </span>
                  )}
                </div>
                <span className="text-[13px] text-[color:var(--sf-muted)] capitalize">{network}</span>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="divide-y divide-[color:var(--sf-outline)]">
            <div className="px-5 py-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-[color:var(--sf-muted)] uppercase tracking-wider mb-1">
                  {isKeystoreWallet ? "Taproot (Ordinals)" : "Address"}
                </div>
                <div className="font-mono text-xs text-[color:var(--sf-text)] break-all">{address}</div>
              </div>
              <button
                onClick={() => copyToClipboard(address, "address")}
                className="p-1.5 rounded-md text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] hover:bg-white/[0.04] transition-colors flex-shrink-0"
              >
                {copied === "address" ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>

            {isKeystoreWallet && paymentAddress && paymentAddress !== address && (
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-[color:var(--sf-muted)] uppercase tracking-wider mb-1">Payment (SegWit)</div>
                  <div className="font-mono text-xs text-[color:var(--sf-text)] break-all">{paymentAddress}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(paymentAddress, "payment")}
                  className="p-1.5 rounded-md text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] hover:bg-white/[0.04] transition-colors flex-shrink-0"
                >
                  {copied === "payment" ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
            )}

            {publicKey && (
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-[color:var(--sf-muted)] uppercase tracking-wider mb-1">Public Key</div>
                  <div className="font-mono text-[11px] text-[color:var(--sf-text)] break-all">{publicKey}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(publicKey, "pubkey")}
                  className="p-1.5 rounded-md text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] hover:bg-white/[0.04] transition-colors flex-shrink-0"
                >
                  {copied === "pubkey" ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Balances */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-lg font-bold text-[color:var(--sf-text)]">Balances</h3>
            <button
              onClick={handleRefetchBalances}
              disabled={isBalancesFetching}
              className="p-1 rounded-md text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] hover:bg-white/[0.04] transition-colors disabled:opacity-40"
              title="Refresh balances"
            >
              <RefreshCw size={14} className={isBalancesFetching ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="glass-card overflow-hidden" style={{ background: "#101010" }}>
            <div className="rounded-b-3xl overflow-hidden bg-[color:var(--sf-surface)]">
              {balancesReady ? (
                <div className="divide-y divide-[color:var(--sf-outline)]">
                  {/* BTC */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 flex-shrink-0"><BtcIcon /></div>
                      <div>
                        <div className="text-[15px] font-medium text-[color:var(--sf-text)]">Bitcoin</div>
                        <div className="text-[11px] text-[color:var(--sf-muted)]">BTC</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[15px] font-semibold text-[color:var(--sf-text)] font-mono tabular-nums">
                        {formatBtcBalance(mergedBalances.btcBalance)}
                      </div>
                      {mergedBalances.btcBalance > 0 && btcPrice && (
                        <div className="text-[11px] text-[color:var(--sf-muted)] font-mono tabular-nums">
                          {formatUsd((mergedBalances.btcBalance / 1e8) * btcPrice.usd)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tokens */}
                  {mergedBalances.tokens.map((token) => (
                    <div key={token.runeId} className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        {token.runeId === '2:0' ? (
                          <Image
                            src="/images/diesel-logo.png"
                            alt="DIESEL"
                            width={36}
                            height={36}
                            className="rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            token.runeId === '32:0' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                            token.runeId === '2:56801' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                            token.runeId.includes('LP') || token.symbol.includes('LP') ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                            'bg-gradient-to-br from-gray-500 to-gray-600'
                          }`}>
                            <span className="text-white font-bold text-xs">
                              {token.symbol.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="text-[15px] font-medium text-[color:var(--sf-text)]">{token.name}</div>
                          <div className="text-[11px] text-[color:var(--sf-muted)]">{token.symbol}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[15px] font-semibold text-[color:var(--sf-text)] font-mono tabular-nums">
                          {formatBalance(token.balanceFormatted)}
                        </div>
                        {token.runeId === "2:0" && dieselPriceUsd ? (
                          <div className="text-[11px] text-[color:var(--sf-muted)] font-mono tabular-nums">
                            {formatUsd(token.balanceFormatted * dieselPriceUsd)}
                          </div>
                        ) : (
                          <div className="text-[11px] text-[color:var(--sf-muted)] font-mono tabular-nums">
                            {token.runeId}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-[color:var(--sf-outline)]">
                  {/* BTC skeleton */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 flex-shrink-0"><BtcSkeletonIcon /></div>
                      <div className="animate-pulse">
                        <div className="h-3.5 w-16 bg-[color:var(--sf-outline)] rounded mb-1.5" />
                        <div className="h-2.5 w-10 bg-[color:var(--sf-outline)] rounded" />
                      </div>
                    </div>
                    <div className="h-3.5 w-20 bg-[color:var(--sf-outline)] rounded animate-pulse" />
                  </div>
                  {/* Token skeletons */}
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 flex-shrink-0"><AlkaneSkeletonIcon /></div>
                        <div className="animate-pulse">
                          <div className="h-3.5 w-16 bg-[color:var(--sf-outline)] rounded mb-1.5" />
                          <div className="h-2.5 w-10 bg-[color:var(--sf-outline)] rounded" />
                        </div>
                      </div>
                      <div className="h-3.5 w-20 bg-[color:var(--sf-outline)] rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Backup & Security (keystore only) */}
        {isKeystoreWallet && hasStoredKeystore && (
          <div className="mb-6">
            <div className="mb-3 px-1">
              <h3 className="text-lg font-bold text-[color:var(--sf-text)]">Backup & Security</h3>
            </div>

            <div className="glass-card overflow-hidden" style={{ background: "#101010" }}>
              <div className="bg-[color:var(--sf-surface)]">
                {/* Warning */}
                <div className="flex items-start gap-3 px-5 py-4 border-b border-[color:var(--sf-outline)]">
                  <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-[13px] text-yellow-400/80">
                    Always maintain a backup of your recovery phrase or encrypted keystore.
                    Never share your recovery phrase with anyone.
                  </div>
                </div>

                {/* Backup Options */}
                <div className="divide-y divide-[color:var(--sf-outline)]">
                  <button
                    onClick={handleExportKeystore}
                    disabled={isExporting}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Download size={16} className="text-blue-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-[15px] font-medium text-[color:var(--sf-text)]">
                        {isExporting ? "Exporting..." : "Export Keystore"}
                      </div>
                      <div className="text-[11px] text-[color:var(--sf-muted)]">Download encrypted JSON file</div>
                    </div>
                  </button>

                  {driveConfigured && (
                    <button
                      onClick={handleBackupToDrive}
                      disabled={isBackingUp}
                      className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <Cloud size={16} className="text-green-400" />
                      </div>
                      <div className="text-left">
                        <div className="text-[15px] font-medium text-[color:var(--sf-text)]">
                          {isBackingUp ? "Backing up..." : "Backup to Drive"}
                        </div>
                        <div className="text-[11px] text-[color:var(--sf-muted)]">Secure cloud backup</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {(backupError || backupSuccess) && (
                <div className="px-5 py-3">
                  {backupError && (
                    <p className="text-[13px] text-red-400">{backupError}</p>
                  )}
                  {backupSuccess && (
                    <p className="text-[13px] text-green-400">Wallet backed up successfully!</p>
                  )}
                </div>
              )}

              {/* Existing Backups */}
              {driveConfigured && (
                <div className="px-5 py-3 border-t border-[color:var(--sf-outline)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[color:var(--sf-muted)]">Google Drive Backups</span>
                    <button
                      onClick={handleLoadBackups}
                      disabled={loadingBackups}
                      className="text-xs text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] transition-colors disabled:opacity-50"
                    >
                      {loadingBackups ? "Loading..." : "Refresh"}
                    </button>
                  </div>

                  {existingBackups.length > 0 ? (
                    <div className="divide-y divide-[color:var(--sf-outline)]">
                      {existingBackups.map((backup) => (
                        <div key={backup.folderId} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Cloud size={14} className="text-blue-400" />
                            <div>
                              <div className="text-[13px] text-[color:var(--sf-text)]">{backup.walletLabel}</div>
                              <div className="text-[11px] text-[color:var(--sf-muted)]">{new Date(backup.timestamp).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={backup.folderUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)]">
                              <ExternalLink size={12} />
                            </a>
                            <button onClick={() => handleDeleteBackup(backup.folderId)} className="text-[11px] text-red-400/70 hover:text-red-400">
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[color:var(--sf-muted)] text-center py-2">Click refresh to load existing backups</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Browser Wallet Info */}
        {isBrowserWallet && (
          <div className="mb-6">
            <div className="mb-3 px-1">
              <h3 className="text-lg font-bold text-[color:var(--sf-text)]">Wallet Info</h3>
            </div>
            <div className="glass-card overflow-hidden" style={{ background: "#101010" }}>
              <div className="bg-[color:var(--sf-surface)] px-5 py-5">
                <p className="text-[13px] text-[color:var(--sf-muted)]">
                  Connected via <span className="text-[color:var(--sf-text)] font-medium">{browserWallet?.info?.name || "Browser Wallet"}</span> extension.
                  Your keys are managed by the wallet.
                </p>
                {browserWallet?.info?.website && (
                  <a
                    href={browserWallet.info.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[13px] text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] transition-colors"
                  >
                    {browserWallet.info.name || "Wallet"} <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
    </main>
  );
}

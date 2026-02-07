"use client";

import { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, RefreshCw, ChevronRight } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { useWalletBalances, formatBalance, formatBtcBalance } from "@/hooks/useWalletBalances";
import AddressAvatar from "./AddressAvatar";

interface AccountSidebarProps {
  isVisible: boolean;
  isClosing: boolean;
  onClose: () => void;
  onDisconnect: () => void;
}

interface UserProfile {
  id: string;
  address: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  verified: boolean;
  postsCount: number;
  discussionsCount: number;
  likesReceived: number;
  trustLevel: number;
  createdAt: string;
  lastSeenAt: string | null;
}

export default function AccountSidebar({ isVisible, isClosing, onClose, onDisconnect }: AccountSidebarProps) {
  const { address, paymentAddress, wallet, browserWallet } = useWallet();
  const [copied, setCopied] = useState(false);

  const isKeystoreWallet = !!wallet && !browserWallet;

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-6)}`
    : "";

  // Balances
  const { data: balances, isLoading: balancesLoading, refetch: refetchBalances } = useWalletBalances(address);
  const { data: paymentBalances, isLoading: paymentLoading, refetch: refetchPayment } = useWalletBalances(
    paymentAddress !== address ? paymentAddress : undefined
  );

  const merged = useMemo(() => {
    if (!balances && !paymentBalances) return null;
    const primary = balances || { btcBalance: 0, btcBalanceFormatted: "0", tokens: [], address: "", timestamp: 0 };
    const payment = paymentBalances;
    if (!payment) return primary;

    const totalBtc = primary.btcBalance + payment.btcBalance;
    const tokenMap = new Map<string, (typeof primary.tokens)[0]>();
    for (const token of primary.tokens) tokenMap.set(token.runeId, token);
    for (const token of payment.tokens) {
      const existing = tokenMap.get(token.runeId);
      if (existing) {
        const combined = BigInt(existing.balance) + BigInt(token.balance);
        tokenMap.set(token.runeId, {
          ...existing,
          balance: combined.toString(),
          balanceFormatted: Number(combined) / Math.pow(10, existing.decimals),
        });
      } else {
        tokenMap.set(token.runeId, token);
      }
    }

    return {
      btcBalance: totalBtc,
      btcBalanceFormatted: (totalBtc / 100000000).toFixed(8),
      tokens: Array.from(tokenMap.values()),
      address: primary.address,
      timestamp: Date.now(),
    };
  }, [balances, paymentBalances]);

  const isBalancesLoading = balancesLoading || paymentLoading;

  // Profile
  const { data: profile } = useQuery<UserProfile | null>({
    queryKey: ["profile", address],
    queryFn: async () => {
      if (!address) return null;
      const res = await fetch(`/api/profile?address=${address}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.id) return null;
      return data;
    },
    enabled: !!address,
    staleTime: 60000,
  });

  const handleCopy = useCallback(async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  const handleRefresh = useCallback(() => {
    refetchBalances();
    if (paymentAddress !== address) refetchPayment();
  }, [refetchBalances, refetchPayment, paymentAddress, address]);

  const displayName = profile?.displayName || truncatedAddress;
  const walletLabel = browserWallet?.info?.name || (isKeystoreWallet ? "Keystore" : "Wallet");

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/15 ${
          isClosing ? "animate-[fadeOut_250ms_ease-in_forwards]" : "animate-[fadeIn_200ms_ease-out]"
        }`}
        onClick={onClose}
      />

      {/* Panel — mobile: fullscreen from bottom, desktop: right sidebar */}
      <div
        className={`fixed z-50 flex flex-col shadow-2xl
          inset-0 sm:inset-auto sm:top-0 sm:right-0 sm:h-full sm:w-[380px] sm:border-l sm:border-white/[0.04]
          ${isClosing
            ? "animate-[slideOutDown_250ms_cubic-bezier(0.4,0,1,1)_forwards] sm:animate-[slideOutRight_250ms_cubic-bezier(0.4,0,1,1)_forwards]"
            : "animate-[slideInUp_300ms_cubic-bezier(0,0,0.2,1)] sm:animate-[slideInRight_300ms_cubic-bezier(0,0,0.2,1)]"
          }`}
        style={{ background: "#111111" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--sf-muted)]">
            Account
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[color:var(--sf-muted)] transition-colors hover:bg-white/[0.06] hover:text-[color:var(--sf-text)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Identity Card */}
        <div className="mx-4 mb-4 rounded-2xl bg-[color:var(--sf-surface)] border border-[color:var(--sf-glass-border)] p-4">
          <div className="flex items-center gap-3 mb-3">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                className="w-11 h-11 rounded-full object-cover ring-2 ring-white/[0.06]"
              />
            ) : (
              <AddressAvatar address={address} size={44} className="ring-2 ring-white/[0.06]" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-[color:var(--sf-text)] truncate">
                {displayName}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[color:var(--sf-muted)]">{walletLabel}</span>
                {profile?.verified && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400">
                    <Check size={10} /> Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Address with copy */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-black/30 border border-white/[0.04] hover:border-white/[0.08] transition-colors group"
          >
            <span className="flex-1 text-left font-mono text-xs text-[color:var(--sf-muted)] truncate">
              {address}
            </span>
            {copied ? (
              <Check size={13} className="text-green-400 flex-shrink-0" />
            ) : (
              <Copy size={13} className="text-[color:var(--sf-muted)] group-hover:text-[color:var(--sf-text)] flex-shrink-0 transition-colors" />
            )}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {/* Balances */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--sf-muted)]">
                Balances
              </span>
              <button
                onClick={handleRefresh}
                disabled={isBalancesLoading}
                className="p-1 rounded-md text-[color:var(--sf-muted)] hover:text-[color:var(--sf-text)] hover:bg-white/[0.04] transition-colors disabled:opacity-40"
                title="Refresh balances"
              >
                <RefreshCw size={12} className={isBalancesLoading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="rounded-2xl bg-[color:var(--sf-surface)] border border-[color:var(--sf-glass-border)] overflow-hidden">
              {isBalancesLoading && !merged ? (
                <div className="p-4 space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/[0.04] animate-pulse" />
                        <div className="h-3 w-16 bg-white/[0.04] rounded animate-pulse" />
                      </div>
                      <div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : merged ? (
                <div className="divide-y divide-white/[0.04]">
                  {/* BTC */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">₿</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[color:var(--sf-text)]">Bitcoin</div>
                        <div className="text-[10px] text-[color:var(--sf-muted)]">BTC</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-[color:var(--sf-text)] font-mono tabular-nums">
                        {formatBtcBalance(merged.btcBalance)}
                      </div>
                      {merged.btcBalance > 0 && (
                        <div className="text-[10px] text-[color:var(--sf-muted)] font-mono tabular-nums">
                          {merged.btcBalance.toLocaleString()} sats
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tokens */}
                  {merged.tokens.map((token) => (
                    <div key={token.runeId} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        {token.runeId === "2:0" ? (
                          <Image
                            src="/images/diesel-logo.png"
                            alt="DIESEL"
                            width={32}
                            height={32}
                            className="rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              token.runeId === "32:0"
                                ? "bg-gradient-to-br from-blue-500 to-blue-600"
                                : "bg-gradient-to-br from-gray-500 to-gray-600"
                            }`}
                          >
                            <span className="text-white font-bold text-xs">
                              {token.symbol.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-[color:var(--sf-text)]">{token.name}</div>
                          <div className="text-[10px] text-[color:var(--sf-muted)]">{token.symbol}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-[color:var(--sf-text)] font-mono tabular-nums">
                          {formatBalance(token.balanceFormatted)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {merged.tokens.length === 0 && (
                    <div className="px-4 py-3 text-xs text-center text-[color:var(--sf-muted)]">
                      No alkane tokens
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-4 text-xs text-center text-[color:var(--sf-muted)]">
                  Unable to load balances
                </div>
              )}
            </div>
          </div>

          {/* Forum Activity */}
          {profile && (profile.postsCount > 0 || profile.discussionsCount > 0 || profile.likesReceived > 0) && (
            <div>
              <div className="mb-2 px-1">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--sf-muted)]">
                  Forum Activity
                </span>
              </div>
              <div className="rounded-2xl bg-[color:var(--sf-surface)] border border-[color:var(--sf-glass-border)] p-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center py-2 rounded-xl bg-black/20">
                    <div className="text-lg font-bold text-[color:var(--sf-text)] tabular-nums">
                      {profile.postsCount}
                    </div>
                    <div className="text-[10px] text-[color:var(--sf-muted)] uppercase tracking-wider">Posts</div>
                  </div>
                  <div className="text-center py-2 rounded-xl bg-black/20">
                    <div className="text-lg font-bold text-[color:var(--sf-text)] tabular-nums">
                      {profile.discussionsCount}
                    </div>
                    <div className="text-[10px] text-[color:var(--sf-muted)] uppercase tracking-wider">Topics</div>
                  </div>
                  <div className="text-center py-2 rounded-xl bg-black/20">
                    <div className="text-lg font-bold text-[color:var(--sf-text)] tabular-nums">
                      {profile.likesReceived}
                    </div>
                    <div className="text-[10px] text-[color:var(--sf-muted)] uppercase tracking-wider">Likes</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div>
            <div className="mb-2 px-1">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--sf-muted)]">
                Manage
              </span>
            </div>
            <div className="rounded-2xl bg-[color:var(--sf-surface)] border border-[color:var(--sf-glass-border)] overflow-hidden divide-y divide-white/[0.04]">
              <Link
                href="/wallet"
                onClick={onClose}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[color:var(--sf-text)]">Wallet Dashboard</div>
                    <div className="text-[10px] text-[color:var(--sf-muted)]">Addresses, backups & security</div>
                  </div>
                </div>
                <ChevronRight size={14} className="text-[color:var(--sf-muted)]" />
              </Link>
              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[color:var(--sf-text)]">Profile</div>
                    <div className="text-[10px] text-[color:var(--sf-muted)]">Display name, avatar & bio</div>
                  </div>
                </div>
                <ChevronRight size={14} className="text-[color:var(--sf-muted)]" />
              </Link>
              <Link
                href="/governance"
                onClick={onClose}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[color:var(--sf-text)]">Governance</div>
                    <div className="text-[10px] text-[color:var(--sf-muted)]">Proposals & voting</div>
                  </div>
                </div>
                <ChevronRight size={14} className="text-[color:var(--sf-muted)]" />
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-5 pt-3">
          <button
            onClick={onDisconnect}
            className="w-full py-2.5 rounded-xl text-[13px] font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    </>
  );
}

"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { formatBtcBalance } from "@/hooks/useWalletBalances";
import { BtcSkeletonIcon, AlkaneSkeletonIcon } from "@/components/SkeletonIcons";
import type { UtxoInput, SwapQuote } from './types';
import { SPLIT_TX_BASE_VSIZE, P2TR_OUTPUT_VSIZE, DIESEL_OPRETURN_VSIZE, P2TR_DUST_LIMIT, MAX_SPLIT_OUTPUTS, MAX_CHAIN_LENGTH } from './constants';

interface TerminalWalletSidebarProps {
  isVisible: boolean;
  isClosing: boolean;
  onClose: () => void;
  // Wallet state
  isConnected: boolean;
  address: string | null;
  wallet: any;
  hasKeystore: boolean;
  balances: any;
  // Actions
  onUnlock: (password: string) => Promise<void>;
  onRestore: (mnemonic: string, password: string) => Promise<void>;
  onCreate: (password: string) => Promise<string>;
  onDisconnect: () => void;
  unlockWallet: (password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  // Split UTXO
  availableUtxos: UtxoInput[];
  loadingUtxos: boolean;
  currentFeeRate: number;
  onSplitUtxo: (utxo: UtxoInput, outputs: number[], feeRate: number) => Promise<string>;
  onRefreshUtxos: () => void;
  // Swap calculator
  onGetSwapQuote: (tokenIn: string, tokenOut: string, amountIn: string) => Promise<SwapQuote | null>;
  dieselBalance: number;
  frbtcBalance: number;
}

type ConnectView = 'main' | 'unlock' | 'restore' | 'create' | 'showMnemonic';
type SplitMode = 'equal' | 'custom';

export function TerminalWalletSidebar({
  isVisible,
  isClosing,
  onClose,
  isConnected,
  address,
  wallet,
  hasKeystore,
  balances,
  onUnlock,
  onRestore,
  onCreate,
  onDisconnect,
  unlockWallet,
  isLoading,
  error,
  availableUtxos,
  loadingUtxos,
  currentFeeRate,
  onSplitUtxo,
  onRefreshUtxos,
  onGetSwapQuote,
  dieselBalance,
  frbtcBalance,
}: TerminalWalletSidebarProps) {
  // Connect views state
  const [view, setView] = useState<ConnectView>('main');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');
  const [mnemonicCopied, setMnemonicCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Manage view state
  const [addressCopied, setAddressCopied] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [seedPassword, setSeedPassword] = useState('');
  const [seedPasswordError, setSeedPasswordError] = useState<string | null>(null);
  const [verifyingSeedPassword, setVerifyingSeedPassword] = useState(false);
  const [seedCopied, setSeedCopied] = useState(false);

  // Split UTXO state
  const [splitView, setSplitView] = useState(false);
  const [splitSelectedUtxo, setSplitSelectedUtxo] = useState<UtxoInput | null>(null);
  const [splitCount, setSplitCount] = useState(2);
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [customAmounts, setCustomAmounts] = useState<number[]>([]);
  const [splitFeeRate, setSplitFeeRate] = useState(0);
  const [splitFeeRateInput, setSplitFeeRateInput] = useState('');
  const [splitConfirming, setSplitConfirming] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [splitResult, setSplitResult] = useState<string | null>(null);
  const [splitError, setSplitError] = useState<string | null>(null);

  // Swap calculator state
  const [swapView, setSwapView] = useState(false);
  const [swapDirection, setSwapDirection] = useState<'diesel-to-frbtc' | 'frbtc-to-diesel'>('diesel-to-frbtc');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapQuote, setSwapQuote] = useState<SwapQuote | null>(null);
  const [swapQuoteLoading, setSwapQuoteLoading] = useState(false);
  const [swapQuoteError, setSwapQuoteError] = useState<string | null>(null);

  // Visual loading with 1.5s minimum spin
  const [utxoVisualLoading, setUtxoVisualLoading] = useState(false);
  const utxoLoadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (loadingUtxos) {
      setUtxoVisualLoading(true);
      if (utxoLoadingTimer.current) clearTimeout(utxoLoadingTimer.current);
      utxoLoadingTimer.current = null;
    } else if (utxoVisualLoading) {
      utxoLoadingTimer.current = setTimeout(() => setUtxoVisualLoading(false), 800);
    }
    return () => { if (utxoLoadingTimer.current) clearTimeout(utxoLoadingTimer.current); };
  }, [loadingUtxos]);

  // Reset state when sidebar opens
  useEffect(() => {
    if (isVisible) {
      setView(hasKeystore ? 'unlock' : 'main');
      setPassword('');
      setConfirmPassword('');
      setMnemonic('');
      setGeneratedMnemonic('');
      setMnemonicCopied(false);
      setLocalError(null);
      setAddressCopied(false);
      setShowSeed(false);
      setSeedPassword('');
      setSeedPasswordError(null);
      setSeedCopied(false);
      setSplitView(false);
      setSplitSelectedUtxo(null);
      setSplitCount(2);
      setSplitMode('equal');
      setCustomAmounts([]);
      setSplitFeeRate(0);
      setSplitFeeRateInput('');
      setSplitConfirming(false);
      setSplitting(false);
      setSplitResult(null);
      setSplitError(null);
      setSwapView(false);
      setSwapDirection('diesel-to-frbtc');
      setSwapAmount('');
      setSwapQuote(null);
      setSwapQuoteLoading(false);
      setSwapQuoteError(null);
    }
  }, [isVisible, hasKeystore]);

  // Escape key handler
  useEffect(() => {
    if (!isVisible) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isVisible, onClose]);

  // --- Connect handlers ---
  const handleUnlock = async () => {
    try {
      setLocalError(null);
      await onUnlock(password);
      onClose();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Failed to unlock');
    }
  };

  const handleRestore = async () => {
    if (!mnemonic.trim()) { setLocalError('Enter mnemonic phrase'); return; }
    if (password.length < 8) { setLocalError('Password must be at least 8 characters'); return; }
    try {
      setLocalError(null);
      await onRestore(mnemonic.trim(), password);
      onClose();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Failed to restore');
    }
  };

  const handleCreate = async () => {
    if (password.length < 8) { setLocalError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setLocalError('Passwords do not match'); return; }
    try {
      setLocalError(null);
      const newMnemonic = await onCreate(password);
      setGeneratedMnemonic(newMnemonic);
      setView('showMnemonic');
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Failed to create wallet');
    }
  };

  // --- Manage handlers ---
  const handleCopyAddress = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    }
  }, [address]);

  const handleRevealSeed = async () => {
    if (!seedPassword) { setSeedPasswordError('Enter password'); return; }
    setVerifyingSeedPassword(true);
    try {
      await unlockWallet(seedPassword);
      setShowSeed(true);
      setSeedPasswordError(null);
    } catch {
      setSeedPasswordError('Invalid password');
    } finally {
      setVerifyingSeedPassword(false);
    }
  };

  const handleCopySeed = () => {
    if (wallet) {
      navigator.clipboard.writeText(wallet.exportMnemonic());
      setSeedCopied(true);
      setTimeout(() => setSeedCopied(false), 2000);
    }
  };

  // Initialize splitFeeRate from currentFeeRate when entering split view
  const handleOpenSplitView = useCallback(() => {
    setSplitView(true);
    setSplitSelectedUtxo(null);
    setSplitCount(2);
    setSplitMode('equal');
    setCustomAmounts([]);
    const rate = Math.ceil((currentFeeRate || 1) * 100) / 100;
    setSplitFeeRate(rate);
    setSplitFeeRateInput(String(rate));
    setSplitResult(null);
    setSplitError(null);
    onRefreshUtxos();
  }, [currentFeeRate, onRefreshUtxos]);

  // Debounced swap quote fetching
  useEffect(() => {
    if (!swapView || !swapAmount) {
      setSwapQuote(null);
      setSwapQuoteError(null);
      return;
    }
    const parsed = parseFloat(swapAmount);
    if (isNaN(parsed) || parsed <= 0) {
      setSwapQuote(null);
      setSwapQuoteError(null);
      return;
    }
    setSwapQuoteLoading(true);
    setSwapQuoteError(null);
    const timer = setTimeout(async () => {
      const tokenIn = swapDirection === 'diesel-to-frbtc' ? '2:0' : '32:0';
      const tokenOut = swapDirection === 'diesel-to-frbtc' ? '32:0' : '2:0';
      // Convert to atomic units (8 decimals)
      const amountInAtomic = BigInt(Math.round(parsed * 1e8)).toString();
      try {
        const quote = await onGetSwapQuote(tokenIn, tokenOut, amountInAtomic);
        setSwapQuote(quote);
        setSwapQuoteLoading(false);
      } catch (e) {
        setSwapQuoteError(e instanceof Error ? e.message : 'Failed to get quote');
        setSwapQuote(null);
        setSwapQuoteLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [swapView, swapAmount, swapDirection, onGetSwapQuote]);

  // Split TX fee calculation (includes DIESEL mint OP_RETURN)
  const splitTxVsize = SPLIT_TX_BASE_VSIZE + splitCount * P2TR_OUTPUT_VSIZE + DIESEL_OPRETURN_VSIZE;
  const splitTxFee = Math.ceil(splitTxVsize * splitFeeRate);

  // Equal split preview
  const equalOutputAmounts = useMemo(() => {
    if (!splitSelectedUtxo || splitMode !== 'equal') return [];
    const available = splitSelectedUtxo.value - splitTxFee;
    if (available <= 0) return [];
    const perOutput = Math.floor(available / splitCount);
    // Last output gets remainder
    const amounts = Array(splitCount).fill(perOutput);
    amounts[amounts.length - 1] = available - perOutput * (splitCount - 1);
    return amounts;
  }, [splitSelectedUtxo, splitCount, splitTxFee, splitMode]);

  // Custom amounts remainder
  const customTotal = splitMode === 'custom' ? customAmounts.reduce((s, v) => s + v, 0) : 0;
  const customRemainder = splitSelectedUtxo ? splitSelectedUtxo.value - splitTxFee - customTotal : 0;

  // Validation
  const splitOutputs = splitMode === 'equal' ? equalOutputAmounts : customAmounts;
  const splitValid = splitSelectedUtxo &&
    splitOutputs.length === splitCount &&
    splitOutputs.every(v => v >= P2TR_DUST_LIMIT) &&
    (splitMode === 'equal' || customRemainder === 0) &&
    splitFeeRate > 0;

  const handleSplit = useCallback(async () => {
    if (!splitSelectedUtxo || !splitValid) return;
    setSplitting(true);
    setSplitError(null);
    try {
      const txid = await onSplitUtxo(splitSelectedUtxo, splitOutputs, splitFeeRate);
      setSplitResult(txid);
      setSplitConfirming(false);
    } catch (e) {
      setSplitError(e instanceof Error ? e.message : 'Split failed');
    } finally {
      setSplitting(false);
    }
  }, [splitSelectedUtxo, splitOutputs, splitFeeRate, splitValid, onSplitUtxo]);

  // Truncate address for display
  const shortAddr = (addr: string) => addr.length > 20
    ? `${addr.slice(0, 10)}...${addr.slice(-8)}`
    : addr;

  if (!isVisible) return null;

  const displayError = localError || error;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/80 ${
          isClosing ? "animate-[fadeOut_250ms_ease-in_forwards]" : "animate-[fadeIn_200ms_ease-out]"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed z-50 flex flex-col font-mono text-sm
          inset-0 sm:inset-auto sm:top-0 sm:right-0 sm:h-full sm:w-[400px] sm:border-l sm:border-orange-500/50
          ${isClosing
            ? "animate-[slideOutDown_250ms_cubic-bezier(0.4,0,1,1)_forwards] sm:animate-[slideOutRight_250ms_cubic-bezier(0.4,0,1,1)_forwards]"
            : "animate-[slideInUp_300ms_cubic-bezier(0,0,0.2,1)] sm:animate-[slideInRight_300ms_cubic-bezier(0,0,0.2,1)]"
          }`}
        style={{ background: "#0a0a0a" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-orange-500/50 bg-orange-500/10 shrink-0">
          <span className="text-orange-500 font-bold tracking-wide">{splitView ? 'SPLIT UTXO' : swapView ? 'SWAP' : 'WALLET'}</span>
          <button onClick={onClose} className="text-[#505050] hover:text-orange-500 transition-colors">
            [ESC]
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto p-5">
          {isConnected && address && splitView ? (
            // ===== CONNECTED: Split UTXO View =====
            <div className="space-y-5">
              {splitResult ? (
                // --- Split Result ---
                <div className="space-y-4">
                  <div className="text-[#00ff88] font-bold">SPLIT COMPLETE</div>
                  <div>
                    <div className="text-[#505050] text-xs mb-2 tracking-wide">TXID</div>
                    <div className="bg-[#050505] border border-[#252525] p-3">
                      <div className="text-[#00d4ff] text-xs break-all select-all">{splitResult}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSplitView(false); onRefreshUtxos(); }}
                    className="w-full py-2.5 border border-orange-500 text-orange-500 text-sm hover:bg-orange-500/10"
                  >
                    BACK
                  </button>
                </div>
              ) : splitConfirming && splitSelectedUtxo ? (
                // --- Confirmation ---
                <div className="space-y-4">
                  <div className="text-[#ffcc00] font-bold">CONFIRM SPLIT</div>

                  {/* Input */}
                  <div>
                    <div className="text-[#505050] text-xs mb-2 tracking-wide">INPUT</div>
                    <div className="bg-[#050505] border border-[#252525] p-3 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#505050] text-xs">Address</span>
                        <span className="text-[#00d4ff] text-xs">{shortAddr(address)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#505050] text-xs">UTXO</span>
                        <span className="text-[#707070] text-xs">{splitSelectedUtxo.txid.slice(0, 8)}...:{splitSelectedUtxo.vout}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#505050] text-xs">Amount</span>
                        <span className="text-[#e0e0e0] text-sm font-bold">{splitSelectedUtxo.value.toLocaleString()} sats</span>
                      </div>
                    </div>
                  </div>

                  {/* Outputs */}
                  <div>
                    <div className="text-[#505050] text-xs mb-2 tracking-wide">OUTPUTS ({splitOutputs.length})</div>
                    <div className="bg-[#050505] border border-[#252525] divide-y divide-[#1a1a1a]">
                      {splitOutputs.map((amount, i) => (
                        <div key={i} className="px-3 py-2 flex justify-between items-center">
                          <div>
                            <span className="text-[#404040] text-xs">#{i}</span>
                            <span className="text-[#00d4ff] text-xs ml-2">{shortAddr(address)}</span>
                            {i === 0 && (
                              <span className="text-[#00ff88] text-xs ml-2">+DIESEL +UG</span>
                            )}
                          </div>
                          <span className="text-[#e0e0e0] text-xs font-bold">{amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="px-3 py-2 flex justify-between items-center">
                        <div>
                          <span className="text-[#404040] text-xs">#{splitOutputs.length}</span>
                          <span className="text-[#707070] text-xs ml-2">OP_RETURN</span>
                          <span className="text-[#505050] text-xs ml-2">(protostone)</span>
                        </div>
                        <span className="text-[#505050] text-xs">0</span>
                      </div>
                    </div>
                  </div>

                  {/* Fee summary */}
                  <div>
                    <div className="text-[#505050] text-xs mb-2 tracking-wide">FEE</div>
                    <div className="bg-[#050505] border border-[#252525] p-3 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#505050] text-xs">Rate</span>
                        <span className="text-[#707070] text-xs">{splitFeeRate.toFixed(2)} sat/vB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#505050] text-xs">Size</span>
                        <span className="text-[#707070] text-xs">{splitTxVsize} vB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#505050] text-xs">Total fee</span>
                        <span className="text-[#ff6666] text-sm font-bold">{splitTxFee.toLocaleString()} sats</span>
                      </div>
                    </div>
                  </div>

                  {/* Error */}
                  {splitError && (
                    <div className="px-3 py-2 border border-[#ff4444]/50 bg-[#ff4444]/10 text-[#ff4444] text-sm">
                      {splitError}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSplitConfirming(false); setSplitError(null); }}
                      className="px-4 py-2.5 border border-[#303030] text-[#707070] text-sm hover:text-orange-500 hover:border-orange-500"
                    >
                      BACK
                    </button>
                    <button
                      onClick={handleSplit}
                      disabled={splitting}
                      className="flex-1 py-2.5 border border-[#00ff88] text-[#00ff88] text-sm font-bold hover:bg-[#00ff88]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {splitting ? 'SIGNING...' : 'CONFIRM & SIGN'}
                    </button>
                  </div>
                </div>
              ) : !splitSelectedUtxo ? (
                // --- UTXO Selection ---
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[#707070]">SELECT UTXO TO SPLIT</span>
                      {utxoVisualLoading && (
                        <span className="w-2 h-2 bg-[#00d4ff] animate-spin [animation-duration:3s]"></span>
                      )}
                    </div>
                    <button
                      onClick={onRefreshUtxos}
                      disabled={loadingUtxos}
                      className="text-[#505050] hover:text-[#00d4ff] text-xs disabled:opacity-50"
                    >
                      REFRESH
                    </button>
                  </div>
                  {availableUtxos.length === 0 && !loadingUtxos && (
                    <div className="text-[#505050] text-xs">No UTXOs available</div>
                  )}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {availableUtxos.map((utxo) => {
                      const chainFull = !utxo.confirmed && utxo.ancestorCount != null && utxo.ancestorCount >= MAX_CHAIN_LENGTH;
                      return (
                        <button
                          key={`${utxo.txid}:${utxo.vout}`}
                          onClick={() => !chainFull && setSplitSelectedUtxo(utxo)}
                          disabled={chainFull}
                          className={`w-full text-left px-3 py-2.5 border transition-colors ${
                            chainFull
                              ? 'border-[#252525] opacity-40 cursor-not-allowed'
                              : 'border-[#252525] hover:border-[#00d4ff]/50 hover:bg-[#00d4ff]/5'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-[#e0e0e0] text-sm font-bold">{utxo.value.toLocaleString()} sats</span>
                              {utxo.confirmed ? (
                                <span className="text-[#00ff88] text-[10px] border border-[#00ff88]/30 px-1">OK</span>
                              ) : (
                                <span className={`text-[10px] border px-1 ${
                                  chainFull
                                    ? 'text-[#ff4444] border-[#ff4444]/30'
                                    : 'text-[#ffcc00] border-[#ffcc00]/30'
                                }`}>
                                  {utxo.ancestorCount != null ? `${utxo.ancestorCount}/${MAX_CHAIN_LENGTH}` : 'UNCONF'}
                                </span>
                              )}
                            </div>
                            <span className="text-[#505050] text-xs">{formatBtcBalance(utxo.value, true)}</span>
                          </div>
                          <div className="text-[#404040] text-xs mt-1 truncate">{utxo.txid}:{utxo.vout}</div>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setSplitView(false)}
                    className="w-full py-2 border border-[#303030] text-[#707070] text-sm hover:text-orange-500 hover:border-orange-500"
                  >
                    BACK
                  </button>
                </div>
              ) : (
                // --- Split Configuration ---
                <div className="space-y-4">
                  {/* Selected UTXO */}
                  <div>
                    <div className="text-[#505050] text-xs mb-2 tracking-wide">SELECTED UTXO</div>
                    <div className="bg-[#050505] border border-[#252525] p-3 flex justify-between items-center">
                      <span className="text-[#e0e0e0] text-sm font-bold">{splitSelectedUtxo.value.toLocaleString()} sats</span>
                      <button
                        onClick={() => setSplitSelectedUtxo(null)}
                        className="text-[#505050] hover:text-orange-500 text-xs"
                      >
                        CHANGE
                      </button>
                    </div>
                  </div>

                  {/* Output Count */}
                  <div>
                    <div className="text-[#505050] text-xs mb-2 tracking-wide">OUTPUTS</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={2}
                        max={MAX_SPLIT_OUTPUTS}
                        value={splitCount}
                        onChange={(e) => {
                          const n = Math.min(MAX_SPLIT_OUTPUTS, Math.max(2, parseInt(e.target.value) || 2));
                          setSplitCount(n);
                          if (splitMode === 'custom') setCustomAmounts(Array(n).fill(0));
                        }}
                        className="flex-1 bg-[#0a0a0a] border border-[#303030] px-2 py-1.5 text-[#e0e0e0] text-center text-sm font-bold focus:border-[#00d4ff] focus:outline-none"
                      />
                      <div className="flex">
                        <button
                          onClick={() => {
                            const n = Math.max(2, splitCount - 1);
                            setSplitCount(n);
                            if (splitMode === 'custom') setCustomAmounts(Array(n).fill(0));
                          }}
                          disabled={splitCount <= 2}
                          className="w-9 h-9 border border-[#303030] text-[#707070] hover:border-[#00d4ff] hover:text-[#00d4ff] hover:z-10 relative disabled:opacity-30 disabled:hover:border-[#303030] disabled:hover:text-[#707070] transition-colors flex items-center justify-center text-lg"
                        >
                          -
                        </button>
                        <button
                          onClick={() => {
                            const n = Math.min(MAX_SPLIT_OUTPUTS, splitCount + 1);
                            setSplitCount(n);
                            if (splitMode === 'custom') setCustomAmounts(Array(n).fill(0));
                          }}
                          disabled={splitCount >= MAX_SPLIT_OUTPUTS}
                          className="w-9 h-9 border border-[#303030] -ml-px text-[#707070] hover:border-[#00d4ff] hover:text-[#00d4ff] hover:z-10 relative disabled:opacity-30 disabled:hover:border-[#303030] disabled:hover:text-[#707070] transition-colors flex items-center justify-center text-lg"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mode Toggle */}
                  <div>
                    <div className="text-[#505050] text-xs mb-2 tracking-wide">MODE</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSplitMode('equal')}
                        className={`flex-1 py-2 border text-sm font-bold transition-colors ${
                          splitMode === 'equal'
                            ? 'border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff]/10'
                            : 'border-[#252525] text-[#505050] hover:border-[#404040]'
                        }`}
                      >
                        EQUAL
                      </button>
                      <button
                        onClick={() => { setSplitMode('custom'); setCustomAmounts(Array(splitCount).fill(0)); }}
                        className={`flex-1 py-2 border text-sm font-bold transition-colors ${
                          splitMode === 'custom'
                            ? 'border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff]/10'
                            : 'border-[#252525] text-[#505050] hover:border-[#404040]'
                        }`}
                      >
                        CUSTOM
                      </button>
                    </div>
                  </div>

                  {/* Fee Rate */}
                  <div>
                    <div className="text-[#505050] text-xs mb-2 tracking-wide">FEE RATE (sat/vB)</div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={splitFeeRateInput}
                      onChange={(e) => {
                        setSplitFeeRateInput(e.target.value);
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v > 0) setSplitFeeRate(v);
                      }}
                      onBlur={() => {
                        const clamped = Math.ceil(Math.max(0.01, splitFeeRate) * 100) / 100;
                        setSplitFeeRate(clamped);
                        setSplitFeeRateInput(String(clamped));
                      }}
                      className="w-full bg-[#0a0a0a] border border-[#303030] px-3 py-1.5 text-[#e0e0e0] text-sm font-bold focus:border-[#00d4ff] focus:outline-none"
                    />
                  </div>

                  {/* Custom Amounts */}
                  {splitMode === 'custom' && (
                    <div>
                      <div className="text-[#505050] text-xs mb-2 tracking-wide">AMOUNTS (sats)</div>
                      <div className="space-y-2">
                        {customAmounts.map((amt, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[#404040] text-xs w-5">#{i + 1}</span>
                            <input
                              type="number"
                              min={P2TR_DUST_LIMIT}
                              value={amt || ''}
                              onChange={(e) => {
                                const newAmts = [...customAmounts];
                                newAmts[i] = parseInt(e.target.value) || 0;
                                setCustomAmounts(newAmts);
                              }}
                              className="flex-1 bg-[#050505] border border-[#252525] px-3 py-1.5 text-[#e0e0e0] text-sm outline-none focus:border-[#00d4ff]"
                              placeholder={`min ${P2TR_DUST_LIMIT}`}
                            />
                          </div>
                        ))}
                      </div>
                      <div className={`text-xs mt-2 ${customRemainder === 0 ? 'text-[#00ff88]' : customRemainder > 0 ? 'text-[#ffcc00]' : 'text-[#ff4444]'}`}>
                        {customRemainder === 0
                          ? 'Amounts match exactly'
                          : customRemainder > 0
                            ? `${customRemainder.toLocaleString()} sats unallocated`
                            : `${Math.abs(customRemainder).toLocaleString()} sats over budget`}
                      </div>
                    </div>
                  )}

                  {/* Preview */}
                  <div>
                    <div className="text-[#505050] text-xs mb-2 tracking-wide">PREVIEW</div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#505050]">TX size</span>
                        <span className="text-[#707070]">{splitTxVsize} vB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#505050]">Fee</span>
                        <span className="text-[#ff6666]">{splitTxFee.toLocaleString()} sats</span>
                      </div>
                      {splitMode === 'equal' && equalOutputAmounts.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-[#505050]">Per output</span>
                          <span className="text-[#e0e0e0]">{equalOutputAmounts[0]?.toLocaleString()} sats</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-[#505050]">DIESEL mint</span>
                        <span className="text-[#00ff88]">+1 via protostone</span>
                      </div>
                      {splitOutputs.some(v => v < P2TR_DUST_LIMIT) && (
                        <div className="text-[#ff4444]">Output below dust limit ({P2TR_DUST_LIMIT} sats)</div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSplitSelectedUtxo(null)}
                      className="px-4 py-2.5 border border-[#303030] text-[#707070] text-sm hover:text-orange-500 hover:border-orange-500"
                    >
                      BACK
                    </button>
                    <button
                      onClick={() => setSplitConfirming(true)}
                      disabled={!splitValid}
                      className="flex-1 py-2.5 border border-[#ffcc00] text-[#ffcc00] text-sm font-bold hover:bg-[#ffcc00]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      REVIEW SPLIT
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : isConnected && address && swapView ? (
            // ===== CONNECTED: Swap Calculator View =====
            <div className="space-y-5">
              {/* Direction toggle */}
              <div>
                <div className="text-[#505050] text-xs mb-2 tracking-wide">DIRECTION</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSwapDirection('diesel-to-frbtc'); setSwapAmount(''); setSwapQuote(null); }}
                    className={`flex-1 py-2 border text-sm font-bold transition-colors ${
                      swapDirection === 'diesel-to-frbtc'
                        ? 'border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff]/10'
                        : 'border-[#252525] text-[#505050] hover:border-[#404040]'
                    }`}
                  >
                    DIESEL
                  </button>
                  <button
                    onClick={() => {
                      setSwapDirection(d => d === 'diesel-to-frbtc' ? 'frbtc-to-diesel' : 'diesel-to-frbtc');
                      setSwapAmount('');
                      setSwapQuote(null);
                    }}
                    className="text-[#707070] hover:text-orange-500 transition-colors text-lg px-1"
                  >
                    ⇄
                  </button>
                  <button
                    onClick={() => { setSwapDirection('frbtc-to-diesel'); setSwapAmount(''); setSwapQuote(null); }}
                    className={`flex-1 py-2 border text-sm font-bold transition-colors ${
                      swapDirection === 'frbtc-to-diesel'
                        ? 'border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff]/10'
                        : 'border-[#252525] text-[#505050] hover:border-[#404040]'
                    }`}
                  >
                    frBTC
                  </button>
                </div>
              </div>

              {/* Sell amount input */}
              <div>
                <div className="text-[#505050] text-xs mb-2 tracking-wide">
                  {swapDirection === 'diesel-to-frbtc' ? 'SELL DIESEL' : 'SELL frBTC'}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={swapAmount}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || /^\d*\.?\d*$/.test(v)) setSwapAmount(v);
                    }}
                    placeholder="0.00"
                    className="flex-1 bg-[#0a0a0a] border border-[#303030] px-3 py-2 text-[#e0e0e0] text-sm font-bold focus:border-[#00d4ff] focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const bal = swapDirection === 'diesel-to-frbtc' ? dieselBalance : frbtcBalance;
                      setSwapAmount((bal / 1e8).toString());
                    }}
                    className="px-3 py-2 border border-[#303030] text-[#707070] text-xs hover:border-[#00d4ff] hover:text-[#00d4ff] transition-colors"
                  >
                    MAX
                  </button>
                </div>
                <div className="text-[#505050] text-xs mt-1.5">
                  Balance: {((swapDirection === 'diesel-to-frbtc' ? dieselBalance : frbtcBalance) / 1e8).toFixed(8)}{' '}
                  {swapDirection === 'diesel-to-frbtc' ? 'DIESEL' : 'frBTC'}
                </div>
              </div>

              {/* Output (readonly) */}
              <div>
                <div className="text-[#505050] text-xs mb-2 tracking-wide">
                  {swapDirection === 'diesel-to-frbtc' ? 'RECEIVE frBTC' : 'RECEIVE DIESEL'}
                </div>
                <div className="bg-[#050505] border border-[#252525] px-3 py-2.5 min-h-[40px] flex items-center">
                  {swapQuoteLoading ? (
                    <span className="text-[#505050] text-sm animate-pulse">Calculating...</span>
                  ) : swapQuoteError ? (
                    <span className="text-[#ff4444] text-sm">{swapQuoteError}</span>
                  ) : swapQuote ? (
                    <span className="text-[#00ff88] text-sm font-bold">
                      {(Number(swapQuote.amountOut) / 1e8).toFixed(8)}
                    </span>
                  ) : (
                    <span className="text-[#303030] text-sm">-</span>
                  )}
                </div>
              </div>

              {/* Exchange rate + fee */}
              {swapQuote && !swapQuoteError && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#505050]">Rate</span>
                    <span className="text-[#707070]">
                      1 {swapDirection === 'diesel-to-frbtc' ? 'DIESEL' : 'frBTC'} ={' '}
                      {(Number(swapQuote.amountOut) / Number(swapQuote.amountIn)).toFixed(8)}{' '}
                      {swapDirection === 'diesel-to-frbtc' ? 'frBTC' : 'DIESEL'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#505050]">Pool fee</span>
                    <span className="text-[#707070]">{(swapQuote.feeBps / 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#505050]">Hops</span>
                    <span className={swapQuote.hops > 1 ? 'text-[#ffcc00]' : 'text-[#707070]'}>{swapQuote.hops}</span>
                  </div>
                  <div className="text-xs mt-1">
                    <div className="text-[#505050] mb-1">Route</div>
                    <div className="text-[#707070] break-all">{swapQuote.route}</div>
                  </div>
                </div>
              )}

              {/* Back button */}
              <button
                onClick={() => { setSwapView(false); setSwapAmount(''); setSwapQuote(null); setSwapQuoteError(null); }}
                className="w-full py-2.5 border border-[#303030] text-[#707070] text-sm hover:text-orange-500 hover:border-orange-500 transition-colors"
              >
                BACK
              </button>
            </div>
          ) : isConnected && address ? (
            // ===== CONNECTED: Manage View =====
            <div className="space-y-5">
              {/* Address */}
              <div>
                <div className="text-[#505050] text-xs mb-2 tracking-wide">DEPOSIT ADDRESS</div>
                <div className="bg-[#050505] border border-[#252525] p-3">
                  <div className="text-[#00d4ff] text-sm break-all select-all">{address}</div>
                </div>
                <button
                  onClick={handleCopyAddress}
                  className={`w-full mt-2 py-2 border text-sm font-bold transition-colors ${
                    addressCopied
                      ? 'border-[#00ff88] text-[#00ff88] bg-[#00ff88]/5'
                      : 'border-[#00d4ff]/50 text-[#00d4ff] hover:bg-[#00d4ff]/5'
                  }`}
                >
                  {addressCopied ? '✓ COPIED' : 'COPY ADDRESS'}
                </button>
              </div>

              {/* Balances */}
              {balances && (
                <div>
                  <div className="text-[#505050] text-xs mb-2 tracking-wide">BALANCES</div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 flex-shrink-0"><BtcSkeletonIcon /></div>
                        <span className="text-[#707070]">BITCOIN</span>
                      </div>
                      <span className={balances.btcBalanceAvailable ? 'text-[#e0e0e0]' : 'text-[#505050] animate-pulse'}>
                        {balances.btcBalanceAvailable ? formatBtcBalance(balances.btcBalance, true) : '-.----'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 flex-shrink-0"><AlkaneSkeletonIcon /></div>
                        <span className="text-[#707070]">DIESEL</span>
                      </div>
                      <span className="text-[#e0e0e0]">
                        {balances.tokens?.find((t: any) => t.runeId === '2:0')?.balanceFormatted?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    {balances.runes?.find((r: any) => r.spacedName === 'UNCOMMON•GOODS') && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                            <span className="text-white/30 font-semibold text-2xl leading-none">⧉</span>
                          </div>
                          <span className="text-[#707070]">UNCOMMON GOODS</span>
                        </div>
                        <span className="text-[#e0e0e0]">
                          {balances.runes.find((r: any) => r.spacedName === 'UNCOMMON•GOODS')?.balanceFormatted?.toLocaleString() || '0'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setSwapView(true); setSwapAmount(''); setSwapQuote(null); setSwapQuoteError(null); }}
                  className="flex-1 py-2.5 border border-orange-500/50 text-orange-500 text-sm font-bold hover:bg-orange-500/5 transition-colors"
                >
                  SWAP
                </button>
                <button
                  onClick={handleOpenSplitView}
                  className="flex-1 py-2.5 border border-[#00d4ff]/50 text-[#00d4ff] text-sm font-bold hover:bg-[#00d4ff]/5 transition-colors"
                >
                  SPLIT UTXO
                </button>
              </div>

              {/* Backup Seed */}
              {wallet && (
                <div>
                  <div className="text-[#505050] text-xs mb-2 tracking-wide">BACKUP SEED</div>
                  {!showSeed ? (
                    <div>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="password"
                          value={seedPassword}
                          onChange={(e) => { setSeedPassword(e.target.value); setSeedPasswordError(null); }}
                          placeholder="Password to reveal"
                          className="flex-1 px-3 py-2 bg-[#050505] border border-[#252525] text-[#e0e0e0] text-sm outline-none focus:border-[#ffcc00]"
                          onKeyDown={(e) => { if (e.key === 'Enter' && seedPassword) handleRevealSeed(); }}
                        />
                        <button
                          onClick={handleRevealSeed}
                          disabled={verifyingSeedPassword || !seedPassword}
                          className="px-4 py-2 border border-[#ffcc00]/50 text-[#ffcc00] text-sm hover:bg-[#ffcc00]/5 disabled:opacity-50"
                        >
                          {verifyingSeedPassword ? '...' : 'REVEAL'}
                        </button>
                      </div>
                      {seedPasswordError && (
                        <div className="text-[#ff4444] text-sm">{seedPasswordError}</div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="bg-[#050505] border border-[#ff4444]/30 p-3 mb-3">
                        <div className="text-[#ff6666] text-sm break-all select-all">
                          {wallet.exportMnemonic()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCopySeed}
                          className={`flex-1 py-2 border text-sm font-bold transition-colors ${
                            seedCopied
                              ? 'border-[#00ff88] text-[#00ff88] bg-[#00ff88]/5'
                              : 'border-[#ffcc00]/50 text-[#ffcc00] hover:bg-[#ffcc00]/5'
                          }`}
                        >
                          {seedCopied ? '✓ COPIED' : 'COPY SEED'}
                        </button>
                        <button
                          onClick={() => { setShowSeed(false); setSeedPassword(''); }}
                          className="flex-1 py-2 border border-[#252525] text-[#707070] text-sm hover:bg-[#151515]"
                        >
                          HIDE
                        </button>
                      </div>
                      <div className="mt-2 text-[#ff4444]/80 text-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-[#ff4444]"></span>
                        Never share seed phrase. Anyone with it can steal your funds.
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Lock Button */}
              <button
                onClick={() => { onDisconnect(); onClose(); }}
                className="w-full py-2.5 border border-[#ff4444]/50 text-[#ff4444] text-sm hover:bg-[#ff4444]/10 transition-colors"
              >
                LOCK WALLET
              </button>
            </div>
          ) : (
            // ===== NOT CONNECTED: Connect Views =====
            <div>
              {view === 'main' && (
                <div className="space-y-4">
                  <div className="text-[#707070] mb-4">SELECT ACTION:</div>
                  <button
                    onClick={() => setView('create')}
                    className="w-full text-left px-4 py-3 border border-[#252525] hover:border-orange-500 hover:bg-orange-500/10 text-[#00ff88]"
                  >
                    {'>'} CREATE NEW WALLET
                  </button>
                  <button
                    onClick={() => setView('restore')}
                    className="w-full text-left px-4 py-3 border border-[#252525] hover:border-orange-500 hover:bg-orange-500/10 text-[#00d4ff]"
                  >
                    {'>'} RESTORE FROM MNEMONIC
                  </button>
                  {hasKeystore && (
                    <button
                      onClick={() => setView('unlock')}
                      className="w-full text-left px-4 py-3 border border-[#252525] hover:border-orange-500 hover:bg-orange-500/10 text-[#ffcc00]"
                    >
                      {'>'} UNLOCK EXISTING WALLET
                    </button>
                  )}
                </div>
              )}

              {view === 'unlock' && (
                <div className="space-y-4">
                  <div className="text-[#707070]">ENTER PASSWORD:</div>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                    placeholder="********"
                    className="w-full bg-[#050505] border border-[#252525] px-4 py-2 text-[#00ff88] outline-none focus:border-orange-500"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setView('main')}
                      className="px-4 py-2 border border-[#303030] text-[#707070] hover:text-orange-500 hover:border-orange-500"
                    >
                      BACK
                    </button>
                    <button
                      onClick={handleUnlock}
                      disabled={isLoading || !password}
                      className="flex-1 px-4 py-2 border border-orange-500 text-orange-500 hover:bg-orange-500/20 disabled:opacity-50"
                    >
                      {isLoading ? 'UNLOCKING...' : 'UNLOCK'}
                    </button>
                  </div>
                </div>
              )}

              {view === 'restore' && (
                <div className="space-y-4">
                  <div className="text-[#707070]">MNEMONIC PHRASE:</div>
                  <textarea
                    value={mnemonic}
                    onChange={e => setMnemonic(e.target.value)}
                    placeholder="word1 word2 word3 ..."
                    rows={3}
                    className="w-full bg-[#050505] border border-[#252525] px-4 py-2 text-[#00d4ff] outline-none focus:border-orange-500 resize-none"
                    autoFocus
                  />
                  <div className="text-[#707070]">PASSWORD (min 8 chars):</div>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRestore()}
                    placeholder="********"
                    className="w-full bg-[#050505] border border-[#252525] px-4 py-2 text-[#00ff88] outline-none focus:border-orange-500"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setView('main')}
                      className="px-4 py-2 border border-[#303030] text-[#707070] hover:text-orange-500 hover:border-orange-500"
                    >
                      BACK
                    </button>
                    <button
                      onClick={handleRestore}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 border border-orange-500 text-orange-500 hover:bg-orange-500/20 disabled:opacity-50"
                    >
                      {isLoading ? 'RESTORING...' : 'RESTORE'}
                    </button>
                  </div>
                </div>
              )}

              {view === 'create' && (
                <div className="space-y-4">
                  <div className="text-[#707070]">CREATE NEW WALLET</div>
                  <div className="text-[#ffcc00]/80 text-xs px-3 py-2 border border-[#ffcc00]/30 bg-[#ffcc00]/5">
                    A new mnemonic phrase will be generated. Make sure to save it!
                  </div>
                  <div className="text-[#707070]">PASSWORD (min 8 chars):</div>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="********"
                    className="w-full bg-[#050505] border border-[#252525] px-4 py-2 text-[#00ff88] outline-none focus:border-orange-500"
                    autoFocus
                  />
                  <div className="text-[#707070]">CONFIRM PASSWORD:</div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    placeholder="********"
                    className="w-full bg-[#050505] border border-[#252525] px-4 py-2 text-[#00ff88] outline-none focus:border-orange-500"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setView('main')}
                      className="px-4 py-2 border border-[#303030] text-[#707070] hover:text-orange-500 hover:border-orange-500"
                    >
                      BACK
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={isLoading || password.length < 8}
                      className="flex-1 px-4 py-2 border border-[#00ff88] text-[#00ff88] hover:bg-[#00ff88]/20 disabled:opacity-50"
                    >
                      {isLoading ? 'CREATING...' : 'CREATE WALLET'}
                    </button>
                  </div>
                </div>
              )}

              {view === 'showMnemonic' && (
                <div className="space-y-4">
                  <div className="text-[#00ff88] font-bold text-base">WALLET CREATED!</div>
                  <div className="text-[#ff4444]/90 text-xs px-3 py-2 border border-[#ff4444]/30 bg-[#ff4444]/5">
                    SAVE THIS MNEMONIC! It cannot be recovered if lost.
                  </div>
                  <div className="text-[#707070]">YOUR MNEMONIC PHRASE:</div>
                  <div
                    className="bg-[#050505] border border-[#252525] px-4 py-3 text-[#00d4ff] break-all cursor-pointer hover:border-[#00d4ff]"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedMnemonic);
                      setMnemonicCopied(true);
                      setTimeout(() => setMnemonicCopied(false), 2000);
                    }}
                  >
                    {generatedMnemonic}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedMnemonic);
                      setMnemonicCopied(true);
                      setTimeout(() => setMnemonicCopied(false), 2000);
                    }}
                    className={`w-full px-4 py-2 border ${mnemonicCopied ? 'border-[#00ff88] text-[#00ff88] bg-[#00ff88]/10' : 'border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff]/20'}`}
                  >
                    {mnemonicCopied ? '✓ COPIED!' : 'COPY MNEMONIC'}
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full px-4 py-2 border border-orange-500 text-orange-500 hover:bg-orange-500/20"
                  >
                    I SAVED IT - CONTINUE
                  </button>
                </div>
              )}

              {/* Error display */}
              {displayError && (
                <div className="mt-4 px-4 py-2 border border-[#ff4444]/50 bg-[#ff4444]/10 text-[#ff4444]">
                  ERROR: {displayError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#252525] text-[#404040] text-xs shrink-0">
          TURBO DIESEL TERMINAL
        </div>
      </div>
    </>
  );
}

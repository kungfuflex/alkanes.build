"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useWallet } from "@/context/WalletContext";
import { useWalletBalances, formatBtcBalance } from "@/hooks/useWalletBalances";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "@bitcoinerlab/secp256k1";
import { AutoMintPanel } from "./AutoMintPanel";

// Initialize ECC library for bitcoinjs-lib (required for P2TR addresses)
bitcoin.initEccLib(ecc);

// Fixed vsize for DIESEL mint transaction (P2TR input + P2TR output + OP_RETURN)
const TX_VSIZE = 141;

/**
 * Convert witness stack to script witness (serialized format)
 */
function witnessStackToScriptWitness(witness: Buffer[]): Buffer {
  let buffer = Buffer.allocUnsafe(0);
  function writeSlice(slice: Buffer): void {
    buffer = Buffer.concat([buffer, slice]);
  }
  function writeVarInt(i: number): void {
    if (i < 0xfd) {
      const buf = Buffer.allocUnsafe(1);
      buf.writeUInt8(i, 0);
      writeSlice(buf);
    } else if (i <= 0xffff) {
      const buf = Buffer.allocUnsafe(3);
      buf.writeUInt8(0xfd, 0);
      buf.writeUInt16LE(i, 1);
      writeSlice(buf);
    } else {
      const buf = Buffer.allocUnsafe(5);
      buf.writeUInt8(0xfe, 0);
      buf.writeUInt32LE(i, 1);
      writeSlice(buf);
    }
  }
  function writeVector(vector: Buffer[]): void {
    writeVarInt(vector.length);
    vector.forEach((item) => {
      writeVarInt(item.length);
      writeSlice(item);
    });
  }
  writeVector(witness);
  return buffer;
}

/**
 * Known working OP_RETURN script for DIESEL mint (count=1)
 */
function getDieselMintOpReturn(): Uint8Array {
  const hex = "6a5d1214011400ff7f818cec82d08bc0a88281d215";
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

interface UtxoInput {
  txid: string;
  vout: number;
  value: number;
  rawTxHex?: string;
}

/**
 * Execute a single DIESEL mint transaction
 */
async function executeMint(
  signTaprootPsbt: (psbtBase64: string) => Promise<string>,
  address: string,
  publicKey: string,
  feeRate: number,
  network: string,
  utxoOverride?: UtxoInput,
  exactFee?: number
): Promise<{ txid: string; outputValue: number; rawTxHex: string; inputUtxo: UtxoInput }> {
  const btcNetwork = network === "mainnet" ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

  let utxo: UtxoInput;
  let rawTxHex: string;

  if (utxoOverride) {
    utxo = utxoOverride;
  } else {
    const utxoResponse = await fetch(`https://mempool.space/api/address/${address}/utxo`);
    const utxos = await utxoResponse.json();
    if (!utxos || utxos.length === 0) {
      throw new Error("No UTXOs available");
    }
    utxos.sort((a: { value: number }, b: { value: number }) => b.value - a.value);
    utxo = utxos[0];
  }

  const isP2TR = address.startsWith("bc1p") || address.startsWith("tb1p");
  const opReturnScript = getDieselMintOpReturn();
  const txVsize = isP2TR ? TX_VSIZE : 150;
  const fee = exactFee !== undefined ? exactFee : Math.ceil(txVsize * feeRate);
  const dustLimit = isP2TR ? 330 : 546;
  const outputValue = utxo.value - fee;

  if (outputValue < dustLimit) {
    throw new Error(`Insufficient funds: ${utxo.value} sats, need ${fee + dustLimit}`);
  }

  const psbt = new bitcoin.Psbt({ network: btcNetwork });

  if (utxo.rawTxHex) {
    rawTxHex = utxo.rawTxHex;
  } else {
    const txResponse = await fetch(`https://mempool.space/api/tx/${utxo.txid}/hex`);
    rawTxHex = await txResponse.text();
  }

  const RBF_SEQUENCE = 0xfffffffd;

  if (isP2TR) {
    const outputScript = bitcoin.address.toOutputScript(address, btcNetwork);
    const pubKeyBuffer = Buffer.from(publicKey, "hex");
    const tapInternalKey = pubKeyBuffer.length === 33 ? pubKeyBuffer.subarray(1) : pubKeyBuffer;

    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      sequence: RBF_SEQUENCE,
      witnessUtxo: {
        script: outputScript,
        value: BigInt(utxo.value),
      },
      tapInternalKey: tapInternalKey,
    });
  } else {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      sequence: RBF_SEQUENCE,
      nonWitnessUtxo: Buffer.from(rawTxHex, "hex"),
    });
  }

  psbt.addOutput({ address: address, value: BigInt(outputValue) });
  psbt.addOutput({ script: Buffer.from(opReturnScript), value: BigInt(0) });

  const signedBase64 = await signTaprootPsbt(psbt.toBase64());
  const signedPsbt = bitcoin.Psbt.fromBase64(signedBase64, { network: btcNetwork });
  const input0 = signedPsbt.data.inputs[0];

  let signedTxHex: string;

  if (input0.tapKeySig) {
    signedPsbt.finalizeInput(0, () => ({
      finalScriptWitness: witnessStackToScriptWitness([Buffer.from(input0.tapKeySig!)]),
    }));
    signedTxHex = signedPsbt.extractTransaction().toHex();
  } else if (input0.finalScriptWitness) {
    signedTxHex = signedPsbt.extractTransaction().toHex();
  } else {
    throw new Error("Signing failed - no signature in PSBT");
  }

  const txid = bitcoin.Transaction.fromHex(signedTxHex).getId();

  const rpcUrl = process.env.NEXT_PUBLIC_ALKANES_RPC_URL || "https://mainnet.subfrost.io/v4/buildalkanes";
  const broadcastResponse = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "btc_sendrawtransaction",
      params: [signedTxHex],
    }),
  });

  const result = await broadcastResponse.json();
  if (result.error) {
    throw new Error(`Broadcast failed: ${result.error.message || JSON.stringify(result.error)}`);
  }

  // Return input UTXO with rawTxHex for RBF purposes
  const inputUtxo: UtxoInput = {
    txid: utxo.txid,
    vout: utxo.vout,
    value: utxo.value,
    rawTxHex: rawTxHex,
  };

  return { txid: result.result, outputValue, rawTxHex: signedTxHex, inputUtxo };
}

// Terminal-styled Connect Modal
function TerminalConnectModal({
  isOpen,
  onClose,
  onUnlock,
  onRestore,
  onCreate,
  hasKeystore,
  isLoading,
  error
}: {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (password: string) => Promise<void>;
  onRestore: (mnemonic: string, password: string) => Promise<void>;
  onCreate: (password: string) => Promise<string>;
  hasKeystore: boolean;
  isLoading: boolean;
  error: string | null;
}) {
  const [view, setView] = useState<'main' | 'unlock' | 'restore' | 'create' | 'showMnemonic'>('main');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');
  const [mnemonicCopied, setMnemonicCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setView(hasKeystore ? 'unlock' : 'main');
      setPassword('');
      setConfirmPassword('');
      setMnemonic('');
      setGeneratedMnemonic('');
      setMnemonicCopied(false);
      setLocalError(null);
    }
  }, [isOpen, hasKeystore]);

  if (!isOpen) return null;

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
    if (!mnemonic.trim()) {
      setLocalError('Enter mnemonic phrase');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    try {
      setLocalError(null);
      await onRestore(mnemonic.trim(), password);
      onClose();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Failed to restore');
    }
  };

  const handleCreate = async () => {
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    try {
      setLocalError(null);
      const newMnemonic = await onCreate(password);
      setGeneratedMnemonic(newMnemonic);
      setView('showMnemonic');
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Failed to create wallet');
    }
  };

  const copyMnemonic = () => {
    navigator.clipboard.writeText(generatedMnemonic);
    setMnemonicCopied(true);
    setTimeout(() => setMnemonicCopied(false), 2000);
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div
        className="bg-[#0a0a0a] border border-orange-500/50 w-full max-w-md font-mono text-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-orange-500/50 bg-orange-500/10">
          <span className="text-orange-500 font-bold">WALLET CONNECT</span>
          <button onClick={onClose} className="text-[#505050] hover:text-orange-500">
            [ESC]
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
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
                ⚠ SAVE THIS MNEMONIC! It cannot be recovered if lost.
              </div>
              <div className="text-[#707070]">YOUR MNEMONIC PHRASE:</div>
              <div
                className="bg-[#050505] border border-[#252525] px-4 py-3 text-[#00d4ff] break-all cursor-pointer hover:border-[#00d4ff]"
                onClick={copyMnemonic}
              >
                {generatedMnemonic}
              </div>
              <button
                onClick={copyMnemonic}
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

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#252525] text-[#404040] text-xs">
          TURBO DIESEL TERMINAL
        </div>
      </div>
    </div>
  );
}

// Flash animation hook - returns className when value changes
function useFlash<T>(value: T, duration = 500): string {
  const [isFlashing, setIsFlashing] = useState(false);
  const prevValue = useRef<T>(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevValue.current = value;
      return;
    }

    // Check if value changed
    if (prevValue.current !== value) {
      prevValue.current = value;
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), duration);
      return () => clearTimeout(timer);
    }
  }, [value, duration]);

  return isFlashing ? 'animate-flash' : '';
}

// Constants
const MEMPOOL_API = 'https://mempool.space/api/v1/fees/mempool-blocks';
const REFRESH_INTERVAL = 10000; // 10 seconds for mempool fees
const COMPETITION_REFRESH_INTERVAL = 15000; // 15 seconds for competition scan

// Our RPC endpoint
const RPC_URL = process.env.NEXT_PUBLIC_ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/buildalkanes';

interface MempoolBlock {
  blockSize: number;
  blockVSize: number;
  nTx: number;
  totalFees: number;
  medianFee: number;
  feeRange: number[];
}

const DieselTerminal = () => {
  // Wallet state
  const { isConnected, address, account, network, hasStoredKeystore, unlockWallet, restoreWallet, createWallet, signTaprootPsbt, disconnect, wallet } = useWallet();
  const publicKey = account?.taproot?.pubkey || "";
  const { data: balances, refetch: refetchBalances } = useWalletBalances(address);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Mint state
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintResult, setMintResult] = useState<{ txids: string[]; totalFee: number } | null>(null);
  const [mintProgress, setMintProgress] = useState({ current: 0, total: 0 });

  // Chain data types
  type RbfData = {
    lastTxInput: UtxoInput;
    lastTxFee: number;
    chainLength: number;
    totalVsize: number;
    feesExcludingLast: number;
    totalFees: number;
  };
  type CpfpData = {
    lastTxid: string;
    lastOutputValue: number;
    lastRawTxHex: string;
  };
  type ChainData = {
    mintResult: { txids: string[]; totalFee: number };
    rbfData: RbfData;
    cpfpData: CpfpData;
  };

  // Store chains by source UTXO key (txid:vout)
  const [chainsMap, setChainsMap] = useState<Map<string, ChainData>>(new Map());

  // RBF state - data needed to replace the last TX
  const [rbfData, setRbfData] = useState<RbfData | null>(null);
  const [rbfFeeRate, setRbfFeeRate] = useState('');
  const [isRbfing, setIsRbfing] = useState(false);

  // CPFP state - track last TX output for creating child
  const [cpfpData, setCpfpData] = useState<CpfpData | null>(null);
  const cpfpDataRef = useRef<CpfpData | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    cpfpDataRef.current = cpfpData;
  }, [cpfpData]);

  // Track which UTXO started the current chain
  const [currentChainUtxoKey, setCurrentChainUtxoKey] = useState<string | null>(null);

  // UTXO selection state
  const [availableUtxos, setAvailableUtxos] = useState<UtxoInput[]>([]);
  const [selectedUtxo, setSelectedUtxo] = useState<UtxoInput | null>(null);
  const [showUtxoSelector, setShowUtxoSelector] = useState(false);
  const [loadingUtxos, setLoadingUtxos] = useState(false);

  // Block height state (declared early for use in confirmation check useEffect)
  const [blockHeight, setBlockHeight] = useState<number | null>(null);

  // Helper to get UTXO key
  const getUtxoKey = (utxo: UtxoInput | null) => utxo ? `${utxo.txid}:${utxo.vout}` : null;

  // Load chain data when UTXO selection changes
  useEffect(() => {
    const key = getUtxoKey(selectedUtxo);
    if (key && chainsMap.has(key)) {
      const chain = chainsMap.get(key)!;
      setMintResult(chain.mintResult);
      setRbfData(chain.rbfData);
      setCpfpData(chain.cpfpData);
      setCurrentChainUtxoKey(key);
    } else if (selectedUtxo) {
      // New UTXO selected with no chain - clear current chain display
      setMintResult(null);
      setRbfData(null);
      setCpfpData(null);
      setCurrentChainUtxoKey(null);
    }
    // Don't clear if selectedUtxo is null (auto mode) - keep showing current chain
  }, [selectedUtxo, chainsMap]);

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositCopied, setDepositCopied] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [mnemonicCopied, setMnemonicCopied] = useState(false);
  const [seedPassword, setSeedPassword] = useState('');
  const [seedPasswordError, setSeedPasswordError] = useState<string | null>(null);
  const [verifyingSeedPassword, setVerifyingSeedPassword] = useState(false);

  // Handle Esc key to close modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDepositModal) {
          setShowDepositModal(false);
          setShowMnemonic(false);
          setSeedPassword('');
          setSeedPasswordError(null);
        }
        if (showConnectModal) {
          setShowConnectModal(false);
        }
        if (showWalletMenu) {
          setShowWalletMenu(false);
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showDepositModal, showConnectModal, showWalletMenu]);

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setDepositCopied(true);
      setTimeout(() => setDepositCopied(false), 2000);
    }
  };

  const handleUnlock = async (password: string) => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      await unlockWallet(password);
    } finally {
      setWalletLoading(false);
    }
  };

  const handleRestore = async (mnemonic: string, password: string) => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      await restoreWallet(mnemonic, password);
    } finally {
      setWalletLoading(false);
    }
  };

  const handleCreate = async (password: string): Promise<string> => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      const result = await createWallet(password);
      return result.mnemonic;
    } finally {
      setWalletLoading(false);
    }
  };

  // Fetch available UTXOs via Subfrost RPC
  const fetchUtxos = useCallback(async () => {
    if (!address) return;
    setLoadingUtxos(true);
    try {
      const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'esplora_address::utxo',
          params: [address],
        }),
      });
      const data = await res.json();
      if (data.result && Array.isArray(data.result)) {
        // Sort by value descending
        const sorted = data.result
          .map((u: any) => ({
            txid: u.txid,
            vout: u.vout,
            value: u.value,
            confirmed: u.status?.confirmed ?? true,
          }))
          .sort((a: UtxoInput, b: UtxoInput) => b.value - a.value);
        setAvailableUtxos(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch UTXOs:', err);
    } finally {
      setLoadingUtxos(false);
    }
  }, [address]);

  // Handle mint execution
  const handleMint = async (mintCount: number, feeRateSatVb: number) => {
    if (!signTaprootPsbt || !address || !publicKey) {
      setMintError("Wallet not connected or taproot key missing");
      return;
    }

    if (mintCount <= 0) {
      setMintError("Nothing to mint");
      return;
    }

    // Block if RBF is in progress to prevent race conditions
    if (isRbfing) {
      setMintError("RBF in progress - wait and retry");
      return;
    }

    // Check if we're continuing an existing chain
    const continuingChain = cpfpData && rbfData && rbfData.chainLength > 0;
    const existingChainLength = continuingChain ? rbfData!.chainLength : 0;
    const existingTotalFees = continuingChain ? rbfData!.totalFees : 0;
    const existingTxids = continuingChain && mintResult ? mintResult.txids : [];

    // Check chain limit (25 max)
    if (existingChainLength + mintCount > 25) {
      setMintError(`Chain limit: can only add ${25 - existingChainLength} more TXs`);
      return;
    }

    setIsMinting(true);
    setMintError(null);
    setMintProgress({ current: 0, total: mintCount });

    try {
      // Verify chain UTXO still exists (not confirmed or replaced)
      if (continuingChain) {
        const checkRes = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'esplora_tx',
            params: [cpfpData!.lastTxid],
          }),
        });
        const checkData = await checkRes.json();

        if (checkData.result?.status?.confirmed) {
          // Chain was confirmed - clear data and start fresh
          setRbfData(null);
          setCpfpData(null);
          setMintResult(null);
          if (currentChainUtxoKey) {
            setChainsMap(prev => {
              const newMap = new Map(prev);
              newMap.delete(currentChainUtxoKey);
              return newMap;
            });
            setCurrentChainUtxoKey(null);
          }
          setMintError("Chain confirmed - cleared, try again");
          setIsMinting(false);
          refetchBalances();
          return;
        }

        if (checkData.error) {
          // TX not found - might have been replaced by RBF
          setMintError("Chain UTXO not found - may have been replaced");
          setIsMinting(false);
          return;
        }
      }
      const txids: string[] = [];
      // If continuing chain, start from last TX output
      // Otherwise, use selected UTXO if set (or auto-select in executeMint)
      let nextUtxo: UtxoInput | undefined = continuingChain ? {
        txid: cpfpData!.lastTxid,
        vout: 0,
        value: cpfpData!.lastOutputValue,
        rawTxHex: cpfpData!.lastRawTxHex,
      } : selectedUtxo || undefined;
      let lastTxInputUtxo: UtxoInput | undefined = undefined; // Track input to last TX for RBF
      let lastResult: { txid: string; outputValue: number; rawTxHex: string } | undefined = undefined; // Track last TX for CPFP
      let newTxsFee = 0;
      let feesExcludingLast = continuingChain ? rbfData!.totalFees : 0; // Start with existing fees

      // Track source UTXO for this chain
      let sourceUtxoKey = continuingChain ? currentChainUtxoKey : (selectedUtxo ? getUtxoKey(selectedUtxo) : null);

      // Capture the cpfpData we're working with for staleness check
      const initialCpfpTxid = cpfpData?.lastTxid || null;

      for (let i = 0; i < mintCount; i++) {
        setMintProgress({ current: i + 1, total: mintCount });

        // Check for stale data before each TX (especially important for first TX in chain continuation)
        if (i === 0 && continuingChain) {
          // Verify cpfpData hasn't changed (e.g., by RBF)
          if (cpfpDataRef.current?.lastTxid !== initialCpfpTxid) {
            throw new Error("Chain data changed during mint - retry");
          }
        }

        const result = await executeMint(
          signTaprootPsbt,
          address,
          publicKey,
          feeRateSatVb,
          network,
          nextUtxo
        );

        txids.push(result.txid);
        lastResult = result; // Track for CPFP
        const fee = nextUtxo ? nextUtxo.value - result.outputValue : Math.ceil(TX_VSIZE * feeRateSatVb);
        newTxsFee += fee;

        // Capture source UTXO key from first TX if not already set
        if (i === 0 && !sourceUtxoKey && result.inputUtxo) {
          sourceUtxoKey = `${result.inputUtxo.txid}:${result.inputUtxo.vout}`;
        }

        // Track fees excluding last TX (for RBF effective rate calculation)
        if (i < mintCount - 1) {
          feesExcludingLast += fee;
        }

        // For single TX (no chain continuation), use the input from executeMint
        // For chain, use the previous TX output
        if (i === mintCount - 1) {
          // This is the last TX - save its input for RBF
          if (mintCount === 1 && !continuingChain) {
            lastTxInputUtxo = result.inputUtxo;
          } else {
            lastTxInputUtxo = nextUtxo;
          }
        }

        // Prepare next UTXO in chain
        if (i < mintCount - 1) {
          nextUtxo = {
            txid: result.txid,
            vout: 0,
            value: result.outputValue,
            rawTxHex: result.rawTxHex,
          };
        }
      }

      const lastTxFee = Math.ceil(TX_VSIZE * feeRateSatVb);
      const totalFee = existingTotalFees + newTxsFee;
      const allTxids = [...existingTxids, ...txids];

      setMintResult({ txids: allTxids, totalFee });

      // Save RBF data for the combined chain
      if (lastTxInputUtxo) {
        const chainLen = existingChainLength + mintCount;
        const totalVsizeCalc = chainLen * TX_VSIZE;
        setRbfData({
          lastTxInput: lastTxInputUtxo,
          lastTxFee: Number(lastTxFee) || 0,
          chainLength: chainLen,
          totalVsize: totalVsizeCalc,
          feesExcludingLast: Number(feesExcludingLast) || 0,
          totalFees: Number(totalFee) || 0,
        });
      }

      // Save CPFP data - output of last TX for creating child
      const newCpfpData = lastResult ? {
        lastTxid: lastResult.txid,
        lastOutputValue: lastResult.outputValue,
        lastRawTxHex: lastResult.rawTxHex,
      } : null;

      if (newCpfpData) {
        setCpfpData(newCpfpData);
      }

      // Save to chainsMap for UTXO-based chain tracking
      if (sourceUtxoKey && lastTxInputUtxo && newCpfpData) {
        const chainLen = existingChainLength + mintCount;
        const newRbfData: RbfData = {
          lastTxInput: lastTxInputUtxo,
          lastTxFee: Number(lastTxFee) || 0,
          chainLength: chainLen,
          totalVsize: chainLen * TX_VSIZE,
          feesExcludingLast: Number(feesExcludingLast) || 0,
          totalFees: Number(totalFee) || 0,
        };

        setChainsMap(prev => {
          const newMap = new Map(prev);
          newMap.set(sourceUtxoKey!, {
            mintResult: { txids: allTxids, totalFee },
            rbfData: newRbfData,
            cpfpData: newCpfpData,
          });
          return newMap;
        });
        setCurrentChainUtxoKey(sourceUtxoKey);
      }

      refetchBalances();
      // Keep selectedUtxo - user's manual choice persists for auto-mint cycles
    } catch (err) {
      setMintError(err instanceof Error ? err.message : "Mint failed");
    } finally {
      setIsMinting(false);
      setMintProgress({ current: 0, total: 0 });
    }
  };

  // Handle RBF - replace last TX to achieve target EFFECTIVE rate for entire chain
  // Bitcoin RBF requires: new_fee >= old_fee + (incremental_relay_fee * vsize)
  const INCREMENTAL_RELAY_FEE = 1; // sat/vB

  // Calculate current effective rate and minimum for RBF
  const currentEffectiveRate = rbfData && rbfData.totalVsize > 0
    ? rbfData.totalFees / rbfData.totalVsize
    : 0;

  // Minimum new last TX fee for RBF to be accepted
  const minLastTxFee = rbfData
    ? (rbfData.lastTxFee || 0) + Math.ceil(TX_VSIZE * INCREMENTAL_RELAY_FEE)
    : 0;

  // Minimum effective rate achievable with RBF
  const minEffectiveRate = rbfData && rbfData.totalVsize > 0
    ? ((rbfData.feesExcludingLast || 0) + minLastTxFee) / rbfData.totalVsize
    : 0;

  // Calculate CPFP preview based on current input
  const cpfpPreview = useMemo(() => {
    if (!rbfData || !cpfpData || rbfData.totalVsize <= 0) return null;

    const targetRate = parseFloat(rbfFeeRate);
    if (isNaN(targetRate) || targetRate <= 0) return null;

    const newTotalVsize = rbfData.totalVsize + TX_VSIZE;
    const requiredChildFee = Math.ceil(targetRate * newTotalVsize - rbfData.totalFees);
    // With package relay, minimum is just 1 sat (not 1 sat/vB)
    const actualChildFee = Math.max(requiredChildFee, 1);
    const actualRate = (rbfData.totalFees + actualChildFee) / newTotalVsize;

    return {
      requiredChildFee,
      actualChildFee,
      actualRate,
      targetRate,
    };
  }, [rbfData, cpfpData, rbfFeeRate]);

  const handleRbf = async (directRate?: number) => {
    if (!signTaprootPsbt || !address || !publicKey || !rbfData) {
      setMintError("Missing data for RBF");
      return;
    }

    const targetEffectiveRate = directRate ?? parseFloat(rbfFeeRate);
    if (isNaN(targetEffectiveRate) || targetEffectiveRate <= 0) {
      setMintError("Enter valid target effective rate");
      return;
    }

    if (!rbfData.totalVsize || rbfData.totalVsize <= 0) {
      setMintError("Invalid chain data - try detecting chain again");
      return;
    }

    // Calculate required last TX fee to achieve target effective rate
    // targetEffectiveRate = totalFees / totalVsize
    // newTotalFees = targetEffectiveRate * totalVsize
    // newLastTxFee = newTotalFees - feesExcludingLast
    const feesExcludingLast = rbfData.feesExcludingLast || 0;
    const requiredLastTxFee = Math.ceil(targetEffectiveRate * rbfData.totalVsize - feesExcludingLast);

    // Ensure we meet minimum RBF requirements
    const actualLastTxFee = Math.max(requiredLastTxFee, minLastTxFee);

    if (actualLastTxFee <= rbfData.lastTxFee) {
      setMintError(`Target must be > ${currentEffectiveRate.toFixed(2)} sat/vB (min: ${minEffectiveRate.toFixed(2)})`);
      return;
    }

    setIsRbfing(true);
    setMintError(null);

    try {
      // Re-execute mint with the same input but higher fee
      const result = await executeMint(
        signTaprootPsbt,
        address,
        publicKey,
        0, // fee rate ignored when exactFee is provided
        network,
        rbfData.lastTxInput,
        actualLastTxFee // exact fee in sats
      );

      // Update state
      const oldTxids = mintResult?.txids || [];
      const newTxids = [...oldTxids.slice(0, -1), result.txid]; // Replace last txid

      const newTotalFees = (rbfData.feesExcludingLast || 0) + actualLastTxFee;

      setMintResult({ txids: newTxids, totalFee: newTotalFees });

      // Update RBF data for potential further bumps
      const newRbfData: RbfData = {
        ...rbfData,
        lastTxFee: actualLastTxFee,
        totalFees: newTotalFees,
      };
      setRbfData(newRbfData);

      // Update CPFP data - the RBF created a new last TX
      const newCpfpData: CpfpData = {
        lastTxid: result.txid,
        lastOutputValue: result.outputValue,
        lastRawTxHex: result.rawTxHex,
      };
      setCpfpData(newCpfpData);

      // Update chainsMap
      if (currentChainUtxoKey) {
        setChainsMap(prev => {
          const newMap = new Map(prev);
          newMap.set(currentChainUtxoKey, {
            mintResult: { txids: newTxids, totalFee: newTotalFees },
            rbfData: newRbfData,
            cpfpData: newCpfpData,
          });
          return newMap;
        });
      }

      setRbfFeeRate('');
      refetchBalances();
    } catch (err) {
      setMintError(err instanceof Error ? err.message : "RBF failed");
    } finally {
      setIsRbfing(false);
    }
  };

  // Handle CPFP - create child TX with high fee to pull up entire package
  const MAX_CHAIN_LENGTH = 25; // Bitcoin mempool limit

  const handleCpfp = async (directRate?: number) => {
    if (!signTaprootPsbt || !address || !publicKey || !cpfpData || !rbfData) {
      setMintError("Missing data for CPFP");
      return;
    }

    // Check chain length limit
    if (rbfData.chainLength >= MAX_CHAIN_LENGTH) {
      setMintError(`Chain limit reached (${MAX_CHAIN_LENGTH} TXs). Use RBF instead.`);
      return;
    }

    const targetEffectiveRate = directRate ?? parseFloat(rbfFeeRate);
    if (isNaN(targetEffectiveRate) || targetEffectiveRate <= 0) {
      setMintError("Enter valid target effective rate");
      return;
    }

    // Calculate required child fee to achieve target effective rate for package
    // targetRate = (currentFees + childFee) / (currentVsize + childVsize)
    // childFee = targetRate * (currentVsize + childVsize) - currentFees
    const newTotalVsize = rbfData.totalVsize + TX_VSIZE;
    const requiredChildFee = Math.ceil(targetEffectiveRate * newTotalVsize - rbfData.totalFees);

    // With Bitcoin Core package relay, child can have very low individual fee
    // as long as package rate meets mempool requirements
    const actualChildFee = Math.max(requiredChildFee, 1); // At least 1 sat

    // Check if we have enough balance in the last output
    const dustLimit = 330; // P2TR dust limit
    if (cpfpData.lastOutputValue - actualChildFee < dustLimit) {
      setMintError(`Insufficient balance for CPFP: need ${actualChildFee + dustLimit} sats, have ${cpfpData.lastOutputValue}`);
      return;
    }

    setIsRbfing(true);
    setMintError(null);

    try {
      // Create child TX spending the last TX output
      const childUtxo: UtxoInput = {
        txid: cpfpData.lastTxid,
        vout: 0,
        value: cpfpData.lastOutputValue,
        rawTxHex: cpfpData.lastRawTxHex,
      };

      const result = await executeMint(
        signTaprootPsbt,
        address,
        publicKey,
        0, // fee rate ignored when exactFee is provided
        network,
        childUtxo,
        actualChildFee // exact fee in sats
      );

      // Update state - add new TX to chain
      const oldTxids = mintResult?.txids || [];
      const newTxids = [...oldTxids, result.txid];
      const newTotalFees = rbfData.totalFees + actualChildFee;
      const newChainLength = rbfData.chainLength + 1;
      const newTotalVsizeActual = newChainLength * TX_VSIZE;

      setMintResult({ txids: newTxids, totalFee: newTotalFees });

      // Update RBF data for potential further bumps
      const newRbfData: RbfData = {
        lastTxInput: childUtxo, // The child's input is the parent's output
        lastTxFee: actualChildFee,
        chainLength: newChainLength,
        totalVsize: newTotalVsizeActual,
        feesExcludingLast: rbfData.totalFees, // Previous total becomes "excluding last"
        totalFees: newTotalFees,
      };
      setRbfData(newRbfData);

      // Update CPFP data for the new last TX
      const newCpfpData: CpfpData = {
        lastTxid: result.txid,
        lastOutputValue: result.outputValue,
        lastRawTxHex: result.rawTxHex,
      };
      setCpfpData(newCpfpData);

      // Update chainsMap
      if (currentChainUtxoKey) {
        setChainsMap(prev => {
          const newMap = new Map(prev);
          newMap.set(currentChainUtxoKey, {
            mintResult: { txids: newTxids, totalFee: newTotalFees },
            rbfData: newRbfData,
            cpfpData: newCpfpData,
          });
          return newMap;
        });
      }

      setRbfFeeRate('');
      refetchBalances();
    } catch (err) {
      setMintError(err instanceof Error ? err.message : "CPFP failed");
    } finally {
      setIsRbfing(false);
    }
  };

  // Detect existing unconfirmed chains from mempool (finds ALL chains per UTXO)
  const detectExistingChain = useCallback(async () => {
    if (!address) return;

    setIsMinting(true);
    setMintError(null);

    try {
      // Fetch all transactions for the address
      const txsResponse = await fetch(`https://mempool.space/api/address/${address}/txs`);
      const txs = await txsResponse.json();

      // Filter unconfirmed transactions
      const unconfirmedTxs = txs.filter((tx: any) => !tx.status?.confirmed);

      if (unconfirmedTxs.length === 0) {
        setMintError("No unconfirmed transactions found");
        setIsMinting(false);
        return;
      }

      // Build a map of txid -> tx
      const txMap = new Map<string, any>();
      unconfirmedTxs.forEach((tx: any) => txMap.set(tx.txid, tx));

      // Find DIESEL mints (have OP_RETURN with DIESEL pattern)
      const dieselPrefix = "6a5d1214011400";
      const dieselTxs = unconfirmedTxs.filter((tx: any) =>
        tx.vout?.some((out: any) => out.scriptpubkey?.startsWith(dieselPrefix))
      );

      if (dieselTxs.length === 0) {
        setMintError("No DIESEL mints in mempool");
        setIsMinting(false);
        return;
      }

      // Find ALL chain starts (TXs that spend from outside our unconfirmed set)
      // Each chain start represents a different source UTXO
      // NOTE: Chain start may not be a DIESEL tx itself (e.g., a regular tx that starts the chain)
      const chainStarts: Array<{ tx: any; sourceUtxoKey: string; sourceUtxo: { txid: string; vout: number; value: number } }> = [];

      for (const tx of unconfirmedTxs) {
        for (const vin of tx.vin) {
          if (!txMap.has(vin.txid)) {
            // This TX spends from a confirmed UTXO - it's a chain start
            const sourceUtxoKey = `${vin.txid}:${vin.vout}`;
            // Check if we already found a chain from this UTXO
            if (!chainStarts.some(cs => cs.sourceUtxoKey === sourceUtxoKey)) {
              chainStarts.push({
                tx,
                sourceUtxoKey,
                sourceUtxo: {
                  txid: vin.txid,
                  vout: vin.vout,
                  value: vin.prevout?.value || 0,
                },
              });
            }
            break;
          }
        }
      }

      if (chainStarts.length === 0) {
        setMintError("Could not find any chain starts");
        setIsMinting(false);
        return;
      }

      // Process each chain and build chainsMap
      const newChainsMap = new Map<string, ChainData>();

      for (const chainStartInfo of chainStarts) {
        const { tx: chainStart, sourceUtxoKey, sourceUtxo } = chainStartInfo;

        // Follow the chain
        const chainTxids: string[] = [];
        const txFees: number[] = [];
        let currentTxid = chainStart.txid;
        let lastTx: any = null;
        let secondToLastTx: any = null;

        while (currentTxid) {
          const tx = txMap.get(currentTxid);
          if (!tx) break;

          // Check if this is a DIESEL mint
          const isDiesel = tx.vout?.some((out: any) => out.scriptpubkey?.startsWith(dieselPrefix));

          // If not DIESEL and we haven't found any DIESEL yet, skip to next TX in chain
          // (chain may start with non-DIESEL tx like a regular transfer)
          if (!isDiesel) {
            if (chainTxids.length > 0) {
              // Already have DIESEL txs, stop here
              break;
            }
            // Skip non-DIESEL tx at start, find next TX that spends from it
            let nextTxid: string | null = null;
            for (const [txid, otherTx] of txMap) {
              if (txid === currentTxid) continue;
              for (const vin of otherTx.vin) {
                if (vin.txid === currentTxid && vin.vout === 0) {
                  nextTxid = txid;
                  break;
                }
              }
              if (nextTxid) break;
            }
            currentTxid = nextTxid!;
            continue;
          }

          chainTxids.push(currentTxid);

          // Calculate fee
          const inputValue = tx.vin.reduce((sum: number, vin: any) => sum + (vin.prevout?.value || 0), 0);
          const outputValue = tx.vout.reduce((sum: number, vout: any) => sum + (vout.value || 0), 0);
          txFees.push(inputValue - outputValue);

          secondToLastTx = lastTx;
          lastTx = tx;

          // Find next TX in chain
          let nextTxid: string | null = null;
          for (const [txid, otherTx] of txMap) {
            if (txid === currentTxid) continue;
            for (const vin of otherTx.vin) {
              if (vin.txid === currentTxid && vin.vout === 0) {
                nextTxid = txid;
                break;
              }
            }
            if (nextTxid) break;
          }

          currentTxid = nextTxid!;
        }

        if (chainTxids.length === 0) continue;

        const totalFees = txFees.reduce((a, b) => a + b, 0);
        const chainLen = chainTxids.length;
        const totalVsize = chainLen * TX_VSIZE;
        const lastTxFee = txFees[txFees.length - 1] || 0;
        const feesExcludingLast = txFees.slice(0, -1).reduce((a, b) => a + b, 0);

        // Build RBF data
        let lastTxInput: UtxoInput;
        if (chainLen >= 2 && secondToLastTx) {
          const rawTxRes = await fetch(`https://mempool.space/api/tx/${secondToLastTx.txid}/hex`);
          const rawTxHex = await rawTxRes.text();
          lastTxInput = {
            txid: secondToLastTx.txid,
            vout: 0,
            value: secondToLastTx.vout[0]?.value || 0,
            rawTxHex,
          };
        } else {
          const rawTxRes = await fetch(`https://mempool.space/api/tx/${sourceUtxo.txid}/hex`);
          const rawTxHex = await rawTxRes.text();
          lastTxInput = {
            txid: sourceUtxo.txid,
            vout: sourceUtxo.vout,
            value: sourceUtxo.value,
            rawTxHex,
          };
        }

        const rbfData: RbfData = {
          lastTxInput,
          lastTxFee: Number(lastTxFee) || 0,
          chainLength: chainLen,
          totalVsize: Number(totalVsize) || 0,
          feesExcludingLast: Number(feesExcludingLast) || 0,
          totalFees: Number(totalFees) || 0,
        };

        // Build CPFP data
        const lastTxRawRes = await fetch(`https://mempool.space/api/tx/${lastTx.txid}/hex`);
        const lastTxRawHex = await lastTxRawRes.text();
        const lastOutputValue = lastTx.vout[0]?.value || 0;

        const cpfpData: CpfpData = {
          lastTxid: lastTx.txid,
          lastOutputValue,
          lastRawTxHex: lastTxRawHex,
        };

        const mintResult = { txids: chainTxids, totalFee: totalFees };

        // Save to chainsMap
        newChainsMap.set(sourceUtxoKey, { mintResult, rbfData, cpfpData });
      }

      // Update chainsMap with all detected chains
      setChainsMap(prev => {
        const merged = new Map(prev);
        for (const [key, value] of newChainsMap) {
          merged.set(key, value);
        }
        return merged;
      });

      // Display the appropriate chain based on selection
      const targetUtxoKey = selectedUtxo ? getUtxoKey(selectedUtxo) : null;
      const chainToDisplay = targetUtxoKey && newChainsMap.has(targetUtxoKey)
        ? newChainsMap.get(targetUtxoKey)
        : newChainsMap.values().next().value; // First found if no selection

      if (chainToDisplay) {
        setMintResult(chainToDisplay.mintResult);
        setRbfData(chainToDisplay.rbfData);
        setCpfpData(chainToDisplay.cpfpData);

        // Set currentChainUtxoKey
        const displayKey = targetUtxoKey && newChainsMap.has(targetUtxoKey)
          ? targetUtxoKey
          : newChainsMap.keys().next().value;
        setCurrentChainUtxoKey(displayKey || null);
      }

      if (newChainsMap.size === 0) {
        setMintError("No DIESEL chains found");
      }

    } catch (err) {
      setMintError(err instanceof Error ? err.message : "Detection failed");
    } finally {
      setIsMinting(false);
    }
  }, [address, selectedUtxo]);

  // Auto-detect chain on mount if wallet is connected
  useEffect(() => {
    if (isConnected && address && !mintResult) {
      detectExistingChain();
    }
  }, [isConnected, address]);

  // Check if chain is confirmed or TX disappeared (RBF replaced) and clear data
  useEffect(() => {
    if (!cpfpData?.lastTxid) return;

    const checkConfirmation = async () => {
      try {
        const res = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'esplora_tx',
            params: [cpfpData.lastTxid],
          }),
        });
        const data = await res.json();

        // If lastTxid is confirmed, chain is done
        if (data.result?.status?.confirmed) {
          clearChainData();
          return;
        }

        // If lastTxid doesn't exist (RBF didn't make it to mempool),
        // check if the FIRST tx of the original chain was confirmed instead
        const lastTxNotFound = data.error || !data.result;

        if (lastTxNotFound && mintResult?.txids && mintResult.txids.length > 0) {
          const firstTxid = mintResult.txids[0];
          const firstTxRes = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'esplora_tx',
              params: [firstTxid],
            }),
          });
          const firstTxData = await firstTxRes.json();

          // If first TX is confirmed, original chain was mined (RBF lost the race)
          // If first TX also not found, chain was evicted - clear anyway
          if (firstTxData.result?.status?.confirmed || firstTxData.error || !firstTxData.result) {
            clearChainData();
            return;
          }
        }

        // If lastTxid not found for any reason, clear the chain
        if (lastTxNotFound) {
          clearChainData();
        }
      } catch {
        // Ignore errors, will retry next interval
      }
    };

    const clearChainData = () => {
      setRbfData(null);
      setCpfpData(null);
      setMintResult(null);
      setRbfFeeRate('');

      // Remove from chainsMap
      if (currentChainUtxoKey) {
        setChainsMap(prev => {
          const newMap = new Map(prev);
          newMap.delete(currentChainUtxoKey);
          return newMap;
        });
        setCurrentChainUtxoKey(null);
      }

      refetchBalances();
    };

    // Check immediately
    checkConfirmation();

    // Then check every 30 seconds
    const interval = setInterval(checkConfirmation, 30000);
    return () => clearInterval(interval);
  }, [cpfpData?.lastTxid, refetchBalances, currentChainUtxoKey, blockHeight, mintResult?.txids]); // blockHeight triggers immediate check on new block

  // Check ALL chains in chainsMap for confirmation and remove confirmed ones
  useEffect(() => {
    if (chainsMap.size === 0) return;

    const checkAllChains = async () => {
      const confirmedKeys: string[] = [];

      for (const [utxoKey, chainData] of chainsMap) {
        try {
          // Check lastTxid (could be RBF replacement)
          const lastTxRes = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'esplora_tx',
              params: [chainData.cpfpData.lastTxid],
            }),
          });
          const lastTxData = await lastTxRes.json();

          // If lastTxid is confirmed, chain is done
          if (lastTxData.result?.status?.confirmed) {
            confirmedKeys.push(utxoKey);
            continue;
          }

          // If lastTxid doesn't exist (RBF didn't make it to mempool),
          // check if the FIRST tx of the original chain was confirmed instead
          const lastTxNotFound = lastTxData.error || !lastTxData.result;

          if (lastTxNotFound && chainData.mintResult.txids.length > 0) {
            const firstTxid = chainData.mintResult.txids[0];
            const firstTxRes = await fetch(RPC_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'esplora_tx',
                params: [firstTxid],
              }),
            });
            const firstTxData = await firstTxRes.json();

            // If first TX is confirmed, original chain was mined (RBF lost the race)
            // If first TX also not found, something is wrong - remove chain anyway
            if (firstTxData.result?.status?.confirmed || firstTxData.error || !firstTxData.result) {
              confirmedKeys.push(utxoKey);
              continue;
            }
          }

          // If lastTxid not found and first TX not found/not confirmed,
          // the chain was likely evicted from mempool entirely - remove it
          if (lastTxNotFound) {
            confirmedKeys.push(utxoKey);
          }
        } catch {
          // Ignore errors for individual chains
        }
      }

      // Remove confirmed chains
      if (confirmedKeys.length > 0) {
        setChainsMap(prev => {
          const newMap = new Map(prev);
          for (const key of confirmedKeys) {
            newMap.delete(key);
          }
          return newMap;
        });

        // If current chain was confirmed, clear display
        if (currentChainUtxoKey && confirmedKeys.includes(currentChainUtxoKey)) {
          setRbfData(null);
          setCpfpData(null);
          setMintResult(null);
          setCurrentChainUtxoKey(null);
          refetchBalances();
        }
      }
    };

    // Check immediately
    checkAllChains();

    // Retry after delays to account for indexer lag after new block
    const retry1 = setTimeout(checkAllChains, 2000);
    const retry2 = setTimeout(checkAllChains, 5000);
    const retry3 = setTimeout(checkAllChains, 10000);

    // Then check every 30 seconds
    const interval = setInterval(checkAllChains, 30000);
    return () => {
      clearTimeout(retry1);
      clearTimeout(retry2);
      clearTimeout(retry3);
      clearInterval(interval);
    };
  }, [chainsMap.size, currentChainUtxoKey, refetchBalances, blockHeight]); // blockHeight triggers immediate check on new block

  // DIESEL constants (moved calculation after mempoolStats)
  const DIESEL_BASE_REWARD = 3.125; // DIESEL units
  const DIESEL_BASE_REWARD_SATS = 312_500_000; // in smallest units (8 decimals)
  const [dieselPrice, setDieselPrice] = useState(2991);
  const [txCost, setTxCost] = useState(3.92);
  const [competition, setCompetition] = useState(100);

  // Mempool state
  const [mempoolBlocks, setMempoolBlocks] = useState<MempoolBlock[]>([]);
  const [mempoolLoading, setMempoolLoading] = useState(true);
  const [mempoolError, setMempoolError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoFee, setAutoFee] = useState(true); // Auto-update fee from mempool
  const [feeCap, setFeeCap] = useState<number | null>(null); // Max fee rate in sat/vB (null = no cap)

  // Competition scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ checked: 0, total: 0, found: 0 });
  const [detectedCompetition, setDetectedCompetition] = useState<number | null>(null);
  const [autoCompetition, setAutoCompetition] = useState(true); // Auto-update competition from scan

  // Pool price state
  const [poolPrice, setPoolPrice] = useState<number | null>(null); // DIESEL price in sats from pool
  const [poolPriceLoading, setPoolPriceLoading] = useState(true);

  // Block time state (blockHeight declared earlier)
  const [blockTime, setBlockTime] = useState<number | null>(null); // Unix timestamp of last block
  const [avgBlockTime, setAvgBlockTime] = useState<number | null>(null); // Average block time for current period
  const [blocksUntilAdjustment, setBlocksUntilAdjustment] = useState<number | null>(null);

  // Fetch current block height and timestamp from Subfrost RPC
  const fetchBlockHeight = useCallback(async () => {
    try {
      // Get block count
      const countRes = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'btc_getblockcount',
          params: []
        })
      });
      if (!countRes.ok) throw new Error(`HTTP ${countRes.status}`);
      const countData = await countRes.json();

      if (countData.result) {
        const height = countData.result;
        setBlockHeight(height);

        // Get block hash for this height
        const hashRes = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'btc_getblockhash',
            params: [height]
          })
        });
        const hashData = await hashRes.json();

        if (hashData.result) {
          // Get block header to get timestamp
          const headerRes = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 3,
              method: 'btc_getblockheader',
              params: [hashData.result]
            })
          });
          const headerData = await headerRes.json();

          if (headerData.result?.time) {
            setBlockTime(headerData.result.time);
          }
        }
      }
    } catch (err) {
      // Silently fail
    }
  }, []);

  // Fetch block height on mount and every 10 seconds (fast detection for chain confirmation)
  useEffect(() => {
    fetchBlockHeight();
    const interval = setInterval(fetchBlockHeight, 10 * 1000);
    return () => clearInterval(interval);
  }, [fetchBlockHeight]);

  // Fetch difficulty adjustment data and calculate average block time
  const fetchDifficultyData = useCallback(async () => {
    try {
      const res = await fetch('https://mempool.space/api/v1/mining/difficulty-adjustments/1m');
      if (!res.ok) return;
      const data = await res.json();

      if (data && data.length > 0 && blockHeight && blockTime) {
        // Latest adjustment: [timestamp, height, difficulty, change]
        const lastAdjustment = data[0];
        const lastAdjTime = lastAdjustment[0];
        const lastAdjHeight = lastAdjustment[1];

        // Calculate blocks since last adjustment
        const blocksSinceAdj = blockHeight - lastAdjHeight;
        const timeSinceAdj = blockTime - lastAdjTime;

        if (blocksSinceAdj > 0 && timeSinceAdj > 0) {
          const avg = timeSinceAdj / blocksSinceAdj;
          setAvgBlockTime(avg);
        }

        // Blocks until next adjustment (every 2016 blocks)
        const blocksUntil = 2016 - (blockHeight % 2016);
        setBlocksUntilAdjustment(blocksUntil);
      }
    } catch (err) {
      // Silently fail
    }
  }, [blockHeight, blockTime]);

  // Fetch difficulty data when block height/time changes
  useEffect(() => {
    if (blockHeight && blockTime) {
      fetchDifficultyData();
    }
  }, [blockHeight, blockTime, fetchDifficultyData]);

  // Fetch pool price from DIESEL/frBTC pool
  const fetchPoolPrice = useCallback(async () => {
    try {
      const res = await fetch('/api/pools?pool=DIESEL_FRBTC');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success && data.data?.price) {
        // Price is in frBTC per DIESEL, convert to sats (1 frBTC = 100,000,000 sats)
        const priceInSats = Math.round(data.data.price * 100_000_000);
        setPoolPrice(priceInSats);
      }
    } catch (err) {
      // Silently fail - price will show as ---
    } finally {
      setPoolPriceLoading(false);
    }
  }, []);

  // Fetch pool price on mount and every 5 minutes
  useEffect(() => {
    fetchPoolPrice();
    const interval = setInterval(fetchPoolPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPoolPrice]);

  // Auto-update dieselPrice from pool price
  useEffect(() => {
    if (poolPrice !== null && poolPrice > 0) {
      setDieselPrice(poolPrice);
    }
  }, [poolPrice]);

  // Flash animations for real-time values
  const txCostFlash = useFlash(txCost);
  const competitionFlash = useFlash(competition);
  const detectedCompetitionFlash = useFlash(detectedCompetition);
  const minFeeFlash = useFlash(mempoolBlocks[0]?.feeRange[0]);
  const poolPriceFlash = useFlash(poolPrice);

  // Fetch mempool data
  const fetchMempool = useCallback(async () => {
    try {
      const res = await fetch(MEMPOOL_API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: MempoolBlock[] = await res.json();
      setMempoolBlocks(data);
      setMempoolError(null);
      setLastUpdate(new Date());

      // Auto-update TX cost if enabled
      if (autoFee && data.length > 0 && data[0].feeRange.length > 0) {
        let feeRate = data[0].feeRange[0];
        // Apply cap if set
        if (feeCap !== null && feeRate > feeCap) {
          feeRate = feeCap;
        }
        setTxCost(Math.ceil(feeRate * TX_VSIZE * 100) / 100);
      }
    } catch (err) {
      setMempoolError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setMempoolLoading(false);
    }
  }, [autoFee, feeCap]);

  // Initial fetch and interval + refresh on new block
  useEffect(() => {
    fetchMempool();
    const interval = setInterval(fetchMempool, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMempool, blockHeight]); // blockHeight triggers immediate refresh on new block

  // Derived mempool values
  const mempoolStats = useMemo(() => {
    if (mempoolBlocks.length === 0) return null;

    const nextBlock = mempoolBlocks[0];
    const minFee = nextBlock.feeRange[0];
    const maxFee = nextBlock.feeRange[nextBlock.feeRange.length - 1];
    const medianFee = nextBlock.medianFee;

    return {
      nextBlockTxs: nextBlock.nTx,
      nextBlockVSize: nextBlock.blockVSize,
      nextBlockFees: nextBlock.totalFees,
      minFee,
      maxFee,
      medianFee,
      totalBlocks: mempoolBlocks.length,
      pendingTxs: mempoolBlocks.reduce((sum, b) => sum + b.nTx, 0),
    };
  }, [mempoolBlocks]);

  // DIESEL block reward calculation based on protocol rules
  // Protocol fee = min(base_reward / 2, tx_fees) — always taken, capped at 50% of base
  // Distributable = base_reward - protocol_fee
  // Example: tx_fees = 0.001 BTC → protocol_fee = 0.001, distributable = 3.124 DIESEL
  const blockReward = useMemo(() => {
    if (!mempoolStats?.nextBlockFees) return DIESEL_BASE_REWARD;

    const txFeesSats = mempoolStats.nextBlockFees;
    // Protocol takes min(50% of base reward, total tx fees) — fees always subtracted
    const protocolFee = Math.min(DIESEL_BASE_REWARD_SATS / 2, txFeesSats);
    const distributableSats = DIESEL_BASE_REWARD_SATS - protocolFee;

    return distributableSats / 100_000_000; // Convert to DIESEL units
  }, [mempoolStats?.nextBlockFees]);

  // Lua script to scan mempool for DIESEL mints (runs server-side in one request)
  // Checks both ancestor (tx pulls parents) and descendant (child pays for tx via CPFP) fee rates
  const DIESEL_SCAN_SCRIPT = `
local minFeeRate = tonumber(args[1]) or 1
local DIESEL_PREFIX = "6a5d1214011400"

local mempool = _RPC.btc_getrawmempool(true)

local dieselCount = 0
local totalMempool = 0
local qualifying = 0

for txid, entry in pairs(mempool) do
  totalMempool = totalMempool + 1

  -- Ancestor fee rate: can this TX get in with its parents?
  local ancestorFeeRate = (entry.fees.ancestor * 100000000) / entry.ancestorsize

  -- Descendant fee rate: can this TX get in via CPFP (child paying for it)?
  local descendantFeeRate = (entry.fees.descendant * 100000000) / entry.descendantsize

  -- TX qualifies if EITHER rate is high enough
  -- Also add 10% buffer for borderline cases
  local threshold = minFeeRate * 0.9

  if ancestorFeeRate >= threshold or descendantFeeRate >= threshold then
    qualifying = qualifying + 1
    local tx = _RPC.btc_getrawtransaction(txid, true)

    if tx and tx.vout then
      for _, output in ipairs(tx.vout) do
        if output.scriptPubKey and output.scriptPubKey.hex then
          if string.sub(output.scriptPubKey.hex, 1, 14) == DIESEL_PREFIX then
            dieselCount = dieselCount + 1
            break
          end
        end
      end
    end
  end
end

return {
  total_mempool = totalMempool,
  qualifying = qualifying,
  diesel_mints = dieselCount
}
`;

  // Scan mempool for DIESEL mint transactions via Lua script
  const scanForDieselMints = useCallback(async () => {
    if (!mempoolStats) return;

    setIsScanning(true);
    setScanProgress({ checked: 0, total: 0, found: 0 });

    try {
      const minFeeForNextBlock = mempoolStats.minFee;

      const rpcRes = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'lua_evalscript',
          params: [DIESEL_SCAN_SCRIPT, minFeeForNextBlock.toString()]
        })
      });

      if (!rpcRes.ok) throw new Error(`RPC error: ${rpcRes.status}`);
      const rpcData = await rpcRes.json();

      if (rpcData.error) throw new Error(rpcData.error.message || JSON.stringify(rpcData.error));

      const result = rpcData.result?.returns;
      const calls = rpcData.result?.calls || 0;
      const runtime = rpcData.result?.runtime || 0;


      if (result) {
        setScanProgress({
          checked: result.qualifying,
          total: result.total_mempool,
          found: result.diesel_mints
        });

        setDetectedCompetition(result.diesel_mints);

        if (autoCompetition) {
          setCompetition(result.diesel_mints);
        }
      }

    } catch (err) {
      console.error('[DieselTerminal] Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  }, [mempoolStats, autoCompetition]);

  // Auto-scan competition every 5 seconds
  useEffect(() => {
    if (!mempoolStats) return;

    // Initial scan
    scanForDieselMints();

    // Set up interval
    const interval = setInterval(() => {
      if (!isScanning) {
        scanForDieselMints();
      }
    }, COMPETITION_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [mempoolStats?.minFee]); // Re-run when minFee changes

  // Simplified profitability check - used only for status indicator
  const isProfitable = useMemo(() => {
    const R = blockReward || 0.001;
    const priceSats = dieselPrice || 1;
    const costSats = txCost || 0.001;
    const M = Math.max(0, competition || 0);

    const DIESEL_FEE = 0.05;
    const pool = Math.max(0, R - DIESEL_FEE);

    // Check if at least 1 mint is profitable: pool × price / (1 + M) > txCost
    const singleMintRevenue = (pool * priceSats) / (1 + M);
    return singleMintRevenue > costSats;
  }, [blockReward, dieselPrice, txCost, competition]);

  // Current time state for elapsed time calculation (updates every second)
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format elapsed time since last block
  const formatElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const blockElapsed = blockTime ? currentTime - blockTime : null;

  const now = new Date();
  const timestamp = now.toLocaleTimeString('en-US', { hour12: false }) + ' UTC';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#b0b0b0] font-mono p-2 sm:p-4 text-xs sm:text-sm overflow-x-hidden selection:bg-orange-500/30">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-4">
          {blockHeight && (
            <span className="text-[#606060] text-xs sm:text-sm flex items-center gap-2 sm:gap-3">
              <span className="flex items-center">
                <svg className="w-3.5 h-3.5 text-[#707070] mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
                  <path d="M12 12v10" />
                  <path d="M12 12L2 7" />
                  <path d="M12 12l10-5" />
                </svg>
                <span className="text-[#e0e0e0]">{blockHeight.toLocaleString()}</span>
                {blockElapsed !== null && (
                  <span className={`ml-1 sm:ml-2 ${blockElapsed > 1200 ? 'text-[#ffcc00]' : blockElapsed > 600 ? 'text-orange-500' : 'text-[#00ff88]'}`}>
                    +{formatElapsed(blockElapsed)}
                  </span>
                )}
              </span>
              {avgBlockTime && (
                <span className="hidden sm:flex border-l border-[#303030] pl-3 group relative items-center">
                  <span className="text-[#707070]">AVG</span>
                  <span className={`ml-1 ${avgBlockTime > 660 ? 'text-[#ff4444]' : avgBlockTime < 540 ? 'text-[#00ff88]' : 'text-[#909090]'}`}>
                    {Math.floor(avgBlockTime / 60)}:{String(Math.floor(avgBlockTime % 60)).padStart(2, '0')}
                  </span>
                  {blocksUntilAdjustment && (
                    <span className="text-[#505050] ml-1">/{blocksUntilAdjustment}</span>
                  )}
                  <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-[#1a1a1a] border border-[#404040] text-sm text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-72 pointer-events-none z-50">
                    <div className="text-orange-500 mb-1 font-bold">BLOCK TIME ANALYSIS</div>
                    <div>Period avg: {Math.floor(avgBlockTime / 60)}m {Math.floor(avgBlockTime % 60)}s</div>
                    <div>Target: 10m 0s</div>
                    {blocksUntilAdjustment && <div className="mt-1">{blocksUntilAdjustment} blocks to adjustment</div>}
                    <div className="mt-2 pt-2 border-t border-[#303030]">
                      {avgBlockTime > 660
                        ? <span className="text-[#ff4444]">▼ SLOW — difficulty decrease expected</span>
                        : avgBlockTime < 540
                          ? <span className="text-[#00ff88]">▲ FAST — difficulty increase expected</span>
                          : <span className="text-[#707070]">● NORMAL RANGE</span>
                      }
                    </div>
                  </div>
                </span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-[#606060]">
          {/* Balance display */}
          {isConnected ? (
            balances ? (
              <div className="flex items-center gap-2 sm:gap-5 border-r border-[#303030] pr-2 sm:pr-4 mr-1 sm:mr-2">
                <span className="flex items-center gap-1">
                  <span className="text-[#707070] text-xs">BTC</span>
                  <span className="text-[#e0e0e0] text-xs sm:text-sm">{formatBtcBalance(balances.btcBalance || 0)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-[#707070] text-xs">DSL</span>
                  <span className="text-[#e0e0e0] text-xs sm:text-sm">{balances.tokens?.find((t: any) => t.runeId === '2:0')?.balanceFormatted?.toFixed(2) || '0.00'}</span>
                </span>
                {balances.runes?.find((r: any) => r.spacedName === 'UNCOMMON•GOODS') && (
                  <span className="hidden sm:flex items-center gap-1">
                    <span className="text-[#707070] text-xs">UG</span>
                    <span className="text-[#e0e0e0]">{balances.runes.find((r: any) => r.spacedName === 'UNCOMMON•GOODS')?.balanceFormatted?.toLocaleString() || '0'}</span>
                  </span>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowWalletMenu(!showWalletMenu)}
                    className="text-orange-500 hover:bg-orange-500 hover:text-black border border-orange-500 px-2 sm:px-3 py-1 text-xs sm:text-sm tracking-wide transition-colors"
                  >
                    WALLET
                  </button>
                  {showWalletMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowWalletMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 bg-[#0d0d0d] border border-[#404040] z-50 min-w-36">
                        <button
                          onClick={() => {
                            setShowDepositModal(true);
                            setShowWalletMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-orange-500 hover:bg-orange-500/10 border-b border-[#252525]"
                        >
                          MANAGE
                        </button>
                        <button
                          onClick={() => {
                            setShowWalletMenu(false);
                            navigator.clipboard.writeText(address || '');
                            setDepositCopied(true);
                            setTimeout(() => setDepositCopied(false), 2000);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-orange-500 hover:bg-orange-500/10 border-b border-[#252525]"
                        >
                          {depositCopied ? '✓ COPIED' : 'COPY ADDR'}
                        </button>
                        <button
                          onClick={() => {
                            disconnect();
                            setMintResult(null);
                            setRbfData(null); setCpfpData(null);
                            setShowWalletMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-[#ff4444] hover:bg-[#ff4444]/10"
                        >
                          LOCK
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-[#505050] border-r border-[#303030] pr-4 mr-2 text-sm">LOADING...</span>
            )
          ) : (
            <button
              onClick={() => setShowConnectModal(true)}
              className="text-orange-500 hover:bg-orange-500 hover:text-black border border-orange-500 px-3 py-1 text-sm tracking-wide transition-colors"
            >
              CONNECT
            </button>
          )}
          <span className="text-[#505050] hidden sm:inline">{timestamp}</span>
        </div>
      </div>

      {/* Combined Mempool & Status Bar */}
      <div className="mb-2 sm:mb-3 border border-[#252525] bg-[#0d0d0d]">
        <div className="flex flex-wrap items-center justify-between px-2 sm:px-4 py-2 gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-5">
            <span className="text-xs sm:text-sm"><span className="text-orange-500 font-bold">1</span><span className="text-[#404040] mx-1">│</span><span className="text-[#e0e0e0] tracking-wide">STATUS</span></span>
            {/* Mempool stats */}
            {mempoolLoading ? (
              <span className="text-[#ffcc00] animate-pulse">LOADING...</span>
            ) : mempoolError ? (
              <span className="text-[#ff4444]">ERR: {mempoolError}</span>
            ) : mempoolStats ? (
              <>
                <div className="flex items-center gap-2 group relative">
                  <span className="text-[#505050] text-xs border-b border-dotted border-[#505050] cursor-help">NEXT</span>
                  <span className={`${minFeeFlash} ${feeCap !== null && mempoolStats.minFee > feeCap ? 'text-[#ff4444] line-through' : 'text-[#e0e0e0]'}`}>
                    {mempoolStats.minFee.toFixed(2)}
                  </span>
                  {feeCap !== null && mempoolStats.minFee > feeCap && (
                    <span className="text-[#e0e0e0]">→{feeCap.toFixed(2)}</span>
                  )}
                  <span className="text-[#404040] text-xs">s/vB</span>
                  <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-[#1a1a1a] border border-[#404040] text-sm text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-60 pointer-events-none z-50">
                    <div className="text-orange-500 font-bold mb-1">NEXT BLOCK STATS</div>
                    <div>TXs: {mempoolStats.nextBlockTxs}</div>
                    <div>Median: {mempoolStats.medianFee.toFixed(2)} sat/vB</div>
                    <div>Max: {mempoolStats.maxFee.toFixed(1)} sat/vB</div>
                  </div>
                </div>
                <span className="text-[#252525] hidden sm:inline">│</span>
                <div className="flex items-center gap-2 group relative">
                  <span className="text-[#505050] text-xs border-b border-dotted border-[#505050] cursor-help">QUEUE</span>
                  <span className="text-[#e0e0e0]">{mempoolStats.totalBlocks}</span>
                  <span className="text-[#404040] text-xs">blks</span>
                  <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-[#1a1a1a] border border-[#404040] text-sm text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-52 pointer-events-none z-50">
                    <div className="text-orange-500 font-bold mb-1">QUEUE DEPTH</div>
                    <div>{mempoolStats.pendingTxs.toLocaleString()} pending TXs</div>
                    <div>{mempoolStats.totalBlocks} blocks backlog</div>
                  </div>
                </div>
                <span className="text-[#252525] hidden sm:inline">│</span>
                <div className="flex items-center gap-2 group relative">
                  <span className="text-[#505050] text-xs border-b border-dotted border-[#505050] cursor-help">DSL</span>
                  {poolPriceLoading ? (
                    <span className="text-[#404040] animate-pulse">---</span>
                  ) : poolPrice !== null ? (
                    <span className={`text-orange-500 ${poolPriceFlash}`}>
                      {poolPrice.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[#404040]">---</span>
                  )}
                  <span className="text-[#404040] text-xs">sat</span>
                  <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-[#1a1a1a] border border-[#404040] text-sm text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-56 pointer-events-none z-50">
                    <div className="text-orange-500 font-bold mb-1">DIESEL SPOT PRICE</div>
                    <div>From DIESEL/frBTC pool</div>
                    <div>Updates every 5 min</div>
                  </div>
                </div>
              </>
            ) : null}
            {/* Status stats */}
            <span className="text-[#252525] hidden sm:inline">│</span>
            <div className="flex items-center gap-2 group relative">
              <span className="text-[#505050] text-xs border-b border-dotted border-[#505050] cursor-help">COMP</span>
              <span className="text-[#ff4444] font-bold">{Math.max(0, competition - Array.from(chainsMap.values()).reduce((sum, c) => sum + c.rbfData.chainLength, 0))}</span>
              <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-[#1a1a1a] border border-[#404040] text-sm text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-64 pointer-events-none z-50">
                <div className="text-orange-500 font-bold mb-1">EFFECTIVE COMPETITION</div>
                <div>Competing mints minus your chains</div>
                <div className="mt-1 text-[#707070]">Total detected: {competition}</div>
                <div className="text-[#707070]">Your TXs: {Array.from(chainsMap.values()).reduce((sum, c) => sum + c.rbfData.chainLength, 0)}</div>
              </div>
            </div>
            {isScanning ? (
              <span className="text-[#00d4ff] animate-pulse flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#00d4ff]"></span>SCAN
              </span>
            ) : detectedCompetition !== null ? (
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 bg-[#00d4ff] ${detectedCompetitionFlash}`}></span>
                <span className="text-[#00d4ff]">{detectedCompetition}</span>
                <span className="text-[#505050] text-xs">detected</span>
              </div>
            ) : null}
          </div>
          {/* Profit indicator */}
          <span className={`flex items-center gap-1.5 ${isProfitable ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
            <span className={`w-2 h-2 ${isProfitable ? 'bg-[#00ff88]' : 'bg-[#ff4444]'}`}></span>
            {isProfitable ? 'PROFIT' : 'LOSS'}
          </span>
        </div>
      </div>


      {/* Auto-mint panel */}
      {isConnected ? (
        <div className="mt-2 sm:mt-3 border border-[#252525] bg-[#0d0d0d]">
          <AutoMintPanel
            currentFeeRate={mempoolStats?.minFee || 0}
            currentEffectiveRate={currentEffectiveRate}
            hasActiveChain={!!mintResult && mintResult.txids.length > 0}
            chainLength={rbfData?.chainLength || 0}
            chainsCount={chainsMap.size}
            totalChainsTx={Array.from(chainsMap.values()).reduce((sum, c) => sum + c.rbfData.chainLength, 0)}
            isConnected={isConnected}
            isMinting={isMinting}
            isRbfing={isRbfing}
            blockReward={blockReward}
            dieselPrice={dieselPrice}
            competition={competition}
            onMint={handleMint}
            onRbf={handleRbf}
            onCpfp={handleCpfp}
          />
        </div>
      ) : (
        <div className="mt-3 border border-[#252525] bg-[#0d0d0d] p-4 text-center">
          <div className="text-[#505050] text-sm mb-3">CONNECT WALLET TO ENABLE AUTO-MINT</div>
          <button
            onClick={() => setShowConnectModal(true)}
            className="px-6 py-2 text-sm font-bold border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black tracking-wide transition-colors"
          >
            CONNECT
          </button>
        </div>
      )}

      {/* Active Chains List */}
      {isConnected && chainsMap.size > 0 && (
        <div className="mt-2 sm:mt-3 border border-[#252525] bg-[#0d0d0d] relative z-10 overflow-visible">
          <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-b border-[#252525] bg-[#0a0a0a]">
            <span className="text-xs sm:text-sm"><span className="text-orange-500 font-bold">3</span><span className="text-[#404040] mx-1">│</span><span className="text-[#e0e0e0] tracking-wide">PENDING</span></span>
            <span className="text-[#505050] text-xs">{chainsMap.size} CHAIN{chainsMap.size > 1 ? 'S' : ''}</span>
          </div>
          {/* Table header - outside scroll container for tooltips */}
          <div className="grid grid-cols-12 gap-2 px-2 sm:px-4 py-2 text-xs text-[#505050] border-b border-[#1a1a1a] bg-[#080808] uppercase tracking-wider">
            <div className="col-span-1 text-center group relative cursor-help">
              <span className="border-b border-dotted border-[#505050]">TX</span>
              <div className="absolute top-full left-0 mt-2 px-2 py-1.5 bg-[#1a1a1a] border border-[#404040] text-xs text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-32 pointer-events-none z-[100] normal-case">
                Transactions in chain (max 25)
              </div>
            </div>
            <div className="col-span-2 text-right group relative cursor-help">
              <span className="border-b border-dotted border-[#505050]">ROI</span>
              <div className="absolute top-full right-0 mt-2 px-2 py-1.5 bg-[#1a1a1a] border border-[#404040] text-xs text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-40 pointer-events-none z-[100] normal-case">
                Return on Investment (profit / cost × 100%)
              </div>
            </div>
            <div className="col-span-2 text-right group relative cursor-help">
              <span className="border-b border-dotted border-[#505050]">EXP</span>
              <div className="absolute top-full right-0 mt-2 px-2 py-1.5 bg-[#1a1a1a] border border-[#404040] text-xs text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-44 pointer-events-none z-[100] normal-case">
                Expected DIESEL emission share from block reward
              </div>
            </div>
            <div className="col-span-2 text-right group relative cursor-help">
              <span className="border-b border-dotted border-[#505050]">COST</span>
              <div className="absolute top-full right-0 mt-2 px-2 py-1.5 bg-[#1a1a1a] border border-[#404040] text-xs text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-36 pointer-events-none z-[100] normal-case">
                Total fees paid in satoshis
              </div>
            </div>
            <div className="col-span-2 text-right group relative cursor-help">
              <span className="border-b border-dotted border-[#505050]">P&L</span>
              <div className="absolute top-full right-0 mt-2 px-2 py-1.5 bg-[#1a1a1a] border border-[#404040] text-xs text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-40 pointer-events-none z-[100] normal-case">
                Profit/Loss in satoshis (emission × price - cost)
              </div>
            </div>
            <div className="col-span-1 text-right group relative cursor-help">
              <span className="border-b border-dotted border-[#505050]">RATE</span>
              <div className="absolute top-full right-0 mt-2 px-2 py-1.5 bg-[#1a1a1a] border border-[#404040] text-xs text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-40 pointer-events-none z-[100] normal-case">
                Effective fee rate (sat/vB). Red = below next block
              </div>
            </div>
            <div className="col-span-2 text-right">ACT</div>
          </div>
          {/* Chains list */}
          <div className="max-h-48 overflow-y-auto">
            {Array.from(chainsMap.entries()).map(([utxoKey, chainData]) => {
              const n = chainData.rbfData.chainLength;
              const effectiveRate = chainData.rbfData.totalVsize > 0
                ? chainData.rbfData.totalFees / chainData.rbfData.totalVsize
                : 0;
              const isLowFee = mempoolStats && effectiveRate < mempoolStats.minFee;
              const isSelected = currentChainUtxoKey === utxoKey;

              // Calculate chain metrics
              const pool = blockReward * 0.95; // 5% protocol fee
              const totalMints = n + competition;
              const emission = totalMints > 0 ? (n / totalMints) * pool : 0;
              const costSats = chainData.rbfData.totalFees;
              const costDiesel = dieselPrice > 0 ? costSats / dieselPrice : 0;
              const profitDiesel = emission - costDiesel;
              const profitSats = profitDiesel * dieselPrice;
              const roi = costSats > 0 ? (profitSats / costSats) * 100 : 0;
              const isProfitable = profitDiesel > 0;

              return (
                <div
                  key={utxoKey}
                  className={`grid grid-cols-12 gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm border-b border-[#151515] hover:bg-[#151515] ${
                    isSelected ? 'bg-[#0a1020] border-l-2 border-l-[#00d4ff]' : ''
                  }`}
                >
                  <div className={`col-span-1 text-center ${
                    n >= 25 ? 'text-[#ff4444]' : n >= 20 ? 'text-[#ffcc00]' : 'text-[#00ff88]'
                  }`}>
                    {n}<span className="text-[#303030]">/25</span>
                  </div>
                  <div className={`col-span-2 text-right font-bold ${roi >= 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
                    {roi >= 0 ? '+' : ''}{roi.toFixed(0)}%
                  </div>
                  <div className="col-span-2 text-right text-[#e0e0e0]">
                    {emission.toFixed(2)}<span className="text-[#404040] text-xs ml-1">D</span>
                  </div>
                  <div className="col-span-2 text-right text-[#e0e0e0]">
                    {costSats}<span className="text-[#404040] text-xs ml-1">s</span>
                  </div>
                  <div className={`col-span-2 text-right ${isProfitable ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
                    {profitSats >= 0 ? '+' : ''}{Math.round(profitSats)}<span className="text-[#404040] text-xs ml-1">s</span>
                  </div>
                  <div className={`col-span-1 text-right ${isLowFee ? 'text-[#ff4444]' : 'text-[#e0e0e0]'}`}>
                    {effectiveRate.toFixed(2)}
                    {isLowFee && <span className="text-[#ff4444]">▼</span>}
                  </div>
                  <div className="col-span-2 text-right">
                    <a
                      href={`https://mempool.space/tx/${chainData.cpfpData.lastTxid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 text-xs text-orange-500 border border-orange-500/30 hover:bg-orange-500/10 transition-colors"
                      title={utxoKey}
                    >
                      VIEW↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-2 sm:mt-3 text-xs text-[#404040] border-t border-[#1a1a1a] pt-2">
        <div className="tracking-wider">TURBO DIESEL TERMINAL <span className="text-[#505050] italic">v12</span></div>
      </div>

      {/* Connect Wallet Modal */}
      <TerminalConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onUnlock={handleUnlock}
        onRestore={handleRestore}
        onCreate={handleCreate}
        hasKeystore={hasStoredKeystore}
        isLoading={walletLoading}
        error={walletError}
      />

      {/* Deposit Modal */}
      {showDepositModal && address && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-orange-500/50 max-w-md w-full font-mono">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#252525] bg-[#0d0d0d]">
              <span className="text-orange-500 font-bold text-sm tracking-wide">WALLET MANAGER</span>
              <button
                onClick={() => { setShowDepositModal(false); setShowMnemonic(false); setSeedPassword(''); setSeedPasswordError(null); }}
                className="text-[#505050] hover:text-orange-500 text-sm"
              >
                [ESC]
              </button>
            </div>
            <div className="p-4">
              {/* Deposit Section */}
              <div className="text-[#505050] text-xs mb-2 tracking-wide">DEPOSIT ADDRESS</div>
              <div className="bg-[#050505] border border-[#252525] p-3 mb-3">
                <div className="text-[#00d4ff] text-sm break-all select-all">
                  {address}
                </div>
              </div>
              <button
                onClick={handleCopyAddress}
                className={`w-full py-2 border text-sm font-bold transition-colors mb-4 ${
                  depositCopied
                    ? 'border-[#00ff88] text-[#00ff88] bg-[#00ff88]/5'
                    : 'border-[#00d4ff]/50 text-[#00d4ff] hover:bg-[#00d4ff]/5'
                }`}
              >
                {depositCopied ? '✓ COPIED' : 'COPY ADDRESS'}
              </button>

              {/* Backup Section */}
              {wallet && (
                <div className="border-t border-[#252525] pt-4">
                  <div className="text-[#505050] text-xs mb-2 tracking-wide">BACKUP SEED</div>
                  {!showMnemonic ? (
                    <div>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="password"
                          value={seedPassword}
                          onChange={(e) => { setSeedPassword(e.target.value); setSeedPasswordError(null); }}
                          placeholder="Password to reveal"
                          className="flex-1 px-3 py-2 bg-[#050505] border border-[#252525] text-[#e0e0e0] text-sm outline-none focus:border-[#ffcc00]"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && seedPassword) {
                              // Verify by trying to get mnemonic
                              try {
                                const mnemonic = wallet.exportMnemonic();
                                if (mnemonic) {
                                  setShowMnemonic(true);
                                  setSeedPasswordError(null);
                                }
                              } catch {
                                setSeedPasswordError('Invalid password');
                              }
                            }
                          }}
                        />
                        <button
                          onClick={async () => {
                            if (!seedPassword) {
                              setSeedPasswordError('Enter password');
                              return;
                            }
                            setVerifyingSeedPassword(true);
                            try {
                              // Try to unlock with password to verify it's correct
                              await unlockWallet(seedPassword);
                              setShowMnemonic(true);
                              setSeedPasswordError(null);
                            } catch {
                              setSeedPasswordError('Invalid password');
                            } finally {
                              setVerifyingSeedPassword(false);
                            }
                          }}
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
                          onClick={() => {
                            navigator.clipboard.writeText(wallet.exportMnemonic());
                            setMnemonicCopied(true);
                            setTimeout(() => setMnemonicCopied(false), 2000);
                          }}
                          className={`flex-1 py-2 border text-sm font-bold transition-colors ${
                            mnemonicCopied
                              ? 'border-[#00ff88] text-[#00ff88] bg-[#00ff88]/5'
                              : 'border-[#ffcc00]/50 text-[#ffcc00] hover:bg-[#ffcc00]/5'
                          }`}
                        >
                          {mnemonicCopied ? '✓ COPIED' : 'COPY SEED'}
                        </button>
                        <button
                          onClick={() => { setShowMnemonic(false); setSeedPassword(''); }}
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

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { setShowDepositModal(false); setShowMnemonic(false); setSeedPassword(''); setSeedPasswordError(null); }}
                  className="flex-1 py-2 border border-[#252525] text-[#707070] text-sm hover:bg-[#151515]"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DieselTerminal;

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

  const rpcUrl = process.env.NEXT_PUBLIC_ALKANES_RPC_URL || "https://mainnet.subfrost.io/v4/subfrost";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="bg-gray-950 border border-orange-500/50 w-full max-w-md font-mono text-xs"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-orange-500/50 bg-orange-500/10">
          <span className="text-orange-500 font-bold">WALLET CONNECT</span>
          <button onClick={onClose} className="text-gray-500 hover:text-orange-500">
            [ESC]
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {view === 'main' && (
            <div className="space-y-3">
              <div className="text-gray-500 mb-4">SELECT ACTION:</div>
              <button
                onClick={() => setView('create')}
                className="w-full text-left px-3 py-2 border border-gray-800 hover:border-orange-500 hover:bg-orange-500/10 text-green-500"
              >
                {'>'} CREATE NEW WALLET
              </button>
              <button
                onClick={() => setView('restore')}
                className="w-full text-left px-3 py-2 border border-gray-800 hover:border-orange-500 hover:bg-orange-500/10 text-cyan-500"
              >
                {'>'} RESTORE FROM MNEMONIC
              </button>
              {hasKeystore && (
                <button
                  onClick={() => setView('unlock')}
                  className="w-full text-left px-3 py-2 border border-gray-800 hover:border-orange-500 hover:bg-orange-500/10 text-yellow-500"
                >
                  {'>'} UNLOCK EXISTING WALLET
                </button>
              )}
            </div>
          )}

          {view === 'unlock' && (
            <div className="space-y-3">
              <div className="text-gray-500">ENTER PASSWORD:</div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                placeholder="********"
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 text-green-500 outline-none focus:border-orange-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setView('main')}
                  className="px-3 py-1 border border-gray-700 text-gray-500 hover:text-orange-500 hover:border-orange-500"
                >
                  BACK
                </button>
                <button
                  onClick={handleUnlock}
                  disabled={isLoading || !password}
                  className="flex-1 px-3 py-1 border border-orange-500 text-orange-500 hover:bg-orange-500/20 disabled:opacity-50"
                >
                  {isLoading ? 'UNLOCKING...' : 'UNLOCK'}
                </button>
              </div>
            </div>
          )}

          {view === 'restore' && (
            <div className="space-y-3">
              <div className="text-gray-500">MNEMONIC PHRASE:</div>
              <textarea
                value={mnemonic}
                onChange={e => setMnemonic(e.target.value)}
                placeholder="word1 word2 word3 ..."
                rows={3}
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 text-cyan-500 outline-none focus:border-orange-500 resize-none"
                autoFocus
              />
              <div className="text-gray-500">PASSWORD (min 8 chars):</div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRestore()}
                placeholder="********"
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 text-green-500 outline-none focus:border-orange-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setView('main')}
                  className="px-3 py-1 border border-gray-700 text-gray-500 hover:text-orange-500 hover:border-orange-500"
                >
                  BACK
                </button>
                <button
                  onClick={handleRestore}
                  disabled={isLoading}
                  className="flex-1 px-3 py-1 border border-orange-500 text-orange-500 hover:bg-orange-500/20 disabled:opacity-50"
                >
                  {isLoading ? 'RESTORING...' : 'RESTORE'}
                </button>
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="space-y-3">
              <div className="text-gray-500">CREATE NEW WALLET</div>
              <div className="text-yellow-500/70 text-[10px] px-2 py-1 border border-yellow-500/30 bg-yellow-500/5">
                A new mnemonic phrase will be generated. Make sure to save it!
              </div>
              <div className="text-gray-500">PASSWORD (min 8 chars):</div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="********"
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 text-green-500 outline-none focus:border-orange-500"
                autoFocus
              />
              <div className="text-gray-500">CONFIRM PASSWORD:</div>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="********"
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 text-green-500 outline-none focus:border-orange-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setView('main')}
                  className="px-3 py-1 border border-gray-700 text-gray-500 hover:text-orange-500 hover:border-orange-500"
                >
                  BACK
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isLoading || password.length < 8}
                  className="flex-1 px-3 py-1 border border-green-500 text-green-500 hover:bg-green-500/20 disabled:opacity-50"
                >
                  {isLoading ? 'CREATING...' : 'CREATE WALLET'}
                </button>
              </div>
            </div>
          )}

          {view === 'showMnemonic' && (
            <div className="space-y-3">
              <div className="text-green-500 font-bold">WALLET CREATED!</div>
              <div className="text-red-500 text-[10px] px-2 py-1 border border-red-500/30 bg-red-500/5">
                ⚠ SAVE THIS MNEMONIC! It cannot be recovered if lost.
              </div>
              <div className="text-gray-500">YOUR MNEMONIC PHRASE:</div>
              <div
                className="bg-gray-900 border border-gray-800 px-3 py-2 text-cyan-500 font-mono text-xs break-all cursor-pointer hover:border-cyan-500"
                onClick={copyMnemonic}
              >
                {generatedMnemonic}
              </div>
              <button
                onClick={copyMnemonic}
                className={`w-full px-3 py-1 border ${mnemonicCopied ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-cyan-500 text-cyan-500 hover:bg-cyan-500/20'}`}
              >
                {mnemonicCopied ? '✓ COPIED!' : 'COPY MNEMONIC'}
              </button>
              <button
                onClick={onClose}
                className="w-full px-3 py-1 border border-orange-500 text-orange-500 hover:bg-orange-500/20"
              >
                I SAVED IT - CONTINUE
              </button>
            </div>
          )}

          {/* Error display */}
          {displayError && (
            <div className="mt-3 px-3 py-2 border border-red-500/50 bg-red-500/10 text-red-500">
              ERROR: {displayError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-gray-800 text-gray-600">
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
const RPC_URL = process.env.NEXT_PUBLIC_ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/subfrost';

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

        // Clear if: confirmed OR TX not found (RBF was replaced/evicted)
        const shouldClear = data.result?.status?.confirmed || data.error || !data.result;

        if (shouldClear) {
          // Chain is confirmed or TX disappeared, clear all chain data
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
        }
      } catch {
        // Ignore errors, will retry next interval
      }
    };

    // Check immediately
    checkConfirmation();

    // Then check every 30 seconds
    const interval = setInterval(checkConfirmation, 30000);
    return () => clearInterval(interval);
  }, [cpfpData?.lastTxid, refetchBalances, currentChainUtxoKey]);

  // Check ALL chains in chainsMap for confirmation and remove confirmed ones
  useEffect(() => {
    if (chainsMap.size === 0) return;

    const checkAllChains = async () => {
      const confirmedKeys: string[] = [];

      for (const [utxoKey, chainData] of chainsMap) {
        try {
          const res = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'esplora_tx',
              params: [chainData.cpfpData.lastTxid],
            }),
          });
          const data = await res.json();

          // Remove if: confirmed OR TX not found (RBF was replaced/evicted)
          if (data.result?.status?.confirmed || data.error || !data.result) {
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

    // Then check every 30 seconds
    const interval = setInterval(checkAllChains, 30000);
    return () => clearInterval(interval);
  }, [chainsMap.size, currentChainUtxoKey, refetchBalances]);

  const [blockReward, setBlockReward] = useState(3.15);
  const [dieselPrice, setDieselPrice] = useState(2991);
  const [txCost, setTxCost] = useState(3.92);
  const [competition, setCompetition] = useState(100);
  const [manualMints, setManualMints] = useState<number | null>(null);

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

  // Block height and time state
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
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

  // Fetch block height on mount and every 30 seconds
  useEffect(() => {
    fetchBlockHeight();
    const interval = setInterval(fetchBlockHeight, 30 * 1000);
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

  // Initial fetch and interval
  useEffect(() => {
    fetchMempool();
    const interval = setInterval(fetchMempool, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMempool]);

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
      minFee,
      maxFee,
      medianFee,
      totalBlocks: mempoolBlocks.length,
      pendingTxs: mempoolBlocks.reduce((sum, b) => sum + b.nTx, 0),
    };
  }, [mempoolBlocks]);

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

  const results = useMemo(() => {
    const R = blockReward || 0.001;
    const priceSats = dieselPrice || 1;
    const costSats = txCost || 0.001;
    // Subtract our active chain from competition only if we're competing for next block
    // (our effective rate >= mempool min fee)
    const ourChainLength = rbfData?.chainLength || 0;
    const weAreCompeting = currentEffectiveRate >= (mempoolStats?.minFee || 0);
    const chainToSubtract = weAreCompeting ? ourChainLength : 0;
    const M = Math.max(0, (competition || 0) - chainToSubtract);

    const DIESEL_FEE = 0.05;
    const dieselFeeDiesel = DIESEL_FEE;
    const pool = Math.max(0, R - dieselFeeDiesel);

    const Nstar = (R * priceSats) / (2 * costSats);

    // Calculate optimal mints from formula
    const rawOptimal = M > 0 ? Math.sqrt(Nstar * M) - M : 0;

    // Check if at least 1 mint is profitable: pool × price / (1 + M) > txCost
    const singleMintRevenue = (pool * priceSats) / (1 + M);
    const singleMintProfitable = singleMintRevenue > costSats;

    // Determine auto optimal: use formula if it gives >= 1, otherwise check single mint profitability
    let autoOptimal: number;
    if (rawOptimal >= 1) {
      autoOptimal = Math.round(rawOptimal);
    } else if (singleMintProfitable) {
      autoOptimal = 1; // Formula says 0, but 1 mint is still profitable
    } else {
      autoOptimal = 0;
    }

    const nOptimal = manualMints !== null ? manualMints : autoOptimal;
    const isManual = manualMints !== null;

    const txCostDiesel = costSats / priceSats;
    const totalMints = nOptimal + M;

    let emission = 0;
    let costDiesel = 0;

    if (nOptimal > 0 && totalMints > 0) {
      emission = (nOptimal / totalMints) * pool;
      costDiesel = nOptimal * txCostDiesel;
    }

    const netProfit = emission - costDiesel;
    const netProfitSats = netProfit * priceSats;
    const totalCostSats = nOptimal * costSats;
    // Real ROI based on actual profit/cost (what you actually earn/lose)
    const realRoi = totalCostSats > 0 ? (netProfitSats / totalCostSats) * 100 : 0;
    // Use real ROI for display (actual profit based on current settings)
    const roi = realRoi;
    const isProfitable = netProfit > 0;
    const breakevenM = Nstar / 4;
    const costPerDsl = emission > 0 ? (nOptimal * costSats) / emission : 0;
    const breakevenPriceSats = costPerDsl;

    const tableData = [1, 5, 10, 25, 50, 100, 250, 500, 1000].map(m => {
      const raw = m > 0 ? Math.sqrt(Nstar * m) - m : 0;
      const singleRev = (pool * priceSats) / (1 + m);
      const singleProf = singleRev > costSats;

      let n: number;
      if (raw >= 1) {
        n = Math.round(raw);
      } else if (singleProf) {
        n = 1;
      } else {
        n = 0;
      }

      const totalN = n + m;
      const em = n > 0 && totalN > 0 ? (n / totalN) * pool : 0;
      const cost = n * txCostDiesel;
      const pr = em - cost;
      const prSats = pr * priceSats;
      const costSatsRow = n * costSats;
      const r = costSatsRow > 0 ? (prSats / costSatsRow) * 100 : 0;
      return { m, n, roi: r, profit: pr, profitable: pr > 0 };
    });

    return {
      Nstar,
      nOptimal,
      autoOptimal,
      isManual,
      totalMints,
      roi,
      isProfitable,
      breakevenM,
      breakevenPriceSats,
      txCostDiesel,
      emission,
      costDiesel,
      netProfit,
      pool,
      dieselFeeDiesel,
      tableData
    };
  }, [blockReward, dieselPrice, txCost, competition, manualMints, rbfData?.chainLength, currentEffectiveRate, mempoolStats?.minFee]);

  const fmt = (n: number, d = 2) => {
    if (n === null || n === undefined || !isFinite(n)) return '---';
    if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(d) + 'M';
    if (Math.abs(n) >= 1000) return (n/1000).toFixed(d) + 'K';
    return n.toFixed(d);
  };

  const fmtInt = (n: number) => {
    if (n === null || n === undefined || !isFinite(n)) return '---';
    if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1000) return (n/1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  };

  const fmtPct = (n: number) => {
    if (n === null || n === undefined || !isFinite(n)) return '---';
    const sign = n >= 0 ? '+' : '';
    return sign + n.toFixed(2) + '%';
  };

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
    <div className="min-h-screen bg-black text-gray-300 font-mono p-3 text-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-orange-500/50 pb-1 mb-3">
        <div className="flex items-center gap-4">
          <span className="text-orange-500 font-bold text-lg">DIESEL</span>
          <span className="text-gray-500">TERMINAL</span>
          {blockHeight && (
            <span className="text-gray-600 text-xs flex items-center gap-2">
              <span>
                BLOCK <span className="text-cyan-500 font-mono">{blockHeight.toLocaleString()}</span>
                {blockElapsed !== null && (
                  <span className={`ml-1 ${blockElapsed > 1200 ? 'text-yellow-500' : blockElapsed > 600 ? 'text-orange-500' : 'text-green-500'}`}>
                    ({formatElapsed(blockElapsed)})
                  </span>
                )}
              </span>
              {avgBlockTime && (
                <span className="border-l border-gray-700 pl-2 group relative">
                  <span className="cursor-help border-b border-dotted border-gray-600">AVG</span>
                  <span className={`font-mono ml-1 ${avgBlockTime > 660 ? 'text-red-500' : avgBlockTime < 540 ? 'text-green-500' : 'text-gray-400'}`}>
                    {Math.floor(avgBlockTime / 60)}m {Math.floor(avgBlockTime % 60)}s
                  </span>
                  {blocksUntilAdjustment && (
                    <span className="text-gray-600 ml-1 cursor-help border-b border-dotted border-gray-700">({blocksUntilAdjustment} to adj)</span>
                  )}
                  <div className="absolute top-full left-0 mt-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-64 pointer-events-none z-50">
                    <div className="text-white mb-1">Average Block Time</div>
                    <div>Current period avg: {Math.floor(avgBlockTime / 60)}m {Math.floor(avgBlockTime % 60)}s</div>
                    <div>Target: 10m 0s</div>
                    {blocksUntilAdjustment && <div>{blocksUntilAdjustment} blocks until difficulty adjustment</div>}
                    <div className="mt-1">
                      {avgBlockTime > 660
                        ? <span className="text-red-500">● Slow — difficulty will decrease</span>
                        : avgBlockTime < 540
                          ? <span className="text-green-500">● Fast — difficulty will increase</span>
                          : <span className="text-gray-500">● Normal range</span>
                      }
                    </div>
                  </div>
                </span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-gray-600">
          {/* Balance display */}
          {isConnected ? (
            balances ? (
              <div className="flex items-center gap-3 border-r border-gray-700 pr-4 mr-2">
                <span className="text-yellow-500">
                  <span className="text-gray-500">BTC:</span> {formatBtcBalance(balances.btcBalance || 0)}
                </span>
                <span className="text-cyan-500">
                  <span className="text-gray-500">DSL:</span> {balances.tokens?.find((t: any) => t.runeId === '2:0')?.balanceFormatted?.toFixed(2) || '0.00'}
                </span>
                {balances.runes?.find((r: any) => r.spacedName === 'UNCOMMON•GOODS') && (
                  <span className="text-purple-400">
                    <span className="text-gray-500">UG:</span> {balances.runes.find((r: any) => r.spacedName === 'UNCOMMON•GOODS')?.balanceFormatted?.toLocaleString() || '0'}
                  </span>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowWalletMenu(!showWalletMenu)}
                    className="text-orange-500 hover:text-orange-400 border border-orange-500/50 hover:border-orange-400 px-2 py-0.5 transition-colors"
                  >
                    WALLET ▾
                  </button>
                  {showWalletMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowWalletMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 z-50 min-w-32">
                        <button
                          onClick={() => {
                            setShowDepositModal(true);
                            setShowWalletMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-green-500 hover:bg-gray-800 border-b border-gray-700"
                        >
                          ⚙ MANAGE
                        </button>
                        <button
                          onClick={() => {
                            setShowWalletMenu(false);
                            navigator.clipboard.writeText(address || '');
                            setDepositCopied(true);
                            setTimeout(() => setDepositCopied(false), 2000);
                          }}
                          className="w-full px-3 py-2 text-left text-cyan-500 hover:bg-gray-800 border-b border-gray-700"
                        >
                          {depositCopied ? '✓ COPIED' : '◫ COPY ADDRESS'}
                        </button>
                        <button
                          onClick={() => {
                            disconnect();
                            setMintResult(null);
                            setRbfData(null); setCpfpData(null);
                            setShowWalletMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-red-500 hover:bg-gray-800"
                        >
                          ✕ LOCK
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-gray-600 border-r border-gray-700 pr-4 mr-2">Loading...</span>
            )
          ) : (
            <button
              onClick={() => setShowConnectModal(true)}
              className="text-orange-500 hover:text-orange-400 border border-orange-500/50 hover:border-orange-400 px-2 py-0.5 rounded mr-2 transition-colors"
            >
              CONNECT WALLET
            </button>
          )}
          <span>{timestamp}</span>
          <span className="text-orange-500 flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            LIVE
          </span>
        </div>
      </div>

      {/* Mempool Status Bar */}
      <div className="mb-3 border border-gray-800 bg-gray-900/30">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-xs">MEMPOOL</span>
            {mempoolLoading ? (
              <span className="text-yellow-500 text-xs animate-pulse">LOADING...</span>
            ) : mempoolError ? (
              <span className="text-red-500 text-xs">ERROR: {mempoolError}</span>
            ) : mempoolStats ? (
              <>
                <div className="flex items-center gap-2 group relative">
                  <span className="text-gray-600 text-xs cursor-help border-b border-dotted border-gray-600">NEXT BLOCK</span>
                  <span className={`font-mono px-1 rounded ${minFeeFlash} ${feeCap !== null && mempoolStats.minFee > feeCap ? 'text-red-500 line-through' : 'text-cyan-500'}`}>
                    {mempoolStats.minFee.toFixed(2)}
                  </span>
                  {feeCap !== null && mempoolStats.minFee > feeCap && (
                    <span className="text-yellow-500 font-mono">→ {feeCap.toFixed(2)}</span>
                  )}
                  <span className="text-gray-600 text-xs">sat/vB</span>
                  <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-56 pointer-events-none z-10">
                    Next block: {mempoolStats.nextBlockTxs} txs, median {mempoolStats.medianFee.toFixed(2)} sat/vB, max {mempoolStats.maxFee.toFixed(1)} sat/vB
                  </div>
                </div>
                <div className="text-gray-600 text-xs">|</div>
                <div className="flex items-center gap-2 group relative">
                  <span className="text-gray-600 text-xs cursor-help border-b border-dotted border-gray-600">QUEUE</span>
                  <span className="text-purple-500 font-mono">{mempoolStats.totalBlocks}</span>
                  <span className="text-gray-600 text-xs">blocks</span>
                  <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-48 pointer-events-none z-10">
                    {mempoolStats.pendingTxs.toLocaleString()} pending transactions in {mempoolStats.totalBlocks} blocks
                  </div>
                </div>
                <div className="text-gray-600 text-xs">|</div>
                <div className="flex items-center gap-2 group relative">
                  <span className="text-gray-600 text-xs cursor-help border-b border-dotted border-gray-600">DSL/frBTC</span>
                  {poolPriceLoading ? (
                    <span className="text-gray-500 font-mono animate-pulse">---</span>
                  ) : poolPrice !== null ? (
                    <span className={`text-orange-500 font-mono px-1 rounded ${poolPriceFlash}`}>
                      {poolPrice.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-gray-500 font-mono">---</span>
                  )}
                  <span className="text-gray-600 text-xs">sats</span>
                  <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-56 pointer-events-none z-10">
                    Current DIESEL price from DIESEL/frBTC pool. Updates every 5 min.
                  </div>
                </div>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoFee(!autoFee)}
              className={`text-xs px-2 py-1 rounded border ${autoFee ? 'border-green-600 text-green-500 bg-green-900/20' : 'border-gray-700 text-gray-500'}`}
            >
              AUTO-FEE {autoFee ? 'ON' : 'OFF'}
            </button>
            <div className="flex items-center gap-1 group relative">
              <button
                onClick={() => setFeeCap(feeCap === null ? 5 : null)}
                className={`text-xs px-2 py-1 rounded-l border ${feeCap !== null ? 'border-yellow-600 text-yellow-500 bg-yellow-900/20' : 'border-gray-700 text-gray-500'}`}
              >
                CAP
              </button>
              {feeCap !== null && (
                <input
                  type="number"
                  step="0.1"
                  value={feeCap}
                  onChange={(e) => setFeeCap(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  className="w-20 text-xs px-2 py-1 bg-gray-900 border border-l-0 border-yellow-600 text-yellow-500 font-mono outline-none rounded-r"
                />
              )}
              {feeCap !== null && (
                <span className="text-gray-600 text-xs">sat/vB</span>
              )}
              <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-48 pointer-events-none z-10">
                {feeCap !== null
                  ? `Max fee: ${feeCap} sat/vB. If mempool > cap, uses cap.`
                  : 'Click to set max fee limit'}
              </div>
            </div>
            <button
              onClick={fetchMempool}
              className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-500 hover:text-orange-500 hover:border-orange-500"
            >
              REFRESH
            </button>
            {lastUpdate && (
              <span className="text-gray-600 text-xs">
                {lastUpdate.toLocaleTimeString('en-US', { hour12: false })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Left Panel - Inputs */}
        <div className="col-span-12 lg:col-span-3 border border-gray-800 overflow-hidden">
          <div className="bg-gray-900/50 px-2 py-1 border-b border-gray-800">
            <span className="text-orange-500 text-xs">1)</span> PARAMETERS
          </div>
          <div className="p-2 space-y-2">
            <div>
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Block Reward</div>
              <div className="flex items-center bg-gray-900/50 border border-gray-800">
                <input
                  type="number"
                  step="any"
                  value={blockReward}
                  onChange={(e) => setBlockReward(parseFloat(e.target.value) || 0)}
                  className="bg-transparent text-orange-500 font-mono text-sm p-2 w-full min-w-0 outline-none"
                />
                <span className="text-gray-600 text-xs px-2 border-l border-gray-800 shrink-0">DSL</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500 text-xs uppercase tracking-wider">DIESEL Target Price</span>
                {poolPrice !== null && (
                  <button
                    onClick={() => setDieselPrice(poolPrice)}
                    className="text-xs text-orange-500 hover:text-orange-400 border border-orange-500/50 hover:border-orange-400 px-1.5 py-0.5 rounded"
                  >
                    POOL: {poolPrice.toLocaleString()}
                  </button>
                )}
              </div>
              <div className="flex items-center bg-gray-900/50 border border-gray-800">
                <input
                  type="number"
                  step="any"
                  value={dieselPrice}
                  onChange={(e) => setDieselPrice(parseFloat(e.target.value) || 0)}
                  className="bg-transparent text-cyan-500 font-mono text-sm p-2 w-full min-w-0 outline-none"
                />
                <span className="text-gray-600 text-xs px-2 border-l border-gray-800 shrink-0">sats</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500 text-xs uppercase tracking-wider">TX Cost (per mint)</span>
                {autoFee && mempoolStats && (
                  <span className={`text-xs ${feeCap !== null && mempoolStats.minFee > feeCap ? 'text-yellow-500' : 'text-green-500'}`}>
                    ● {feeCap !== null && mempoolStats.minFee > feeCap ? 'CAPPED' : 'LIVE'}
                  </span>
                )}
              </div>
              <div className={`flex items-center bg-gray-900/50 border rounded ${txCostFlash} ${
                autoFee
                  ? (feeCap !== null && mempoolStats && mempoolStats.minFee > feeCap ? 'border-yellow-800' : 'border-green-800')
                  : 'border-gray-800'
              }`}>
                <input
                  type="number"
                  step="any"
                  value={txCost}
                  onChange={(e) => {
                    setAutoFee(false);
                    setTxCost(parseFloat(e.target.value) || 0);
                  }}
                  className={`bg-transparent font-mono text-sm p-2 w-full min-w-0 outline-none ${
                    autoFee
                      ? (feeCap !== null && mempoolStats && mempoolStats.minFee > feeCap ? 'text-yellow-500' : 'text-green-500')
                      : 'text-yellow-500'
                  }`}
                />
                <span className="text-gray-600 text-xs px-2 border-l border-gray-800 shrink-0">sats</span>
              </div>
              <div className="text-gray-600 text-xs mt-1">
                = {(txCost / TX_VSIZE).toFixed(2)} sat/vB × {TX_VSIZE} vB
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500 text-xs uppercase tracking-wider">Competition (M)</span>
                <div className="flex items-center gap-2">
                  {/* Show effective M when we have active chain and are competing */}
                  {rbfData && rbfData.chainLength > 0 && currentEffectiveRate >= (mempoolStats?.minFee || 0) && (
                    <span className="text-xs text-purple-400" title="Effective M = scanned - our chain">
                      eff: {Math.max(0, competition - rbfData.chainLength)}
                    </span>
                  )}
                  {isScanning ? (
                    <span className="text-xs text-cyan-500 animate-pulse">
                      ● SCANNING...
                    </span>
                  ) : detectedCompetition !== null ? (
                    <span className={`text-xs px-1 rounded ${detectedCompetitionFlash} text-cyan-500`}>
                      ● {detectedCompetition} detected
                    </span>
                  ) : null}
                </div>
              </div>
              <div className={`flex items-center bg-gray-900/50 border border-gray-800 rounded ${competitionFlash}`}>
                <input
                  type="number"
                  step="1"
                  value={competition}
                  onChange={(e) => {
                    setAutoCompetition(false);
                    setCompetition(parseInt(e.target.value) || 0);
                  }}
                  className="bg-transparent text-red-500 font-mono text-sm p-2 w-full min-w-0 outline-none"
                />
                <span className="text-gray-600 text-xs px-2 border-l border-gray-800 shrink-0">mints</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 px-2 py-1 border-y border-gray-800">
            <span className="text-orange-500 text-xs">2)</span> DERIVED
          </div>
          <div className="p-2 space-y-1">
            <div className="flex justify-between group relative">
              <span className="text-gray-500 text-xs cursor-help border-b border-dotted border-gray-600">N* THRESHOLD</span>
              <span className="text-orange-500 font-mono">{fmtInt(results.Nstar)}</span>
              <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-56 pointer-events-none z-10">
                N* = R×p/(2×f) = {blockReward}×{dieselPrice}/(2×{txCost}) = {(blockReward * dieselPrice / (2 * txCost)).toFixed(2)}. Profitable when M {'<'} N*/4 = {(results.Nstar/4).toFixed(1)}
              </div>
            </div>
            <div className="flex justify-between group relative">
              <span className="text-gray-500 text-xs cursor-help border-b border-dotted border-gray-600">BREAKEVEN M</span>
              <span className="text-gray-400 font-mono">{fmtInt(results.breakevenM)}</span>
              <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-48 pointer-events-none z-10">
                N*/4 = {fmtInt(results.breakevenM)}. If competition is higher — minting is unprofitable at current price.
              </div>
            </div>
            <div className="flex justify-between group relative">
              <span className="text-gray-500 text-xs cursor-help border-b border-dotted border-gray-600">MINT COST</span>
              <span className="text-yellow-500 font-mono">{fmt(results.txCostDiesel, 6)} DSL</span>
              <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-48 pointer-events-none z-10">
                Cost of 1 mint in DIESEL: {txCost} sats ÷ {dieselPrice} sats = {fmt(results.txCostDiesel, 6)} DSL
              </div>
            </div>
            {results.nOptimal > 0 && (
              <div className="flex justify-between group relative mt-2 pt-2 border-t border-gray-800">
                <span className={`text-xs cursor-help border-b border-dotted ${results.netProfit >= 0 ? 'text-green-400 border-green-600' : 'text-red-400 border-red-600'}`}>MIN PRICE</span>
                <span className={`font-mono ${results.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtInt(results.breakevenPriceSats)} sats</span>
                <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-52 pointer-events-none z-10">
                  Cost per 1 DSL = Cost/Emission. At price above {fmtInt(results.breakevenPriceSats)} sats — profitable.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Panel - Main Output */}
        <div className="col-span-12 lg:col-span-5 border border-gray-800">
          <div className="bg-gray-900/50 px-2 py-1 border-b border-gray-800 flex items-center justify-between">
            <div>
              <span className="text-orange-500 text-xs">3)</span> EXECUTION
            </div>
            <div className={`text-xs font-mono ${results.isProfitable ? 'text-green-500' : 'text-red-500'}`}>
              {results.isProfitable ? '● PROFITABLE' : '● UNPROFITABLE'}
            </div>
          </div>

          {/* Main execution grid */}
          <div className="grid grid-cols-2 border-b border-gray-800">
            {/* Left: Mints input */}
            <div className="p-3 border-r border-gray-800 group relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500 text-xs cursor-help border-b border-dotted border-gray-600">MINTS (n*)</span>
                {results.isManual && (
                  <button
                    onClick={() => setManualMints(null)}
                    className="text-xs text-orange-500 hover:text-orange-400"
                  >
                    [AUTO:{results.autoOptimal}]
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={results.nOptimal}
                  onChange={(e) => setManualMints(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`text-2xl font-bold font-mono bg-transparent w-20 outline-none ${results.isProfitable ? 'text-green-500' : results.nOptimal > 0 ? 'text-orange-500' : 'text-gray-600'}`}
                />
                <span className="text-gray-600 text-xs">TX</span>
              </div>
              <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-52 pointer-events-none z-10">
                {results.isManual
                  ? `Manual mode. Optimal = ${results.autoOptimal}. Click [AUTO] to reset.`
                  : `Optimal mints at M=${competition}. Edit to override.`
                }
              </div>
            </div>
            {/* Right: Cost */}
            <div className="p-3 group relative">
              <div className="text-gray-500 text-xs mb-1 cursor-help border-b border-dotted border-gray-600 inline-block">TOTAL COST</div>
              <div className="text-2xl font-bold font-mono text-yellow-500">
                {fmtInt(results.nOptimal * txCost)}
                <span className="text-sm text-gray-600 ml-1">sats</span>
              </div>
              <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-44 pointer-events-none z-10">
                {results.nOptimal} × {fmt(txCost, 2)} = {fmtInt(results.nOptimal * txCost)} sats
              </div>
            </div>
          </div>

          {/* ROI / Profit row */}
          <div className="grid grid-cols-3 border-b border-gray-800 text-center">
            <div className="p-2 border-r border-gray-800 group relative">
              <div className="text-gray-600 text-xs cursor-help border-b border-dotted border-gray-600 inline-block">ROI</div>
              <div className={`text-lg font-mono font-bold ${results.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {fmtPct(results.roi)}
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-48 pointer-events-none z-10 text-left">
                Return on Investment = Profit / Cost = {fmtInt(results.netProfit * dieselPrice)} / {fmtInt(results.nOptimal * txCost)} sats
              </div>
            </div>
            <div className="p-2 border-r border-gray-800 group relative">
              <div className="text-gray-600 text-xs cursor-help border-b border-dotted border-gray-600 inline-block">NET PROFIT</div>
              <div className={`text-lg font-mono font-bold ${results.netProfit >= 0 ? 'text-cyan-500' : 'text-red-500'}`}>
                {results.netProfit >= 0 ? '+' : ''}{fmtInt(results.netProfit * dieselPrice)} <span className="text-xs text-gray-600">sats</span>
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-52 pointer-events-none z-10 text-left">
                (Emission - Cost) × price = ({fmt(results.emission, 4)} - {fmt(results.costDiesel, 4)}) × {dieselPrice}
              </div>
            </div>
            <div className="p-2 group relative">
              <div className="text-gray-600 text-xs cursor-help border-b border-dotted border-gray-600 inline-block">EMISSION</div>
              <div className="text-lg font-mono font-bold text-purple-400">
                {fmt(results.emission, 2)} <span className="text-xs text-gray-600">DSL</span>
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-44 pointer-events-none z-10 text-left">
                (n*/N) × pool = ({results.nOptimal}/{results.totalMints}) × {fmt(results.pool, 2)}
              </div>
            </div>
          </div>

          {/* Active chain / Mint controls */}
          <div className="p-2 bg-gray-900/30">
            {/* Error display */}
            {mintError && (
              <div className="mb-2 px-2 py-1 border-l-2 border-red-500 bg-red-500/10 text-red-500 text-xs">
                {mintError}
              </div>
            )}

            {/* Active chain info */}
            {mintResult && (
              <div className="mb-2 border border-gray-700 bg-gray-900/50">
                <div className="flex items-center justify-between px-2 py-1 border-b border-gray-700 bg-gray-800/50">
                  <span className="text-gray-400 text-xs">ACTIVE CHAIN</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://mempool.space/tx/${mintResult.txids[mintResult.txids.length - 1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-500 hover:text-cyan-400 text-xs"
                    >
                      VIEW ↗
                    </a>
                    <button
                      onClick={() => { setRbfData(null); setCpfpData(null); setMintResult(null); setRbfFeeRate(''); }}
                      className="text-gray-500 hover:text-red-400 text-xs"
                    >
                      [CLEAR]
                    </button>
                  </div>
                </div>
                <div className="px-2 py-1 grid grid-cols-3 gap-2 text-xs">
                  <div className="group relative">
                    <span className="text-gray-500 cursor-help border-b border-dotted border-gray-600">TXs:</span>
                    <span className={`ml-1 font-mono ${
                      mintResult.txids.length >= 25 ? 'text-red-500' :
                      mintResult.txids.length >= 20 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {mintResult.txids.length}<span className="text-gray-600">/25</span>
                    </span>
                    <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-44 pointer-events-none z-10">
                      Chain length. Max 25 unconfirmed TXs allowed.
                    </div>
                  </div>
                  <div className="group relative">
                    <span className="text-gray-500 cursor-help border-b border-dotted border-gray-600">FEES:</span>
                    <span className="text-yellow-500 ml-1 font-mono">{mintResult.totalFee}</span>
                    <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-36 pointer-events-none z-10">
                      Total fees (sats)
                    </div>
                  </div>
                  <div className="group relative">
                    <span className="text-gray-500 cursor-help border-b border-dotted border-gray-600">RATE:</span>
                    <span className={`ml-1 font-mono ${mempoolStats && currentEffectiveRate < mempoolStats.minFee ? 'text-red-500' : 'text-cyan-500'}`}>
                      {currentEffectiveRate.toFixed(2)}
                      {mempoolStats && currentEffectiveRate < mempoolStats.minFee && ' ▼'}
                    </span>
                    <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-44 pointer-events-none z-10">
                      Effective rate (sat/vB) = {mintResult.totalFee} / {mintResult.txids.length * TX_VSIZE} vB
                    </div>
                  </div>
                </div>
                {/* Low fee warning */}
                {mempoolStats && currentEffectiveRate < mempoolStats.minFee && rbfData && rbfData.totalVsize > 0 && (
                  <div className="px-2 py-1 border-t border-red-500/30 bg-red-500/10 flex items-center justify-between">
                    <span className="text-red-500 text-xs">
                      ⚠ LOW FEE: {currentEffectiveRate.toFixed(2)} {'<'} {mempoolStats.minFee.toFixed(2)} sat/vB
                    </span>
                    <button
                      onClick={() => {
                        setRbfFeeRate(mempoolStats.minFee.toFixed(2));
                      }}
                      className="px-2 py-0.5 bg-red-500/20 border border-red-500/50 text-red-400 text-xs hover:bg-red-500/30"
                    >
                      BUMP → {mempoolStats.minFee.toFixed(2)}
                    </button>
                  </div>
                )}
                {/* Fee bump controls (RBF & CPFP) */}
                {rbfData && rbfData.totalVsize > 0 && (
                  <div className="border-t border-gray-700">
                    {/* Header */}
                    <div className="px-3 py-1.5 bg-gray-800/30 border-b border-gray-700 flex items-center justify-between">
                      <span className="text-gray-400 text-xs font-bold">FEE BUMP</span>
                      <span className="text-gray-500 text-xs">target rate (sat/vB):</span>
                      <input
                        type="number"
                        step="0.01"
                        value={rbfFeeRate}
                        onChange={(e) => setRbfFeeRate(e.target.value)}
                        placeholder={currentEffectiveRate.toFixed(2)}
                        className="w-20 px-2 py-1 bg-gray-900 border border-gray-600 text-cyan-400 font-mono text-xs outline-none focus:border-cyan-500 text-center"
                        disabled={isRbfing}
                      />
                    </div>

                    {/* RBF row */}
                    <div className="px-3 py-2 flex items-center gap-3 border-b border-gray-800">
                      <span className="text-yellow-500 text-xs font-bold w-12">RBF</span>
                      <span className="text-gray-500 text-xs group relative cursor-help border-b border-dotted border-gray-600">
                        Replace last TX
                        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-56 pointer-events-none z-10 font-normal">
                          Replace-By-Fee: replaces last TX with higher fee version. Same chain length.
                        </div>
                      </span>
                      <span className="text-gray-600 text-xs">
                        min: <span className="text-yellow-500/70">{minEffectiveRate.toFixed(2)}</span>
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        {mempoolStats && (
                          <button
                            onClick={() => {
                              const targetRate = Math.max(mempoolStats.minFee * 1.1, minEffectiveRate);
                              handleRbf(targetRate);
                            }}
                            disabled={isRbfing}
                            className="px-2 py-1 bg-green-500/20 text-green-500 text-xs font-bold disabled:opacity-50 border-2 border-t-green-300/60 border-l-green-300/60 border-b-green-900 border-r-green-900 active:border-t-green-900 active:border-l-green-900 active:border-b-green-300/60 active:border-r-green-300/60 hover:bg-green-500/30"
                          >
                            +10%
                          </button>
                        )}
                        <button
                          onClick={() => handleRbf()}
                          disabled={isRbfing || !rbfFeeRate}
                          className="px-3 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-bold disabled:opacity-50 border-2 border-t-yellow-300/60 border-l-yellow-300/60 border-b-yellow-900 border-r-yellow-900 active:border-t-yellow-900 active:border-l-yellow-900 active:border-b-yellow-300/60 active:border-r-yellow-300/60 hover:bg-yellow-500/30"
                        >
                          {isRbfing ? 'REPLACING...' : 'REPLACE'}
                        </button>
                      </div>
                    </div>

                    {/* CPFP row */}
                    {cpfpData && (
                      <div className="px-3 py-2 flex items-center gap-3">
                        <span className="text-purple-500 text-xs font-bold w-12">CPFP</span>
                        <span className="text-gray-500 text-xs group relative cursor-help border-b border-dotted border-gray-600">
                          Add child TX
                          <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-56 pointer-events-none z-10 font-normal">
                            Child-Pays-For-Parent: adds new TX to pull up package rate. +1 mint.
                          </div>
                        </span>
                        <span className={`text-xs font-mono group relative cursor-help border-b border-dotted ${
                          (25 - (rbfData?.chainLength || 0)) <= 3
                            ? 'text-red-500 border-red-500/50'
                            : (25 - (rbfData?.chainLength || 0)) <= 10
                              ? 'text-yellow-500 border-yellow-500/50'
                              : 'text-gray-500 border-gray-600'
                        }`}>
                          [{25 - (rbfData?.chainLength || 0)}/25]
                          <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-48 pointer-events-none z-10 font-normal">
                            Remaining slots (max 25 TXs)
                          </div>
                        </span>
                        {cpfpPreview && (
                          <span className="text-gray-500 text-xs">
                            → <span className="text-purple-400">{cpfpPreview.actualRate.toFixed(2)}</span>
                            <span className="text-gray-600 ml-1">(+{cpfpPreview.actualChildFee} sats)</span>
                          </span>
                        )}
                        <div className="ml-auto">
                          {(25 - (rbfData?.chainLength || 0)) > 0 ? (
                            <button
                              onClick={() => handleCpfp()}
                              disabled={isRbfing || !rbfFeeRate}
                              className="px-3 py-1 bg-purple-500/20 text-purple-500 text-xs font-bold disabled:opacity-50 border-2 border-t-purple-300/60 border-l-purple-300/60 border-b-purple-900 border-r-purple-900 active:border-t-purple-900 active:border-l-purple-900 active:border-b-purple-300/60 active:border-r-purple-300/60 hover:bg-purple-500/30"
                            >
                              {isRbfing ? 'ADDING...' : 'ADD CHILD'}
                            </button>
                          ) : (
                            <span className="text-red-500/70 text-xs">CHAIN FULL</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* UTXO selector */}
            {isConnected && (
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <button
                    onClick={() => {
                      setShowUtxoSelector(!showUtxoSelector);
                      if (!showUtxoSelector && availableUtxos.length === 0) {
                        fetchUtxos();
                      }
                    }}
                    className="text-gray-500 hover:text-cyan-400"
                  >
                    {showUtxoSelector ? '▼' : '▶'} UTXO {selectedUtxo ? `(${(selectedUtxo.value / 100000000).toFixed(8)} BTC)` : '(auto)'}
                    {chainsMap.size > 0 && <span className="text-purple-400 ml-1">[{chainsMap.size} chain{chainsMap.size > 1 ? 's' : ''}]</span>}
                  </button>
                  {selectedUtxo && (
                    <button
                      onClick={() => setSelectedUtxo(null)}
                      className="text-gray-600 hover:text-red-400"
                    >
                      [clear]
                    </button>
                  )}
                </div>
                {showUtxoSelector && (
                  <div className="border border-gray-700 bg-gray-900/50 max-h-48 overflow-y-auto">
                    {/* Active chains section */}
                    {chainsMap.size > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] text-purple-400 bg-purple-900/20 border-b border-gray-700">
                          ACTIVE CHAINS
                        </div>
                        {Array.from(chainsMap.entries()).map(([utxoKey, chainData]) => {
                          const isSelected = currentChainUtxoKey === utxoKey;
                          const effectiveRate = chainData.rbfData.totalFees / chainData.rbfData.totalVsize;
                          return (
                            <button
                              key={`chain-${utxoKey}`}
                              onClick={() => {
                                // Load this chain's data
                                setMintResult(chainData.mintResult);
                                setRbfData(chainData.rbfData);
                                setCpfpData(chainData.cpfpData);
                                setCurrentChainUtxoKey(utxoKey);
                                // Clear selectedUtxo to prevent useEffect from overwriting chain data
                                setSelectedUtxo(null);
                                // Don't close selector - user may want to switch between chains
                              }}
                              className={`w-full px-2 py-1 text-xs text-left hover:bg-gray-800 flex justify-between items-center ${
                                isSelected
                                  ? 'bg-purple-900/40 text-purple-300'
                                  : 'bg-purple-900/20 text-purple-400'
                              }`}
                            >
                              <span className="font-mono truncate" style={{ maxWidth: '100px' }}>
                                {utxoKey.split(':')[0].slice(0, 8)}...
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="text-purple-300">
                                  {chainData.rbfData.chainLength}tx
                                </span>
                                <span className="text-gray-500">
                                  {effectiveRate.toFixed(2)} sat/vB
                                </span>
                                <span className="text-yellow-500">
                                  {chainData.rbfData.totalFees} sats
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </>
                    )}

                    {/* Available UTXOs section */}
                    <div className="px-2 py-1 text-[10px] text-gray-500 bg-gray-800/50 border-b border-gray-700">
                      {chainsMap.size > 0 ? 'NEW CHAIN FROM UTXO' : 'AVAILABLE UTXOS'}
                    </div>
                    {loadingUtxos ? (
                      <div className="p-2 text-xs text-gray-500">Loading UTXOs...</div>
                    ) : availableUtxos.length === 0 ? (
                      <div className="p-2 text-xs text-gray-500">No UTXOs available</div>
                    ) : (
                      availableUtxos.map((utxo) => {
                        const utxoKey = `${utxo.txid}:${utxo.vout}`;
                        const hasChain = chainsMap.has(utxoKey);
                        const chainData = hasChain ? chainsMap.get(utxoKey) : null;
                        return (
                          <button
                            key={utxoKey}
                            onClick={() => {
                              setSelectedUtxo(utxo);
                              setShowUtxoSelector(false);
                            }}
                            className={`w-full px-2 py-1 text-xs text-left hover:bg-gray-800 flex justify-between items-center ${
                              selectedUtxo?.txid === utxo.txid && selectedUtxo?.vout === utxo.vout
                                ? 'bg-cyan-900/30 text-cyan-400'
                                : hasChain
                                  ? 'bg-purple-900/20 text-purple-300'
                                  : 'text-gray-400'
                            }`}
                          >
                            <span className="font-mono truncate" style={{ maxWidth: '140px' }}>
                              {utxo.txid.slice(0, 8)}...:{utxo.vout}
                            </span>
                            <span className="flex items-center gap-2">
                              {hasChain && chainData && (
                                <span className="text-purple-400 text-[10px]">
                                  {chainData.rbfData.chainLength}tx
                                </span>
                              )}
                              <span className="text-yellow-500">
                                {utxo.value.toLocaleString()}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {isConnected ? (
                <>
                  {!mintResult && !isMinting && (
                    <button
                      onClick={detectExistingChain}
                      className="flex-1 py-1.5 text-xs border border-gray-700 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50"
                    >
                      DETECT CHAIN
                    </button>
                  )}
                  <button
                    onClick={() => handleMint(results.nOptimal, txCost / TX_VSIZE)}
                    disabled={isMinting || results.nOptimal <= 0}
                    className={`flex-1 py-1.5 text-xs font-bold transition-colors border-2 ${
                      isMinting
                        ? 'bg-yellow-500/10 text-yellow-500 border-t-yellow-300/60 border-l-yellow-300/60 border-b-yellow-900 border-r-yellow-900'
                        : results.nOptimal > 0
                          ? results.isProfitable
                            ? 'bg-green-500/10 text-green-500 border-t-green-300/60 border-l-green-300/60 border-b-green-900 border-r-green-900 hover:bg-green-500/20 active:border-t-green-900 active:border-l-green-900 active:border-b-green-300/60 active:border-r-green-300/60'
                            : 'bg-orange-500/10 text-orange-500 border-t-orange-300/60 border-l-orange-300/60 border-b-orange-900 border-r-orange-900 hover:bg-orange-500/20 active:border-t-orange-900 active:border-l-orange-900 active:border-b-orange-300/60 active:border-r-orange-300/60'
                          : 'bg-gray-800/50 text-gray-600 border-t-gray-600 border-l-gray-600 border-b-gray-900 border-r-gray-900 cursor-not-allowed'
                    }`}
                  >
                    {isMinting
                      ? `MINTING ${mintProgress.current}/${mintProgress.total}`
                      : results.nOptimal > 0
                        ? `MINT ${results.nOptimal} TX`
                        : 'n* = 0'
                    }
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="flex-1 py-1.5 text-xs font-bold border border-orange-500/50 text-orange-500 bg-orange-500/10 hover:bg-orange-500/20"
                >
                  CONNECT WALLET
                </button>
              )}
            </div>
          </div>

          {/* Details row */}
          <div className="grid grid-cols-4 border-t border-gray-800 text-xs">
            <div className="p-2 border-r border-gray-800 group relative">
              <span className="text-gray-600 cursor-help border-b border-dotted border-gray-600">POOL</span>
              <div className="text-purple-400 font-mono">{fmt(results.pool, 3)}</div>
              <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-44 pointer-events-none z-10">
                R - fee = {blockReward} - {fmt(results.dieselFeeDiesel, 2)} = {fmt(results.pool, 3)} DSL
              </div>
            </div>
            <div className="p-2 border-r border-gray-800 group relative">
              <span className="text-gray-600 cursor-help border-b border-dotted border-gray-600">FEE</span>
              <div className="text-gray-500 font-mono">{fmt(results.dieselFeeDiesel, 2)}</div>
              <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-40 pointer-events-none z-10">
                DIESEL protocol fee (5% of block reward)
              </div>
            </div>
            <div className="p-2 border-r border-gray-800 group relative">
              <span className="text-gray-600 cursor-help border-b border-dotted border-gray-600">COST/DSL</span>
              <div className="text-yellow-500 font-mono">{results.emission > 0 ? fmtInt((results.nOptimal * txCost) / results.emission) : '---'}</div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-44 pointer-events-none z-10">
                Cost per 1 DSL = {fmtInt(results.nOptimal * txCost)} / {fmt(results.emission, 3)} sats
              </div>
            </div>
            <div className="p-2 group relative">
              <span className="text-gray-600 cursor-help border-b border-dotted border-gray-600">MIN PRICE</span>
              <div className={`font-mono ${results.isProfitable ? 'text-green-500' : 'text-red-500'}`}>{fmtInt(results.breakevenPriceSats)}</div>
              <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity w-48 pointer-events-none z-10">
                Breakeven price. Profitable when DSL {'>'} {fmtInt(results.breakevenPriceSats)} sats
              </div>
            </div>
          </div>

          {/* Formula */}
          <div className="border-t border-gray-800 px-2 py-1 bg-gray-900/50 text-xs">
            <span className="text-gray-600">n* = √(N*·M) - M = </span>
            <span className="text-orange-500/80">√({fmtInt(results.Nstar)}×{competition}) - {competition}</span>
            <span className="text-gray-600"> = </span>
            <span className="text-white font-bold">{results.autoOptimal}</span>
            {results.isManual && <span className="text-gray-500 ml-2">(manual: {results.nOptimal})</span>}
          </div>
        </div>

        {/* Right Panel - Table */}
        <div className="col-span-12 lg:col-span-4 border border-gray-800">
          <div className="bg-gray-900/50 px-2 py-1 border-b border-gray-800">
            <span className="text-orange-500 text-xs">4)</span> STRATEGY MATRIX
          </div>

          <div className="grid grid-cols-4 text-xs border-b border-gray-800 bg-gray-900/30">
            <div className="p-2 text-gray-500">M</div>
            <div className="p-2 text-gray-500 text-right">n*</div>
            <div className="p-2 text-gray-500 text-right">ROI</div>
            <div className="p-2 text-gray-500 text-right">PROFIT</div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
            {results.tableData.map((row, i) => (
              <div
                key={row.m}
                className={`grid grid-cols-4 text-xs border-b border-gray-800/50 ${row.m === competition ? 'bg-orange-500/20 border-l-2 border-l-orange-500' : i % 2 === 0 ? 'bg-gray-900/20' : ''}`}
              >
                <div className="p-2 text-gray-400">{row.m}</div>
                <div className={`p-2 text-right ${row.profitable ? 'text-orange-500' : 'text-gray-600'}`}>{row.n}</div>
                <div className={`p-2 text-right ${row.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {fmtPct(row.roi)}
                </div>
                <div className={`p-2 text-right ${row.profitable ? 'text-cyan-500' : 'text-gray-600'}`}>{fmt(row.profit, 3)}</div>
              </div>
            ))}
          </div>

          <div className="p-2 text-xs text-gray-600 border-t border-gray-800">
            <span className="text-orange-500">▌</span> CURRENT M={competition}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="mt-3 border border-gray-800 p-2 grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-gray-600">THRESHOLD </span>
          <span className="text-orange-500">N* = Rp/2f</span>
        </div>
        <div>
          <span className="text-gray-600">OPTIMAL </span>
          <span className="text-orange-500">n* = √(N*M) - M</span>
        </div>
        <div>
          <span className="text-gray-600">BREAKEVEN </span>
          <span className="text-orange-500">M {'<'} N*/4</span>
        </div>
        <div>
          <span className="text-gray-600">MIN PRICE </span>
          <span className="text-orange-500">p {'>'} 8fM/R</span>
        </div>
      </div>

      {/* Auto-mint panel */}
      {isConnected && (
        <div className="mt-2 border border-gray-700 bg-gray-900/50">
          <AutoMintPanel
            currentFeeRate={mempoolStats?.minFee || 0}
            currentEffectiveRate={currentEffectiveRate}
            hasActiveChain={!!mintResult && mintResult.txids.length > 0}
            chainLength={rbfData?.chainLength || 0}
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
      )}

      <div className="mt-2 flex justify-between text-xs text-gray-600 border-t border-gray-800 pt-2">
        <div>TURBO DIESEL TERMINAL v12</div>
        <div className="flex gap-6">
          <span>N*=<span className="text-orange-500">{fmtInt(results.Nstar)}</span></span>
          <span>
            M=<span className="text-red-500">{competition}</span>
            {rbfData && rbfData.chainLength > 0 && currentEffectiveRate >= (mempoolStats?.minFee || 0) && (
              <span className="text-purple-400">-{rbfData.chainLength}={Math.max(0, competition - rbfData.chainLength)}</span>
            )}
          </span>
          <span className={results.isProfitable ? 'text-green-500' : 'text-red-500'}>
            ● {results.isProfitable ? 'PROFITABLE' : 'UNPROFITABLE'}
          </span>
        </div>
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-orange-500/50 max-w-md w-full">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-800/50">
              <span className="text-orange-500 font-bold">WALLET</span>
              <button
                onClick={() => { setShowDepositModal(false); setShowMnemonic(false); setSeedPassword(''); setSeedPasswordError(null); }}
                className="text-gray-500 hover:text-white"
              >
                [X]
              </button>
            </div>
            <div className="p-4">
              {/* Deposit Section */}
              <div className="text-gray-400 text-xs mb-2">DEPOSIT ADDRESS:</div>
              <div className="bg-black border border-gray-700 p-3 mb-3">
                <div className="text-cyan-500 font-mono text-xs break-all select-all">
                  {address}
                </div>
              </div>
              <button
                onClick={handleCopyAddress}
                className={`w-full py-2 border text-xs font-bold transition-colors mb-4 ${
                  depositCopied
                    ? 'border-green-500 text-green-500 bg-green-500/10'
                    : 'border-cyan-500/50 text-cyan-500 hover:bg-cyan-500/10'
                }`}
              >
                {depositCopied ? '✓ ADDRESS COPIED' : 'COPY ADDRESS'}
              </button>

              {/* Backup Section */}
              {wallet && (
                <div className="border-t border-gray-700 pt-4">
                  <div className="text-gray-400 text-xs mb-2">BACKUP SEED PHRASE:</div>
                  {!showMnemonic ? (
                    <div>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="password"
                          value={seedPassword}
                          onChange={(e) => { setSeedPassword(e.target.value); setSeedPasswordError(null); }}
                          placeholder="Enter password to reveal"
                          className="flex-1 px-3 py-2 bg-black border border-gray-700 text-white text-xs outline-none focus:border-yellow-500"
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
                          className="px-4 py-2 border border-yellow-500/50 text-yellow-500 text-xs hover:bg-yellow-500/10 disabled:opacity-50"
                        >
                          {verifyingSeedPassword ? '...' : 'REVEAL'}
                        </button>
                      </div>
                      {seedPasswordError && (
                        <div className="text-red-500 text-xs">{seedPasswordError}</div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="bg-black border border-red-500/50 p-3 mb-3">
                        <div className="text-red-400 font-mono text-xs break-all select-all">
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
                          className={`flex-1 py-2 border text-xs font-bold transition-colors ${
                            mnemonicCopied
                              ? 'border-green-500 text-green-500 bg-green-500/10'
                              : 'border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10'
                          }`}
                        >
                          {mnemonicCopied ? '✓ COPIED' : 'COPY SEED'}
                        </button>
                        <button
                          onClick={() => { setShowMnemonic(false); setSeedPassword(''); }}
                          className="flex-1 py-2 border border-gray-700 text-gray-400 text-xs hover:bg-gray-800"
                        >
                          HIDE
                        </button>
                      </div>
                      <div className="mt-2 text-red-500/80 text-xs">
                        ● Never share your seed phrase. Anyone with it can steal your funds.
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { setShowDepositModal(false); setShowMnemonic(false); setSeedPassword(''); setSeedPasswordError(null); }}
                  className="flex-1 py-2 border border-gray-700 text-gray-400 text-xs hover:bg-gray-800"
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

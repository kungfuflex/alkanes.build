"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useWallet } from "@/context/WalletContext";
import { useWalletBalances, formatBtcBalance } from "@/hooks/useWalletBalances";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "@bitcoinerlab/secp256k1";
import { AutoMintPanel } from "./AutoMintPanel";
import { fetchWithTimeout } from "@/lib/fetch-utils";
import type {
  UtxoInput, RbfData, CpfpData, ChainData, ChainConfig, ChainAutoState, SwapQuote,
  PersistedChainConfig,
} from './diesel-terminal/types';
import {
  TX_VSIZE, MAX_CHAIN_LENGTH, INCREMENTAL_RELAY_FEE,
  DEFAULT_CHAIN_CONFIG, emptyAutoState, emptyRbfData, emptyCpfpData,
  FRESH_FEE_TIMEOUT_MS, EPSILON,
  DIESEL_BASE_REWARD, DIESEL_BASE_REWARD_SATS,
  SPLIT_TX_BASE_VSIZE, P2TR_OUTPUT_VSIZE, DIESEL_OPRETURN_VSIZE,
  LOCALSTORAGE_CHAINS_KEY,
  P2TR_DUST_LIMIT,
} from './diesel-terminal/constants';
import { useActionQueue } from './diesel-terminal/useActionQueue';
import { useMultiChainAutoMint } from './diesel-terminal/useMultiChainAutoMint';
import { ChainConfigEditor } from './diesel-terminal/ChainConfigEditor';
import { TerminalWalletSidebar } from './diesel-terminal/TerminalWalletSidebar';
import { BtcSkeletonIcon, AlkaneSkeletonIcon } from '@/components/SkeletonIcons';
import { ProtoStone, Cellpack, encodeRunestoneProtostone } from '@alkanes/ts-sdk';

// Initialize ECC library for bitcoinjs-lib (required for P2TR addresses)
bitcoin.initEccLib(ecc);

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

// UtxoInput imported from diesel-terminal/types

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
    const utxoResponse = await fetchWithTimeout(`https://mempool.space/api/address/${address}/utxo`);
    const utxos = await utxoResponse.json();
    if (!utxos || utxos.length === 0) {
      throw new Error("No UTXOs available");
    }
    // Filter to only confirmed UTXOs to prevent using unconfirmed outputs
    const confirmedUtxos = utxos.filter((u: any) => u.status?.confirmed === true);
    if (confirmedUtxos.length === 0) {
      throw new Error("No confirmed UTXOs available - wait for confirmation");
    }
    confirmedUtxos.sort((a: { value: number }, b: { value: number }) => b.value - a.value);
    utxo = confirmedUtxos[0];
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
    const txResponse = await fetchWithTimeout(`https://mempool.space/api/tx/${utxo.txid}/hex`);
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
  const broadcastResponse = await fetchWithTimeout(rpcUrl, {
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
  const { isConnected, address, account, network, hasStoredKeystore, unlockWallet, restoreWallet, createWallet, signTaprootPsbt, disconnect, wallet, client } = useWallet();
  const publicKey = account?.taproot?.pubkey || "";
  const { data: balances, isLoading: balancesLoading, refetch: refetchBalances } = useWalletBalances(address);
  const [walletSidebarVisible, setWalletSidebarVisible] = useState(false);
  const [walletSidebarOpen, setWalletSidebarOpen] = useState(false);
  const [walletSidebarClosing, setWalletSidebarClosing] = useState(false);
  const openWalletSidebar = useCallback(() => {
    setWalletSidebarVisible(true);
    requestAnimationFrame(() => { setWalletSidebarOpen(true); setWalletSidebarClosing(false); });
  }, []);
  const closeWalletSidebar = useCallback(() => {
    setWalletSidebarClosing(true);
    setTimeout(() => { setWalletSidebarVisible(false); setWalletSidebarOpen(false); setWalletSidebarClosing(false); }, 250);
  }, []);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Mint state
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintProgress, setMintProgress] = useState({ current: 0, total: 0 });

  // Types imported from diesel-terminal/types

  // Chain ID counter for generating unique chain keys
  const chainCounterRef = useRef(0);
  const nextChainId = () => `chain-${++chainCounterRef.current}`;

  // Store chains by chain ID (chain-{N})
  const [chainsMap, setChainsMap] = useState<Map<string, ChainData>>(new Map());
  const [chainsLoaded, setChainsLoaded] = useState(false);
  const chainsMapRef = useRef(chainsMap);
  chainsMapRef.current = chainsMap;

  // Load chain state from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALSTORAGE_CHAINS_KEY);
      if (saved) {
        const configs: PersistedChainConfig[] = JSON.parse(saved);
        if (configs.length > 0) {
          const map = new Map<string, ChainData>();
          for (const c of configs) {
            map.set(c.id, {
              mintResult: c.mintResult ?? { txids: [], totalFee: 0 },
              rbfData: c.rbfData ?? emptyRbfData(),
              cpfpData: c.cpfpData ?? emptyCpfpData(),
              config: c.config,
              autoState: {
                ...emptyAutoState(),
                enabled: c.autoEnabled ?? false,
              },
              boundUtxo: c.boundUtxo,
              sourceUtxo: c.sourceUtxo,
            });
          }
          chainCounterRef.current = Math.max(0, ...configs.map(c => parseInt(c.id.replace('chain-', '')) || 0));
          setChainsMap(map);
        }
      }
    } catch { /* ignore corrupt localStorage */ }
    setChainsLoaded(true);
  }, []);

  // Persist chain state to localStorage (skip until initial load completes)
  useEffect(() => {
    if (!chainsLoaded) return;
    const configs: PersistedChainConfig[] = [];
    for (const [id, chain] of chainsMap) {
      configs.push({
        id,
        config: chain.config,
        mintResult: chain.mintResult,
        rbfData: chain.rbfData,
        cpfpData: chain.cpfpData,
        boundUtxo: chain.boundUtxo,
        sourceUtxo: chain.sourceUtxo,
        autoEnabled: chain.autoState.enabled,
      });
    }
    localStorage.setItem(LOCALSTORAGE_CHAINS_KEY, JSON.stringify(configs));
  }, [chainsMap, chainsLoaded]);

  // Global auto-mint enabled flag
  const [autoMintGlobalEnabled, setAutoMintGlobalEnabled] = useState(false);

  // RBF fee rate input (for manual RBF/CPFP)
  const [rbfFeeRate, setRbfFeeRate] = useState('');
  const [isRbfing, setIsRbfing] = useState(false);

  // Session spending tracking (actual costs from handleMint/handleRbf/handleCpfp)
  const [sessionSpent, setSessionSpent] = useState(0);
  const adjustedChainsRef = useRef(new Set<string>());
  const resetSessionSpent = useCallback(() => {
    setSessionSpent(0);
    adjustedChainsRef.current.clear();
  }, []);

  // Session limit
  const [sessionLimit, setSessionLimit] = useState(0); // 0 = no limit

  // Expanded chain rows (for inline config editor)
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());

  // UTXO selection state
  const [availableUtxos, setAvailableUtxos] = useState<UtxoInput[]>([]);
  const [loadingUtxos, setLoadingUtxos] = useState(false);

  // Block height state (declared early for use in confirmation check useEffect)
  const [blockHeight, setBlockHeight] = useState<number | null>(null);

  // Derive first chain for CPFP preview (backwards compat)
  const firstChainEntry = useMemo(() => {
    if (chainsMap.size === 0) return null;
    const [key, data] = chainsMap.entries().next().value as [string, ChainData];
    return { chainId: key, ...data };
  }, [chainsMap]);

  const rbfData = firstChainEntry ? firstChainEntry.rbfData : null;
  const cpfpData = firstChainEntry ? firstChainEntry.cpfpData : null;

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

  // Fetch available UTXOs via Subfrost RPC (confirmed + unconfirmed with ancestor count)
  const fetchUtxos = useCallback(async () => {
    if (!address) return;
    setLoadingUtxos(true);
    try {
      const res = await fetchWithTimeout(RPC_URL, {
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
        const allUtxos: UtxoInput[] = data.result.map((u: any) => ({
          txid: u.txid,
          vout: u.vout,
          value: u.value,
          confirmed: u.status?.confirmed === true,
        }));

        // Fetch ancestor count for unconfirmed UTXOs
        const unconfirmed = allUtxos.filter(u => !u.confirmed);
        if (unconfirmed.length > 0) {
          const mempoolRequests = unconfirmed.map((u, i) =>
            fetchWithTimeout(RPC_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: i,
                method: 'btc_getmempoolentry',
                params: [u.txid],
              }),
            }).then(r => r.json()).catch(() => null)
          );
          const results = await Promise.all(mempoolRequests);
          const ancestorMap = new Map<string, number>();
          results.forEach((r, i) => {
            if (r?.result?.ancestorcount != null) {
              ancestorMap.set(unconfirmed[i].txid, r.result.ancestorcount);
            }
          });
          allUtxos.forEach(u => {
            if (!u.confirmed && ancestorMap.has(u.txid)) {
              u.ancestorCount = ancestorMap.get(u.txid);
            }
          });
        }

        // Sort: confirmed first, then by value descending
        const sorted = allUtxos.sort((a, b) => {
          if (a.confirmed !== b.confirmed) return a.confirmed ? -1 : 1;
          return b.value - a.value;
        });
        setAvailableUtxos(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch UTXOs:', err);
    } finally {
      setLoadingUtxos(false);
    }
  }, [address]);

  // Ref for checkChainAndRestart — defined later but used in error handlers via ref
  const checkChainAndRestartRef = useRef<(chainId: string) => Promise<boolean>>(async () => false);

  // Handle mint execution (parametrized by chainId)
  const handleMintForChain = useCallback(async (chainId: string, mintCount: number, feeRateSatVb: number) => {
    if (!signTaprootPsbt || !address || !publicKey) {
      throw new Error("Wallet not connected or taproot key missing");
    }

    if (mintCount <= 0) {
      throw new Error("Nothing to mint");
    }

    // Look up chain data from chainsMap (use ref to avoid stale closure)
    const existingChain = chainsMapRef.current.get(chainId);
    const chainCpfpData = existingChain?.cpfpData;
    const chainRbfData = existingChain?.rbfData;
    const chainMintResult = existingChain?.mintResult;

    const continuingChain = chainCpfpData && chainRbfData && chainRbfData.chainLength > 0;
    const existingChainLength = continuingChain ? chainRbfData!.chainLength : 0;
    const existingTotalFees = continuingChain ? chainRbfData!.totalFees : 0;
    const existingTxids = continuingChain && chainMintResult ? chainMintResult.txids : [];

    if (existingChainLength + mintCount > MAX_CHAIN_LENGTH) {
      throw new Error(`Chain limit: can only add ${MAX_CHAIN_LENGTH - existingChainLength} more TXs`);
    }

    setIsMinting(true);
    setMintError(null);
    setMintProgress({ current: 0, total: mintCount });

    try {
      // Verify chain UTXO still exists (not confirmed or replaced)
      if (continuingChain) {
        const checkRes = await fetchWithTimeout(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'esplora_tx', params: [chainCpfpData!.lastTxid] }),
        });
        const checkData = await checkRes.json();

        if (checkData.result?.status?.confirmed) {
          // Reset chain state but keep config (user must delete manually)
          setChainsMap(prev => {
            const m = new Map(prev);
            const c = m.get(chainId);
            if (c) m.set(chainId, {
              ...c, mintResult: { txids: [], totalFee: 0 },
              rbfData: emptyRbfData(), cpfpData: emptyCpfpData(),
              autoState: { ...c.autoState, triggered: false, status: 'CONFIRMED — reset' },
              boundUtxo: undefined,
            });
            return m;
          });
          setMintError("Chain confirmed - reset, will retry");
          setIsMinting(false);
          refetchBalances();
          return;
        }

        if (checkData.error) {
          throw new Error("Chain UTXO not found - may have been replaced");
        }
      }

      const txids: string[] = [];

      // Find the UTXO for new chains (lazy selection)
      let startUtxo: UtxoInput | undefined;
      if (!continuingChain) {
        const chainEntry = chainsMapRef.current.get(chainId);

        // 1. Try boundUtxo (already minted before)
        if (chainEntry?.boundUtxo && chainEntry.boundUtxo.value > 0) {
          startUtxo = chainEntry.boundUtxo;
        }

        // 2. Try sourceUtxo (restart — change output from confirmed chain)
        if (!startUtxo && chainEntry?.sourceUtxo && chainEntry.sourceUtxo.value > 0) {
          startUtxo = chainEntry.sourceUtxo;
        }

        // 3. Auto-select a free confirmed UTXO
        if (!startUtxo) {
          const usedUtxos = new Set<string>();
          for (const [, c] of chainsMapRef.current) {
            if (c.boundUtxo) usedUtxos.add(`${c.boundUtxo.txid}:${c.boundUtxo.vout}`);
            if (c.sourceUtxo) usedUtxos.add(`${c.sourceUtxo.txid}:${c.sourceUtxo.vout}`);
          }
          const minValue = TX_VSIZE * feeRateSatVb * mintCount + P2TR_DUST_LIMIT;

          // Use cached UTXOs first; if empty, fetch fresh
          let utxoPool = availableUtxos;
          if (utxoPool.length === 0 && address) {
            try {
              const res = await fetchWithTimeout(RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'esplora_address::utxo', params: [address] }),
              });
              const data = await res.json();
              if (data.result && Array.isArray(data.result)) {
                utxoPool = data.result.map((u: any) => ({
                  txid: u.txid, vout: u.vout, value: u.value,
                  confirmed: u.status?.confirmed === true,
                }));
                setAvailableUtxos(utxoPool);
              }
            } catch { /* fall through to NO_FREE_UTXO */ }
          }

          const free = utxoPool.find(u =>
            u.confirmed && !usedUtxos.has(`${u.txid}:${u.vout}`)
            && u.value >= minValue
          );
          if (!free) {
            throw new Error('NO_FREE_UTXO');
          }
          startUtxo = free;
        }

        // Save boundUtxo to chain
        setChainsMap(prev => {
          const m = new Map(prev);
          const c = m.get(chainId);
          if (c) m.set(chainId, { ...c, boundUtxo: startUtxo });
          return m;
        });
      }

      let nextUtxo: UtxoInput | undefined = continuingChain ? {
        txid: chainCpfpData!.lastTxid,
        vout: 0,
        value: chainCpfpData!.lastOutputValue,
        rawTxHex: chainCpfpData!.lastRawTxHex,
      } : startUtxo;

      let lastTxInputUtxo: UtxoInput | undefined = undefined;
      let lastResult: { txid: string; outputValue: number; rawTxHex: string } | undefined = undefined;
      let newTxsFee = 0;
      let feesExcludingLast = continuingChain ? chainRbfData!.totalFees : 0;

      for (let i = 0; i < mintCount; i++) {
        setMintProgress({ current: i + 1, total: mintCount });

        const result = await executeMint(
          signTaprootPsbt, address, publicKey, feeRateSatVb, network, nextUtxo
        );

        txids.push(result.txid);
        lastResult = result;
        const fee = nextUtxo ? nextUtxo.value - result.outputValue : Math.ceil(TX_VSIZE * feeRateSatVb);
        newTxsFee += fee;

        if (i < mintCount - 1) feesExcludingLast += fee;

        if (i === mintCount - 1) {
          lastTxInputUtxo = (mintCount === 1 && !continuingChain) ? result.inputUtxo : nextUtxo;
        }

        if (i < mintCount - 1) {
          nextUtxo = { txid: result.txid, vout: 0, value: result.outputValue, rawTxHex: result.rawTxHex };
        }
      }

      const lastTxFee = Math.ceil(TX_VSIZE * feeRateSatVb);
      const totalFee = existingTotalFees + newTxsFee;
      const allTxids = [...existingTxids, ...txids];

      setSessionSpent(prev => prev + newTxsFee);

      // Save to chainsMap
      if (lastTxInputUtxo && lastResult) {
        const chainLen = existingChainLength + mintCount;
        const existingPreRbf = continuingChain ? chainRbfData?.preRbfTotalFees ?? null : null;
        const existingPreRbfLastTxid = continuingChain ? chainRbfData?.preRbfLastTxid ?? null : null;
        const newRbfData: RbfData = {
          lastTxInput: lastTxInputUtxo,
          lastTxFee: Number(lastTxFee) || 0,
          chainLength: chainLen,
          totalVsize: chainLen * TX_VSIZE,
          feesExcludingLast: Number(feesExcludingLast) || 0,
          totalFees: Number(totalFee) || 0,
          preRbfTotalFees: existingPreRbf,
          preRbfLastTxid: existingPreRbfLastTxid,
        };
        const newCpfpData: CpfpData = {
          lastTxid: lastResult.txid,
          lastOutputValue: lastResult.outputValue,
          lastRawTxHex: lastResult.rawTxHex,
        };

        setChainsMap(prev => {
          const newMap = new Map(prev);
          const existing = prev.get(chainId);
          newMap.set(chainId, {
            mintResult: { txids: allTxids, totalFee },
            rbfData: newRbfData,
            cpfpData: newCpfpData,
            config: existing?.config ?? { ...DEFAULT_CHAIN_CONFIG },
            autoState: existing?.autoState ? {
              ...existing.autoState,
              triggered: false,
              errorCount: 0,
              lastErrorTime: null,
              status: `MINTED ${chainLen} TXs`,
            } : emptyAutoState(),
            boundUtxo: existing?.boundUtxo,
          });
          return newMap;
        });
      }

      refetchBalances();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Mint failed";

      // NO_FREE_UTXO — soft error, don't count as failure
      if (errMsg === 'NO_FREE_UTXO') {
        setChainsMap(prev => {
          const c = prev.get(chainId);
          if (!c) return prev;
          const newMap = new Map(prev);
          newMap.set(chainId, {
            ...c,
            autoState: { ...c.autoState, triggered: false, lastErrorTime: Date.now(), status: 'NO FREE UTXO — waiting...' },
          });
          return newMap;
        });
        setIsMinting(false);
        setMintProgress({ current: 0, total: 0 });
        return;
      }

      setMintError(errMsg);
      const isInputGone = errMsg.includes('missingorspent') || errMsg.includes('missing-inputs') || errMsg.includes('txn-mempool-conflict');
      if (isInputGone) {
        const handled = await checkChainAndRestartRef.current(chainId);
        if (handled) { throw err; }
        // Not yet handled — esplora lagging. Set cooldown, DON'T increment errorCount.
        setChainsMap(prev => {
          const c = prev.get(chainId);
          if (!c) return prev;
          const newMap = new Map(prev);
          newMap.set(chainId, {
            ...c,
            autoState: { ...c.autoState, triggered: false, lastErrorTime: Date.now(), status: 'CONFIRMING — waiting for detection...' },
          });
          return newMap;
        });
        throw err;
      }
      // Other errors: increment errorCount (stops at 3)
      setChainsMap(prev => {
        const chain = prev.get(chainId);
        if (!chain) return prev;
        const newMap = new Map(prev);
        const newErrorCount = (chain.autoState.errorCount || 0) + 1;
        newMap.set(chainId, {
          ...chain,
          autoState: {
            ...chain.autoState,
            triggered: false,
            status: newErrorCount >= 3
              ? `ERROR (stopped): ${errMsg}`
              : `ERROR (${newErrorCount}/3): ${errMsg}`,
            errorCount: newErrorCount,
            lastErrorTime: Date.now(),
          },
        });
        return newMap;
      });
      throw err;
    } finally {
      setIsMinting(false);
      setMintProgress({ current: 0, total: 0 });
    }
  }, [signTaprootPsbt, address, publicKey, network, availableUtxos, refetchBalances]);

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

  // Handle RBF (parametrized by chainId)
  const handleRbfForChain = useCallback(async (chainId: string, targetEffectiveRate: number) => {
    if (!signTaprootPsbt || !address || !publicKey) {
      throw new Error("Missing data for RBF");
    }

    const chain = chainsMapRef.current.get(chainId);
    if (!chain) throw new Error("Chain not found");

    const chainRbfData = chain.rbfData;
    if (!chainRbfData.totalVsize || chainRbfData.totalVsize <= 0) {
      throw new Error("Invalid chain data - try detecting chain again");
    }

    const feesExcludingLast = chainRbfData.feesExcludingLast || 0;
    const requiredLastTxFee = Math.ceil(targetEffectiveRate * chainRbfData.totalVsize - feesExcludingLast);
    const chainMinLastTxFee = (chainRbfData.lastTxFee || 0) + Math.ceil(TX_VSIZE * INCREMENTAL_RELAY_FEE);
    const actualLastTxFee = Math.max(requiredLastTxFee, chainMinLastTxFee);

    if (actualLastTxFee <= chainRbfData.lastTxFee) {
      const effRate = chainRbfData.totalFees / chainRbfData.totalVsize;
      const minEff = (feesExcludingLast + chainMinLastTxFee) / chainRbfData.totalVsize;
      throw new Error(`Target must be > ${effRate.toFixed(2)} sat/vB (min: ${minEff.toFixed(2)})`);
    }

    setIsRbfing(true);
    setMintError(null);

    try {
      const result = await executeMint(
        signTaprootPsbt, address, publicKey, 0, network,
        chainRbfData.lastTxInput, actualLastTxFee
      );

      const oldTxids = chain.mintResult.txids;
      const newTxids = [...oldTxids.slice(0, -1), result.txid];
      const newTotalFees = feesExcludingLast + actualLastTxFee;
      setSessionSpent(prev => prev + (newTotalFees - chainRbfData.totalFees));

      const oldLastTxid = chain.mintResult.txids[chain.mintResult.txids.length - 1];
      const newRbfData: RbfData = {
        ...chainRbfData,
        lastTxFee: actualLastTxFee,
        totalFees: newTotalFees,
        preRbfTotalFees: chainRbfData.preRbfTotalFees ?? chainRbfData.totalFees,
        preRbfLastTxid: chainRbfData.preRbfLastTxid ?? oldLastTxid,
      };
      const newCpfpData: CpfpData = {
        lastTxid: result.txid,
        lastOutputValue: result.outputValue,
        lastRawTxHex: result.rawTxHex,
      };

      setChainsMap(prev => {
        const newMap = new Map(prev);
        newMap.set(chainId, {
          ...chain,
          mintResult: { txids: newTxids, totalFee: newTotalFees },
          rbfData: newRbfData,
          cpfpData: newCpfpData,
          autoState: { ...chain.autoState, rbfTriggered: false, errorCount: 0, lastErrorTime: null, status: `RBF OK: ${targetEffectiveRate.toFixed(2)} sat/vB` },
        });
        return newMap;
      });

      setRbfFeeRate('');
      refetchBalances();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "RBF failed";
      setMintError(errMsg);
      const isInputGone = errMsg.includes('missingorspent') || errMsg.includes('missing-inputs') || errMsg.includes('txn-mempool-conflict');
      if (isInputGone) {
        const handled = await checkChainAndRestartRef.current(chainId);
        if (handled) { throw err; }
        setChainsMap(prev => {
          const c = prev.get(chainId);
          if (!c) return prev;
          const newMap = new Map(prev);
          newMap.set(chainId, {
            ...c,
            autoState: { ...c.autoState, rbfTriggered: false, lastErrorTime: Date.now(), status: 'CONFIRMING — waiting for detection...' },
          });
          return newMap;
        });
        throw err;
      }
      // Other errors: increment errorCount (stops at 3)
      setChainsMap(prev => {
        const c = prev.get(chainId);
        if (!c) return prev;
        const newMap = new Map(prev);
        const newErrorCount = (c.autoState.errorCount || 0) + 1;
        newMap.set(chainId, {
          ...c,
          autoState: {
            ...c.autoState,
            status: newErrorCount >= 3
              ? `RBF ERROR (stopped): ${errMsg}`
              : `RBF ERROR (${newErrorCount}/3): ${errMsg}`,
            errorCount: newErrorCount,
            lastErrorTime: Date.now(),
          },
        });
        return newMap;
      });
      throw err;
    } finally {
      setIsRbfing(false);
    }
  }, [signTaprootPsbt, address, publicKey, network, refetchBalances]);

  // Handle CPFP (parametrized by chainId)
  const handleCpfpForChain = useCallback(async (chainId: string, targetEffectiveRate: number) => {
    if (!signTaprootPsbt || !address || !publicKey) {
      throw new Error("Missing data for CPFP");
    }

    const chain = chainsMapRef.current.get(chainId);
    if (!chain) throw new Error("Chain not found");

    const chainRbfData = chain.rbfData;
    const chainCpfpData = chain.cpfpData;

    if (chainRbfData.chainLength >= MAX_CHAIN_LENGTH) {
      throw new Error(`Chain limit reached (${MAX_CHAIN_LENGTH} TXs). Use RBF instead.`);
    }

    const newTotalVsize = chainRbfData.totalVsize + TX_VSIZE;
    const requiredChildFee = Math.ceil(targetEffectiveRate * newTotalVsize - chainRbfData.totalFees);
    const actualChildFee = Math.max(requiredChildFee, 1);

    const dustLimit = 330;
    if (chainCpfpData.lastOutputValue - actualChildFee < dustLimit) {
      throw new Error(`Insufficient balance for CPFP: need ${actualChildFee + dustLimit} sats, have ${chainCpfpData.lastOutputValue}`);
    }

    setIsRbfing(true);
    setMintError(null);

    try {
      const childUtxo: UtxoInput = {
        txid: chainCpfpData.lastTxid,
        vout: 0,
        value: chainCpfpData.lastOutputValue,
        rawTxHex: chainCpfpData.lastRawTxHex,
      };

      const result = await executeMint(
        signTaprootPsbt, address, publicKey, 0, network, childUtxo, actualChildFee
      );

      const newTxids = [...chain.mintResult.txids, result.txid];
      const newTotalFees = chainRbfData.totalFees + actualChildFee;
      const newChainLength = chainRbfData.chainLength + 1;
      setSessionSpent(prev => prev + actualChildFee);

      const newRbfData: RbfData = {
        lastTxInput: childUtxo,
        lastTxFee: actualChildFee,
        chainLength: newChainLength,
        totalVsize: newChainLength * TX_VSIZE,
        feesExcludingLast: chainRbfData.totalFees,
        totalFees: newTotalFees,
        preRbfTotalFees: chainRbfData.preRbfTotalFees ?? null,
        preRbfLastTxid: chainRbfData.preRbfLastTxid ?? null,
      };
      const newCpfpData: CpfpData = {
        lastTxid: result.txid,
        lastOutputValue: result.outputValue,
        lastRawTxHex: result.rawTxHex,
      };

      setChainsMap(prev => {
        const newMap = new Map(prev);
        newMap.set(chainId, {
          ...chain,
          mintResult: { txids: newTxids, totalFee: newTotalFees },
          rbfData: newRbfData,
          cpfpData: newCpfpData,
        });
        return newMap;
      });

      setRbfFeeRate('');
      refetchBalances();
    } catch (err) {
      setMintError(err instanceof Error ? err.message : "CPFP failed");
      throw err;
    } finally {
      setIsRbfing(false);
    }
  }, [signTaprootPsbt, address, publicKey, network, refetchBalances]);

  // Handle split UTXO: 1 P2TR input → N P2TR outputs + DIESEL mint OP_RETURN
  const handleSplitUtxo = useCallback(async (
    utxo: UtxoInput, outputs: number[], feeRate: number
  ): Promise<string> => {
    if (!signTaprootPsbt || !address || !publicKey) {
      throw new Error("Wallet not connected");
    }

    const btcNetwork = network === "mainnet" ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    const isP2TR = address.startsWith("bc1p") || address.startsWith("tb1p");
    if (!isP2TR) throw new Error("Split only supports P2TR addresses");

    // Validate total (vsize includes OP_RETURN for DIESEL mint)
    const totalOutputs = outputs.reduce((s, v) => s + v, 0);
    const vsize = SPLIT_TX_BASE_VSIZE + outputs.length * P2TR_OUTPUT_VSIZE + DIESEL_OPRETURN_VSIZE;
    const fee = Math.ceil(vsize * feeRate);
    if (totalOutputs + fee !== utxo.value) {
      throw new Error(`Amounts mismatch: outputs ${totalOutputs} + fee ${fee} != input ${utxo.value}`);
    }

    // Build DIESEL mint protostone via ts-sdk
    // mint rune 1:0 (UNCOMMON GOODS) + protostone for DIESEL alkane 2:0, opcode 77
    const cellpack = new Cellpack(BigInt(2), BigInt(0), [BigInt(77)]);
    const { encodedRunestone } = encodeRunestoneProtostone({
      mint: { block: BigInt(1), tx: BigInt(0) },
      protostones: [
        ProtoStone.message({
          protocolTag: BigInt(1),
          calldata: cellpack.serialize(),
          pointer: 0,
          refundPointer: 0,
        }),
      ],
    });

    // Fetch raw TX hex for the input
    let rawTxHex: string;
    if (utxo.rawTxHex) {
      rawTxHex = utxo.rawTxHex;
    } else {
      const txRes = await fetchWithTimeout(`https://mempool.space/api/tx/${utxo.txid}/hex`);
      rawTxHex = await txRes.text();
    }

    const outputScript = bitcoin.address.toOutputScript(address, btcNetwork);
    const pubKeyBuffer = Buffer.from(publicKey, "hex");
    const tapInternalKey = pubKeyBuffer.length === 33 ? pubKeyBuffer.subarray(1) : pubKeyBuffer;

    const psbt = new bitcoin.Psbt({ network: btcNetwork });
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      sequence: 0xfffffffd,
      witnessUtxo: { script: outputScript, value: BigInt(utxo.value) },
      tapInternalKey,
    });

    // P2TR outputs (split amounts)
    for (const amount of outputs) {
      psbt.addOutput({ address, value: BigInt(amount) });
    }

    // DIESEL mint OP_RETURN (protostone)
    psbt.addOutput({ script: encodedRunestone, value: BigInt(0) });

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

    const broadcastRes = await fetchWithTimeout(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "btc_sendrawtransaction", params: [signedTxHex] }),
    });
    const result = await broadcastRes.json();
    if (result.error) {
      throw new Error(`Broadcast failed: ${result.error.message || JSON.stringify(result.error)}`);
    }

    // Refresh UTXOs after split
    fetchUtxos();

    return result.result;
  }, [signTaprootPsbt, address, publicKey, network, fetchUtxos]);

  // --- Swap quote ---
  const handleGetSwapQuote = useCallback(async (
    tokenIn: string, tokenOut: string, amountIn: string
  ): Promise<SwapQuote | null> => {
    const espo = (client as any)?.provider?.espo;
    if (!espo?.findBestSwapPath) return null;

    const result = await espo.findBestSwapPath(
      tokenIn, tokenOut, 'exact_in', amountIn,
      undefined, undefined, undefined, undefined, 30, 1
    );

    const hops = result.hops || [];
    return {
      amountIn: String(result.amount_in ?? amountIn),
      amountOut: String(result.amount_out ?? '0'),
      route: hops.length > 0
        ? hops.map((h: any) => `${h.token_in} → ${h.token_out} (${h.pool})`).join(' | ')
        : 'direct',
      feeBps: result.fee_bps ?? 30,
      hops: hops.length,
    };
  }, [client]);

  const dieselBalance = useMemo(() => {
    const token = balances?.tokens?.find((t: any) => t.runeId === '2:0');
    return token?.balance ? Number(token.balance) : 0;
  }, [balances]);

  const frbtcBalance = useMemo(() => {
    const token = balances?.tokens?.find((t: any) => t.runeId === '32:0');
    return token?.balance ? Number(token.balance) : 0;
  }, [balances]);

  // --- Mempool fee rate (early ref for hooks) ---
  const [mempoolFeeRate, setMempoolFeeRate] = useState(0);

  // --- Action Queue & Multi-Chain Auto-Mint ---
  const actionQueue = useActionQueue({
    onMint: handleMintForChain,
    onRbf: handleRbfForChain,
    onCpfp: handleCpfpForChain,
  });

  const { startFreshFeeTimeout } = useMultiChainAutoMint({
    chainsMap,
    setChainsMap,
    currentFeeRate: mempoolFeeRate,
    globalEnabled: autoMintGlobalEnabled,
    isProcessingAction: actionQueue.isProcessing || isMinting || isRbfing,
    sessionSpent,
    sessionLimit,
    enqueue: actionQueue.enqueue,
    hasAction: actionQueue.hasAction,
  });

  // Add new chain (UTXO selected lazily at mint time)
  const handleAddChain = useCallback((config: ChainConfig) => {
    const id = nextChainId();
    setChainsMap(prev => {
      const m = new Map(prev);
      m.set(id, {
        mintResult: { txids: [], totalFee: 0 },
        rbfData: emptyRbfData(),
        cpfpData: emptyCpfpData(),
        config,
        autoState: {
          ...emptyAutoState(),
          enabled: autoMintGlobalEnabled,
        },
      });
      return m;
    });
  }, [autoMintGlobalEnabled]);

  // Detect existing unconfirmed chains from mempool (finds ALL chains per UTXO)
  const detectExistingChain = useCallback(async () => {
    if (!address) return;

    setIsMinting(true);
    setMintError(null);

    try {
      // Fetch all transactions for the address
      const txsResponse = await fetchWithTimeout(`https://mempool.space/api/address/${address}/txs`);
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
      const chainStarts: Array<{ tx: any; sourceUtxo: { txid: string; vout: number; value: number }; sourceKey: string }> = [];

      for (const tx of unconfirmedTxs) {
        for (const vin of tx.vin) {
          if (!txMap.has(vin.txid)) {
            // This TX spends from a confirmed UTXO - it's a chain start
            const sourceKey = `${vin.txid}:${vin.vout}`;
            // Check if we already found a chain from this UTXO
            if (!chainStarts.some(cs => cs.sourceKey === sourceKey)) {
              chainStarts.push({
                tx,
                sourceUtxo: {
                  txid: vin.txid,
                  vout: vin.vout,
                  value: vin.prevout?.value || 0,
                },
                sourceKey,
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
        const { tx: chainStart, sourceUtxo } = chainStartInfo;

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
          const rawTxRes = await fetchWithTimeout(`https://mempool.space/api/tx/${secondToLastTx.txid}/hex`);
          const rawTxHex = await rawTxRes.text();
          lastTxInput = {
            txid: secondToLastTx.txid,
            vout: 0,
            value: secondToLastTx.vout[0]?.value || 0,
            rawTxHex,
          };
        } else {
          const rawTxRes = await fetchWithTimeout(`https://mempool.space/api/tx/${sourceUtxo.txid}/hex`);
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
          preRbfTotalFees: null,
          preRbfLastTxid: null,
        };

        // Build CPFP data
        const lastTxRawRes = await fetchWithTimeout(`https://mempool.space/api/tx/${lastTx.txid}/hex`);
        const lastTxRawHex = await lastTxRawRes.text();
        const lastOutputValue = lastTx.vout[0]?.value || 0;

        const cpfpData: CpfpData = {
          lastTxid: lastTx.txid,
          lastOutputValue,
          lastRawTxHex: lastTxRawHex,
        };

        const mintResult = { txids: chainTxids, totalFee: totalFees };

        // Save to chainsMap
        const detectedChainId = nextChainId();
        newChainsMap.set(detectedChainId, {
          mintResult, rbfData, cpfpData,
          config: { ...DEFAULT_CHAIN_CONFIG },
          autoState: emptyAutoState(),
          sourceUtxo,
          boundUtxo: sourceUtxo,
        });
      }

      // Update chainsMap with detected chains (skip duplicates by matching first txid)
      setChainsMap(prev => {
        // Collect first txids of existing chains to detect duplicates
        const existingFirstTxids = new Set<string>();
        for (const [, existing] of prev) {
          if (existing.mintResult.txids.length > 0) {
            existingFirstTxids.add(existing.mintResult.txids[0]);
          }
        }
        const merged = new Map(prev);
        for (const [key, value] of newChainsMap) {
          const firstTxid = value.mintResult.txids[0];
          if (firstTxid && existingFirstTxids.has(firstTxid)) continue; // Skip duplicate
          merged.set(key, value);
        }
        return merged;
      });

      // chainsMap is now the source of truth; no standalone state to set

      if (newChainsMap.size === 0) {
        setMintError("No DIESEL chains found");
      }

    } catch (err) {
      setMintError(err instanceof Error ? err.message : "Detection failed");
    } finally {
      setIsMinting(false);
    }
  }, [address]);

  // Auto-detect chain on mount if wallet is connected + fetch UTXOs for AutoMintPanel
  useEffect(() => {
    if (!chainsLoaded) return; // Wait for localStorage restore before detecting
    if (isConnected && address) {
      fetchUtxos();
      detectExistingChain(); // Always detect — dedup by first txid prevents duplicates
    }
  }, [isConnected, address, chainsLoaded]);

  // Check ALL chains in chainsMap for confirmation
  // Handles auto-restart in-place (same chainId, reset state, set sourceUtxo)
  useEffect(() => {
    if (chainsMap.size === 0) return;

    const currentFeeRate = mempoolStats?.minFee || 0;

    // Helper to build restart state for a chain (in-place)
    const makeRestartState = (chainData: ChainData, restartTxid: string, restartOutputValue: number): Partial<ChainData> => ({
      mintResult: { txids: [], totalFee: 0 },
      rbfData: emptyRbfData(),
      cpfpData: emptyCpfpData(),
      config: { ...chainData.config },
      autoState: {
        enabled: true, triggered: false, rbfTriggered: false,
        waitingForFreshFees: true, feeAtConfirmation: currentFeeRate,
        waitStartTime: Date.now(), status: 'CONFIRMED — waiting for fresh fees',
        errorCount: 0, lastErrorTime: null,
      },
      sourceUtxo: restartOutputValue > 0 ? { txid: restartTxid, vout: 0, value: restartOutputValue } : undefined,
      boundUtxo: undefined, // Reset — will be re-selected at mint time
    });

    const checkAllChains = async () => {
      // chainId → restart data (in-place)
      const restartInPlace: Map<string, Partial<ChainData>> = new Map();
      const deleteKeys: string[] = [];
      const restoredChains: Array<{ chainId: string; lastValidTxid: string; lastValidOutputValue: number; validTxids: string[] }> = [];
      const currentChainsMap = chainsMapRef.current;

      for (const [chainId, chainData] of currentChainsMap) {
        // Skip chains with no TXs (not yet minted)
        if (chainData.mintResult.txids.length === 0) continue;

        try {
          const lastTxRes = await fetchWithTimeout(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'esplora_tx', params: [chainData.cpfpData.lastTxid] }),
          });
          const lastTxData = await lastTxRes.json();

          if (lastTxData.result?.status?.confirmed) {
            if (chainData.config.autoRestart && autoMintGlobalEnabled) {
              const lastTxid = chainData.cpfpData.lastTxid;
              restartInPlace.set(chainId, makeRestartState(chainData, lastTxid, chainData.cpfpData.lastOutputValue));
            } else {
              deleteKeys.push(chainId);
            }
            continue;
          }

          const lastTxNotFound = lastTxData.error || !lastTxData.result;

          // Last TX not found — walk chain backwards
          if (lastTxNotFound) {
            const txids = [...chainData.mintResult.txids];
            if (chainData.rbfData.preRbfLastTxid) {
              txids[txids.length - 1] = chainData.rbfData.preRbfLastTxid;
            }

            let lastValidTxid: string | null = null;
            let lastValidConfirmed = false;
            let lastValidOutputValue = 0;
            let lastValidIndex = -1;

            for (let i = txids.length - 1; i >= 0; i--) {
              try {
                const res = await fetchWithTimeout(RPC_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'esplora_tx', params: [txids[i]] }),
                });
                const data = await res.json();
                if (data.result) {
                  lastValidTxid = txids[i];
                  lastValidConfirmed = data.result.status?.confirmed === true;
                  lastValidOutputValue = data.result.vout?.[0]?.value || 0;
                  lastValidIndex = i;
                  break;
                }
              } catch {
                continue;
              }
            }

            if (!lastValidTxid) continue;

            if (lastValidConfirmed) {
              if (!adjustedChainsRef.current.has(chainId) && chainData.rbfData.preRbfTotalFees != null) {
                const overpay = chainData.rbfData.totalFees - chainData.rbfData.preRbfTotalFees;
                if (overpay > 0) {
                  setSessionSpent(prev => Math.max(0, prev - overpay));
                  adjustedChainsRef.current.add(chainId);
                }
              }
              if (chainData.config.autoRestart && autoMintGlobalEnabled) {
                restartInPlace.set(chainId, makeRestartState(chainData, lastValidTxid, lastValidOutputValue));
              } else {
                deleteKeys.push(chainId);
              }
              continue;
            }

            // Last valid TX still in mempool — RESTORE chain
            restoredChains.push({
              chainId,
              lastValidTxid,
              lastValidOutputValue,
              validTxids: txids.slice(0, lastValidIndex + 1),
            });
            continue;
          }

          // RBF cross-check
          if (chainData.rbfData.preRbfLastTxid && chainData.rbfData.preRbfLastTxid !== chainData.cpfpData.lastTxid) {
            const origTxRes = await fetchWithTimeout(RPC_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'esplora_tx', params: [chainData.rbfData.preRbfLastTxid] }),
            });
            const origTxData = await origTxRes.json();
            if (origTxData.result?.status?.confirmed) {
              if (!adjustedChainsRef.current.has(chainId) && chainData.rbfData.preRbfTotalFees != null) {
                const overpay = chainData.rbfData.totalFees - chainData.rbfData.preRbfTotalFees;
                if (overpay > 0) {
                  setSessionSpent(prev => Math.max(0, prev - overpay));
                  adjustedChainsRef.current.add(chainId);
                }
              }
              if (chainData.config.autoRestart && autoMintGlobalEnabled) {
                const origOutputValue = origTxData.result?.vout?.[0]?.value || 0;
                restartInPlace.set(chainId, makeRestartState(chainData, chainData.rbfData.preRbfLastTxid!, origOutputValue));
              } else {
                deleteKeys.push(chainId);
              }
              continue;
            }
          }

          // First TX cross-check
          const firstTxid = chainData.mintResult.txids[0];
          if (firstTxid && firstTxid !== chainData.cpfpData.lastTxid) {
            try {
              const firstTxRes = await fetchWithTimeout(RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'esplora_tx', params: [firstTxid] }),
              });
              const firstTxData = await firstTxRes.json();
              if (firstTxData.result?.status?.confirmed) {
                if (!adjustedChainsRef.current.has(chainId) && chainData.rbfData.preRbfTotalFees != null) {
                  const overpay = chainData.rbfData.totalFees - chainData.rbfData.preRbfTotalFees;
                  if (overpay > 0) {
                    setSessionSpent(prev => Math.max(0, prev - overpay));
                    adjustedChainsRef.current.add(chainId);
                  }
                }
                if (chainData.config.autoRestart && autoMintGlobalEnabled) {
                  const restartTxid = chainData.rbfData.preRbfLastTxid || chainData.cpfpData.lastTxid;
                  let restartOutputValue = 0;
                  if (chainData.rbfData.preRbfLastTxid) {
                    try {
                      const restartRes = await fetchWithTimeout(RPC_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'esplora_tx', params: [restartTxid] }),
                      });
                      const restartData = await restartRes.json();
                      restartOutputValue = restartData.result?.vout?.[0]?.value || 0;
                    } catch { /* will fetch from wallet on next mint */ }
                  } else {
                    restartOutputValue = chainData.cpfpData.lastOutputValue;
                  }
                  restartInPlace.set(chainId, makeRestartState(chainData, restartTxid, restartOutputValue));
                } else {
                  deleteKeys.push(chainId);
                }
                continue;
              }
            } catch { /* ignore — will retry next cycle */ }
          }
        } catch {
          // Ignore errors for individual chains
        }
      }

      // Update chainsMap: restart in-place, reset confirmed (keep config), restore recovered
      if (restartInPlace.size > 0 || deleteKeys.length > 0 || restoredChains.length > 0) {
        setChainsMap(prev => {
          const newMap = new Map(prev);
          // Reset confirmed chains (keep config, clear active state)
          for (const key of deleteKeys) {
            const c = newMap.get(key);
            if (c) {
              newMap.set(key, {
                ...c, mintResult: { txids: [], totalFee: 0 },
                rbfData: emptyRbfData(), cpfpData: emptyCpfpData(),
                autoState: { ...emptyAutoState(), status: 'CONFIRMED — idle' },
                boundUtxo: undefined, sourceUtxo: undefined,
              });
            }
          }
          // In-place restart: update chain with fresh state, keep same chainId
          for (const [chainId, restartData] of restartInPlace) {
            const existing = newMap.get(chainId);
            if (existing) {
              newMap.set(chainId, { ...existing, ...restartData } as ChainData);
            }
          }
          // Restore chains where RBF was evicted but original TXs still valid
          for (const { chainId, lastValidTxid, lastValidOutputValue, validTxids } of restoredChains) {
            const existing = newMap.get(chainId);
            if (!existing) continue;
            const originalTotalFee = existing.mintResult.totalFee;
            const originalCount = existing.mintResult.txids.length;
            const validCount = validTxids.length;
            const estimatedValidFee = originalCount > 0
              ? Math.round(originalTotalFee * (validCount / originalCount))
              : originalTotalFee;
            newMap.set(chainId, {
              ...existing,
              mintResult: { txids: validTxids, totalFee: estimatedValidFee },
              cpfpData: { lastTxid: lastValidTxid, lastOutputValue: lastValidOutputValue, lastRawTxHex: '' },
              rbfData: {
                ...existing.rbfData,
                lastTxInput: { txid: lastValidTxid, vout: 0, value: lastValidOutputValue },
                lastTxFee: estimatedValidFee > 0 && validCount > 0
                  ? Math.round(estimatedValidFee / validCount) : existing.rbfData.lastTxFee,
                chainLength: validCount,
                totalVsize: validCount * TX_VSIZE,
                feesExcludingLast: estimatedValidFee - (estimatedValidFee > 0 && validCount > 0
                  ? Math.round(estimatedValidFee / validCount) : 0),
                totalFees: estimatedValidFee,
                preRbfTotalFees: null,
                preRbfLastTxid: null,
              },
              autoState: {
                ...existing.autoState,
                rbfTriggered: false, triggered: false,
                status: `RECOVERED — ${validCount} TX${validCount > 1 ? 's' : ''} valid`,
                errorCount: 0, lastErrorTime: null,
              },
            });
          }
          return newMap;
        });

        // Start fresh-fee timeouts for restarted chains
        for (const [chainId] of restartInPlace) {
          startFreshFeeTimeout(chainId);
        }

        if (deleteKeys.length > 0 || restartInPlace.size > 0) {
          refetchBalances();
        }
      }
    };

    checkAllChains();
    const retry1 = setTimeout(checkAllChains, 2000);
    const retry2 = setTimeout(checkAllChains, 5000);
    const retry3 = setTimeout(checkAllChains, 10000);
    const interval = setInterval(checkAllChains, 30000);
    return () => {
      clearTimeout(retry1);
      clearTimeout(retry2);
      clearTimeout(retry3);
      clearInterval(interval);
    };
  }, [chainsMap.size, refetchBalances, blockHeight, startFreshFeeTimeout, autoMintGlobalEnabled]);
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
  const [scanProgress, setScanProgress] = useState({ nextBlockTxs: 0, found: 0 });
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
      const countRes = await fetchWithTimeout(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'btc_getblockcount',
          params: []
        })
      });
      const countData = await countRes.json();

      if (countData.result) {
        const height = countData.result;
        setBlockHeight(height);

        // Get block hash for this height
        const hashRes = await fetchWithTimeout(RPC_URL, {
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
          const headerRes = await fetchWithTimeout(RPC_URL, {
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
      const res = await fetchWithTimeout('https://mempool.space/api/v1/mining/difficulty-adjustments/1m');
      // fetchWithTimeout throws on non-2xx, so no need for res.ok check
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
      const res = await fetchWithTimeout('/api/pools?pool=DIESEL_FRBTC');
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
      const res = await fetchWithTimeout(MEMPOOL_API);
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

  // Sync mempoolFeeRate for hooks defined earlier
  useEffect(() => {
    if (mempoolStats?.minFee !== undefined) {
      setMempoolFeeRate(mempoolStats.minFee);
    }
  }, [mempoolStats?.minFee]);

  // Check if a chain's TXs are confirmed/evicted and restart if so.
  // Called when broadcast fails with "missingorspent" — walks the chain backwards
  // to find the last valid TX, gets actual output value from esplora, and restarts.
  // Returns true if handled (chain removed/restarted).
  const checkChainAndRestart = useCallback(async (chainId: string): Promise<boolean> => {
    const chain = chainsMapRef.current.get(chainId);
    if (!chain) return true;
    if (chain.mintResult.txids.length === 0) {
      // No txids — nothing to walk, just reset state (keep config)
      setChainsMap(prev => {
        const m = new Map(prev);
        const c = m.get(chainId);
        if (c) m.set(chainId, {
          ...c, mintResult: { txids: [], totalFee: 0 },
          rbfData: emptyRbfData(), cpfpData: emptyCpfpData(),
          autoState: { ...c.autoState, triggered: false, status: null },
          boundUtxo: undefined,
        });
        return m;
      });
      return true;
    }

    // Build original txid list — replace RBF replacement with original
    const txids = [...chain.mintResult.txids];
    if (chain.rbfData.preRbfLastTxid) {
      txids[txids.length - 1] = chain.rbfData.preRbfLastTxid;
    }

    // Walk chain backwards to find the last valid TX
    let lastValidTxid: string | null = null;
    let lastValidConfirmed = false;
    let lastValidOutputValue = 0;

    for (let i = txids.length - 1; i >= 0; i--) {
      try {
        const res = await fetchWithTimeout(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'esplora_tx', params: [txids[i]] }),
        });
        const data = await res.json();
        if (data.result) {
          lastValidTxid = txids[i];
          lastValidConfirmed = data.result.status?.confirmed === true;
          lastValidOutputValue = data.result.vout?.[0]?.value || 0;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!lastValidTxid) return false;

    if (!lastValidConfirmed) {
      const firstTxid = txids[0];
      if (firstTxid && firstTxid !== lastValidTxid) {
        try {
          const firstRes = await fetchWithTimeout(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'esplora_tx', params: [firstTxid] }),
          });
          const firstData = await firstRes.json();
          if (firstData.result?.status?.confirmed) {
            lastValidConfirmed = true;
          }
        } catch { /* ignore */ }
      }
      if (!lastValidConfirmed) return false;
    }

    // Chain confirmed — adjust session spending for RBF overpay
    if (!adjustedChainsRef.current.has(chainId) && chain.rbfData.preRbfTotalFees != null) {
      const overpay = chain.rbfData.totalFees - chain.rbfData.preRbfTotalFees;
      if (overpay > 0) {
        setSessionSpent(prev => Math.max(0, prev - overpay));
        adjustedChainsRef.current.add(chainId);
      }
    }

    const shouldRestart = chain.config.autoRestart && autoMintGlobalEnabled;
    const currentFeeRate = mempoolStats?.minFee || 0;

    setChainsMap(prev => {
      const newMap = new Map(prev);
      if (shouldRestart) {
        // In-place restart: reset chain state, set sourceUtxo to change output
        newMap.set(chainId, {
          mintResult: { txids: [], totalFee: 0 },
          rbfData: emptyRbfData(),
          cpfpData: emptyCpfpData(),
          config: { ...chain.config },
          autoState: {
            enabled: true, triggered: false, rbfTriggered: false,
            waitingForFreshFees: true, feeAtConfirmation: currentFeeRate,
            waitStartTime: Date.now(), status: 'CONFIRMED — waiting for fresh fees',
            errorCount: 0, lastErrorTime: null,
          },
          sourceUtxo: lastValidOutputValue > 0
            ? { txid: lastValidTxid!, vout: 0, value: lastValidOutputValue }
            : undefined,
          boundUtxo: undefined,
        });
      } else {
        // Keep config, reset active state
        const c = newMap.get(chainId);
        if (c) {
          newMap.set(chainId, {
            ...c, mintResult: { txids: [], totalFee: 0 },
            rbfData: emptyRbfData(), cpfpData: emptyCpfpData(),
            autoState: { ...emptyAutoState(), status: 'CONFIRMED — idle' },
            boundUtxo: undefined, sourceUtxo: undefined,
          });
        }
      }
      return newMap;
    });

    if (shouldRestart) startFreshFeeTimeout(chainId);
    refetchBalances();
    return true;
  }, [autoMintGlobalEnabled, mempoolStats, refetchBalances, startFreshFeeTimeout]);

  // Keep ref in sync so error handlers (defined before mempoolStats) can call it
  checkChainAndRestartRef.current = checkChainAndRestart;

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

  const MIN_SCAN_DISPLAY_MS = 1500;

  // Scan mempool for DIESEL mint transactions via server-side API (cached)
  const scanForDieselMints = useCallback(async () => {
    if (!mempoolStats) return;

    setIsScanning(true);
    const scanStart = Date.now();

    try {
      const res = await fetchWithTimeout('/api/competition').catch(() => null);
      if (!res) return; // Network/timeout error — silently skip, will retry next interval
      const data = await res.json();

      if (!data.success) return; // Server-side error — skip

      const result = data.data;

      if (result) {
        setScanProgress({
          nextBlockTxs: result.next_block_txs,
          found: result.diesel_mints
        });

        setDetectedCompetition(result.diesel_mints);

        if (autoCompetition) {
          setCompetition(result.diesel_mints);
        }
      }

    } catch (err) {
      // Silently skip — will retry next interval
    } finally {
      const elapsed = Date.now() - scanStart;
      const remaining = MIN_SCAN_DISPLAY_MS - elapsed;
      if (remaining > 0) {
        setTimeout(() => setIsScanning(false), remaining);
      } else {
        setIsScanning(false);
      }
    }
  }, [mempoolStats, autoCompetition]);

  // Auto-scan competition every 15 seconds
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
  }, [mempoolStats?.minFee]); // Re-run when minFee changes (new block)

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
                  <span className="w-5 h-5 flex-shrink-0"><BtcSkeletonIcon /></span>
                  <span className={`text-xs sm:text-sm ${balances.btcBalanceAvailable ? 'text-[#e0e0e0]' : 'text-[#505050] animate-pulse'}`}>{balances.btcBalanceAvailable ? formatBtcBalance(balances.btcBalance, true) : '-.----'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4 flex-shrink-0"><AlkaneSkeletonIcon /></span>
                  <span className="text-[#e0e0e0] text-xs sm:text-sm">{balances.tokens?.find((t: any) => t.runeId === '2:0')?.balanceFormatted?.toFixed(2) || '0.00'}</span>
                </span>
                {balances.runes?.find((r: any) => r.spacedName === 'UNCOMMON•GOODS') && (
                  <span className="hidden sm:flex items-center gap-1">
                    <span className="text-white/30 font-semibold text-xl leading-none">⧉</span>
                    <span className="text-[#e0e0e0]">{balances.runes.find((r: any) => r.spacedName === 'UNCOMMON•GOODS')?.balanceFormatted?.toLocaleString() || '0'}</span>
                  </span>
                )}
                <button
                  onClick={openWalletSidebar}
                  className="text-orange-500 hover:bg-orange-500 hover:text-black border border-orange-500 px-2 sm:px-3 py-1 text-xs sm:text-sm tracking-wide transition-colors"
                >
                  WALLET
                </button>
              </div>
            ) : (
              <span className="text-[#505050] border-r border-[#303030] pr-4 mr-2 text-sm">LOADING...</span>
            )
          ) : (
            <button
              onClick={openWalletSidebar}
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
                  <span className="w-4 h-4 flex-shrink-0 cursor-help border-b border-dotted border-[#505050]"><AlkaneSkeletonIcon /></span>
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
                <div>Competing mints in next block</div>
                <div className="mt-1 text-[#707070]">Total detected: {competition}</div>
                <div className="text-[#707070]">Your TXs: {Array.from(chainsMap.values()).reduce((sum, c) => sum + c.rbfData.chainLength, 0)}</div>
                {scanProgress.nextBlockTxs > 0 && (
                  <div className="mt-1 text-[#707070]">Next block: {scanProgress.nextBlockTxs.toLocaleString()} TXs</div>
                )}
              </div>
            </div>
            {isScanning ? (
              <span className="text-[#00d4ff] flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#00d4ff] animate-spin [animation-duration:3s]"></span>SCAN
              </span>
            ) : detectedCompetition !== null ? (
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 bg-[#00d4ff] ${detectedCompetitionFlash}`}></span>
                <span className="text-[#00d4ff]">{detectedCompetition}</span>
                <span className="text-[#505050] text-xs">detected</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>


      {/* Auto-mint panel */}
      {isConnected ? (
        <div className="mt-2 sm:mt-3 border border-[#252525] bg-[#0d0d0d]">
          <AutoMintPanel
            currentFeeRate={mempoolStats?.minFee || 0}
            isConnected={isConnected}
            globalEnabled={autoMintGlobalEnabled}
            onGlobalEnabledChange={setAutoMintGlobalEnabled}
            sessionSpent={sessionSpent}
            sessionLimit={sessionLimit}
            onSessionLimitChange={setSessionLimit}
            onResetSpent={resetSessionSpent}
            onLaunch={handleAddChain}
            chainsCount={chainsMap.size}
          />
        </div>
      ) : (
        <div className="mt-3 border border-[#252525] bg-[#0d0d0d] p-4 text-center">
          <div className="text-[#505050] text-sm mb-3">CONNECT WALLET TO ENABLE AUTO-MINT</div>
          <button
            onClick={openWalletSidebar}
            className="px-6 py-2 text-sm font-bold border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black tracking-wide transition-colors"
          >
            CONNECT
          </button>
        </div>
      )}

      {/* Active Chains List */}
      {isConnected && (
        <div className="mt-2 sm:mt-3 border border-[#252525] bg-[#0d0d0d] relative z-10 overflow-visible">
          <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-b border-[#252525] bg-[#0a0a0a]">
            <span className="text-xs sm:text-sm">
              <span className="text-orange-500 font-bold">3</span>
              <span className="text-[#404040] mx-1">│</span>
              <span className="text-[#e0e0e0] tracking-wide">CHAINS</span>
              <span className="text-[#505050] ml-2">({chainsMap.size})</span>
            </span>
          </div>
          {chainsMap.size > 0 ? (
            <>
              {/* Table header */}
              <div className="grid grid-cols-12 gap-1 px-2 sm:px-4 py-2 text-xs text-[#505050] border-b border-[#1a1a1a] bg-[#080808] uppercase tracking-wider">
                <div className="col-span-1 text-center">ST</div>
                <div className="col-span-1 text-center">TX</div>
                <div className="col-span-1 text-right">ROI</div>
                <div className="col-span-2 text-right">EXP</div>
                <div className="col-span-2 text-right">COST</div>
                <div className="col-span-1 text-right">P&L</div>
                <div className="col-span-1 text-right">RATE</div>
                <div className="col-span-3 text-right">ACT</div>
              </div>
              {/* Chains list */}
              <div className="max-h-64 overflow-y-auto">
                {Array.from(chainsMap.entries()).map(([chainId, chainData]) => {
                  const n = chainData.rbfData.chainLength;
                  const effectiveRate = chainData.rbfData.totalVsize > 0
                    ? chainData.rbfData.totalFees / chainData.rbfData.totalVsize
                    : 0;
                  const isLowFee = mempoolStats && effectiveRate > 0 && effectiveRate < mempoolStats.minFee;
                  const isExpanded = expandedChains.has(chainId);

                  // Calculate chain metrics
                  const pool = blockReward * 0.95;
                  const totalMints = n + competition;
                  const emission = totalMints > 0 ? (n / totalMints) * pool : 0;
                  const costSats = chainData.rbfData.totalFees;
                  const costDiesel = dieselPrice > 0 ? costSats / dieselPrice : 0;
                  const profitDiesel = emission - costDiesel;
                  const profitSats = profitDiesel * dieselPrice;
                  const roi = costSats > 0 ? (profitSats / costSats) * 100 : 0;
                  const isProfitable = profitDiesel > 0;

                  // Status dot
                  const statusColor = chainData.autoState.status?.startsWith('ERROR')
                    ? 'bg-[#ff4444]'
                    : chainData.autoState.waitingForFreshFees
                      ? 'bg-[#ffcc00]'
                      : !chainData.autoState.enabled
                        ? 'bg-[#505050]'
                        : chainData.mintResult.txids.length > 0
                          ? 'bg-[#00ff88] animate-pulse'
                          : 'bg-[#ffcc00]';

                  return (
                    <div key={chainId}>
                      <div
                        className="grid grid-cols-12 gap-1 px-2 sm:px-4 py-2 text-xs sm:text-sm border-b border-[#151515] hover:bg-[#151515] cursor-pointer"
                        onClick={() => setExpandedChains(prev => {
                          const next = new Set(prev);
                          next.has(chainId) ? next.delete(chainId) : next.add(chainId);
                          return next;
                        })}
                      >
                        {/* Status dot */}
                        <div className="col-span-1 flex items-center justify-center">
                          <span className={`w-2 h-2 ${statusColor}`} />
                        </div>
                        <div className={`col-span-1 text-center ${
                          n >= 25 ? 'text-[#ff4444]' : n >= 20 ? 'text-[#ffcc00]' : 'text-[#00ff88]'
                        }`}>
                          {n}<span className="text-[#303030]">/25</span>
                        </div>
                        <div className={`col-span-1 text-right font-bold ${roi >= 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
                          {n > 0 ? `${roi >= 0 ? '+' : ''}${roi.toFixed(0)}%` : '-'}
                        </div>
                        <div className="col-span-2 text-right text-[#e0e0e0]">
                          {n > 0 ? <>{emission.toFixed(2)}<span className="text-[#404040] text-xs ml-1">D</span></> : '-'}
                        </div>
                        <div className="col-span-2 text-right text-[#e0e0e0]">
                          {costSats > 0 ? <>{costSats.toLocaleString()}<span className="text-[#404040] text-xs ml-1">s</span></> : '-'}
                        </div>
                        <div className={`col-span-1 text-right ${isProfitable ? 'text-[#00ff88]' : n > 0 ? 'text-[#ff4444]' : 'text-[#505050]'}`}>
                          {n > 0 ? `${profitSats >= 0 ? '+' : ''}${Math.round(profitSats)}` : '-'}
                        </div>
                        <div className={`col-span-1 text-right ${isLowFee ? 'text-[#ff4444]' : 'text-[#e0e0e0]'}`}>
                          {effectiveRate > 0 ? effectiveRate.toFixed(2) : '-'}
                          {isLowFee && <span className="text-[#ff4444]">▼</span>}
                        </div>
                        <div className="col-span-3 text-right flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          {/* Pause/Play */}
                          <button
                            onClick={() => {
                              setChainsMap(prev => {
                                const newMap = new Map(prev);
                                const c = prev.get(chainId);
                                if (!c) return prev;
                                newMap.set(chainId, {
                                  ...c,
                                  autoState: { ...c.autoState, enabled: !c.autoState.enabled, triggered: false, rbfTriggered: false },
                                });
                                return newMap;
                              });
                            }}
                            className={`px-1.5 py-0.5 text-xs border transition-colors ${
                              chainData.autoState.enabled
                                ? 'text-[#ffcc00] border-[#ffcc00]/30 hover:bg-[#ffcc00]/10'
                                : 'text-[#00ff88] border-[#00ff88]/30 hover:bg-[#00ff88]/10'
                            }`}
                            title={chainData.autoState.enabled ? 'Pause' : 'Resume'}
                          >
                            {chainData.autoState.enabled ? '||' : '>'}
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => {
                              setChainsMap(prev => { const m = new Map(prev); m.delete(chainId); return m; });
                            }}
                            className="px-1.5 py-0.5 text-xs text-[#ff4444] border border-[#ff4444]/30 hover:bg-[#ff4444]/10 transition-colors"
                            title="Remove chain"
                          >
                            X
                          </button>
                          {/* Mempool link */}
                          {chainData.cpfpData.lastTxid && (
                            <a
                              href={`https://mempool.space/tx/${chainData.cpfpData.lastTxid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-1.5 py-0.5 text-xs text-orange-500 border border-orange-500/30 hover:bg-orange-500/10 transition-colors"
                              title={chainId}
                            >
                              MP
                            </a>
                          )}
                        </div>
                      </div>
                      {/* Status text */}
                      {chainData.autoState.status && (
                        <div className={`px-4 py-1 text-xs border-b border-[#151515] ${
                          chainData.autoState.status.startsWith('ERROR') || chainData.autoState.status.startsWith('RBF ERROR')
                            ? 'text-[#ff4444] bg-[#1a0a0a]'
                            : chainData.autoState.status.startsWith('LIMIT')
                              ? 'text-[#ff44ff] bg-[#1a0a1a]'
                              : chainData.autoState.status.startsWith('MINTING') || chainData.autoState.status.startsWith('RBF:')
                                ? 'text-[#ffcc00] bg-[#1a1500]'
                                : chainData.autoState.status.startsWith('CONFIRMED')
                                  ? 'text-[#00d4ff] bg-[#0a0a1a]'
                                  : 'text-[#707070] bg-[#0d0d0d]'
                        }`}>
                          {chainData.autoState.status}
                        </div>
                      )}
                      {/* Expandable config editor */}
                      {isExpanded && (
                        <div className="px-4 py-2 bg-[#080808] border-b border-[#252525]">
                          <ChainConfigEditor
                            config={chainData.config}
                            onChange={(newConfig) => {
                              setChainsMap(prev => {
                                const newMap = new Map(prev);
                                const c = prev.get(chainId);
                                if (!c) return prev;
                                newMap.set(chainId, { ...c, config: newConfig });
                                return newMap;
                              });
                            }}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="px-4 py-4 text-center text-[#505050] text-xs">
              No chains. Click [+ CHAIN] to start.
            </div>
          )}
        </div>
      )}

      <div className="mt-2 sm:mt-3 text-xs text-[#404040] border-t border-[#1a1a1a] pt-2">
        <div className="tracking-wider">TURBO DIESEL TERMINAL <span className="text-[#505050] italic">v13</span></div>
      </div>


      {/* Wallet Sidebar */}
      <TerminalWalletSidebar
        isVisible={walletSidebarVisible}
        isClosing={walletSidebarClosing}
        onClose={closeWalletSidebar}
        isConnected={isConnected}
        address={address}
        wallet={wallet}
        hasKeystore={hasStoredKeystore}
        balances={balances}
        onUnlock={handleUnlock}
        onRestore={handleRestore}
        onCreate={handleCreate}
        onDisconnect={() => { disconnect(); setChainsMap(new Map()); }}
        unlockWallet={unlockWallet}
        isLoading={walletLoading}
        error={walletError}
        availableUtxos={availableUtxos}
        loadingUtxos={loadingUtxos}
        currentFeeRate={mempoolStats?.minFee || 0}
        onSplitUtxo={handleSplitUtxo}
        onRefreshUtxos={fetchUtxos}
        onGetSwapQuote={handleGetSwapQuote}
        dieselBalance={dieselBalance}
        frbtcBalance={frbtcBalance}
      />
    </div>
  );
};

export default DieselTerminal;

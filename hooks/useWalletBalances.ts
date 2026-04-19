'use client';

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface TokenBalance {
  runeId: string;
  symbol: string;
  name: string;
  balance: string;           // Raw balance as string (for BigInt)
  balanceFormatted: number;  // Human-readable balance
  decimals: number;
}

export interface RuneBalance {
  runeId: string;
  runeName: string;
  spacedName: string;
  balance: string;
  balanceFormatted: number;
  decimals: number;
  symbol: string;
}

export interface WalletBalancesResponse {
  btcBalance: number;           // BTC balance in satoshis
  btcBalanceFormatted: string;  // BTC balance formatted
  btcBalanceAvailable: boolean; // Whether BTC balance was successfully fetched
  tokens: TokenBalance[];       // Alkanes tokens
  runes: RuneBalance[];         // Bitcoin Runes (via Hiro API)
  address: string;
  timestamp: number;
}

// WebProvider type from WASM module
type WebProvider = import('@alkanes/ts-sdk/wasm').WebProvider;

/** Singleton provider for read-only operations */
let providerInstance: WebProvider | null = null;
let providerInitPromise: Promise<WebProvider> | null = null;

/** Cache for token metadata to avoid repeated RPC calls */
const tokenMetadataCache: Map<string, { name: string; symbol: string; decimals: number }> = new Map();

/** Known tokens with hardcoded metadata */
const KNOWN_TOKENS: Record<string, { name: string; symbol: string; decimals: number }> = {
  '2:0': { name: 'DIESEL', symbol: 'DIESEL', decimals: 8 },
  '32:0': { name: 'frBTC', symbol: 'frBTC', decimals: 8 },
};

/** Convert WASM Map responses to plain objects (serde_wasm_bindgen returns Maps) */
function mapToObject(value: any): any {
  if (value instanceof Map) {
    const obj: Record<string, any> = {};
    for (const [k, v] of value.entries()) {
      obj[k] = mapToObject(v);
    }
    return obj;
  }
  if (Array.isArray(value)) {
    return value.map(mapToObject);
  }
  return value;
}

/** Extract enriched data from WASM provider response (handles Map and plain object) */
function extractEnrichedData(rawResult: any): { spendable: any[]; assets: any[]; pending: any[] } | null {
  if (!rawResult) return null;

  let enrichedData: any;
  if (rawResult instanceof Map) {
    const returns = rawResult.get('returns');
    enrichedData = mapToObject(returns);
  } else {
    enrichedData = rawResult?.returns || rawResult;
  }

  if (!enrichedData) return null;

  // Convert any nested Maps in arrays
  const toArray = (val: any): any[] => {
    if (Array.isArray(val)) return val.map(mapToObject);
    if (val && typeof val === 'object' && Object.keys(val).length > 0) {
      return Object.values(val).map(mapToObject);
    }
    return [];
  };

  return {
    spendable: toArray(enrichedData.spendable),
    assets: toArray(enrichedData.assets),
    pending: toArray(enrichedData.pending),
  };
}

async function getProvider(): Promise<WebProvider> {
  if (providerInstance) {
    return providerInstance;
  }

  if (providerInitPromise) {
    return providerInitPromise;
  }

  providerInitPromise = (async () => {
    try {
      // Import WASM module directly from local copy
      const wasm = await import('@alkanes/ts-sdk/wasm');

      // Create WebProvider directly (no AlkanesProvider.initialize() needed)
      const provider = new wasm.WebProvider('mainnet', {
        jsonrpc_url: process.env.NEXT_PUBLIC_ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/buildalkanes',
        data_api_url: process.env.NEXT_PUBLIC_ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/buildalkanes',
      });

      console.log('[useWalletBalances] WebProvider created successfully');
      providerInstance = provider;
      return provider;
    } catch (error) {
      // Reset so next call retries instead of returning cached rejected promise
      providerInitPromise = null;
      console.error('[useWalletBalances] Failed to create WebProvider:', error);
      throw error;
    }
  })();

  return providerInitPromise;
}

/**
 * Get token metadata (uses known tokens first, then cache, then API fallback)
 */
async function getTokenMetadata(runeId: string): Promise<{ name: string; symbol: string; decimals: number }> {
  // Check known tokens first
  if (KNOWN_TOKENS[runeId]) {
    return KNOWN_TOKENS[runeId];
  }

  // Check cache
  const cached = tokenMetadataCache.get(runeId);
  if (cached) {
    return cached;
  }

  // Fallback to runeId as name/symbol
  const fallback = { name: runeId, symbol: runeId, decimals: 8 };
  tokenMetadataCache.set(runeId, fallback);
  return fallback;
}

/**
 * Fetch Runes balances from Hiro API
 */
async function fetchRunesBalances(address: string): Promise<RuneBalance[]> {
  try {
    const res = await fetch(
      `https://api.hiro.so/runes/v1/addresses/${address}/balances?offset=0&limit=60`
    );
    if (!res.ok) {
      console.warn('[useWalletBalances] Hiro API error:', res.status);
      return [];
    }
    const data = await res.json();

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((item: any) => {
      const decimals = item.rune?.divisibility ?? 0;
      const balance = item.balance || '0';
      const balanceNum = Number(balance) / Math.pow(10, decimals);

      return {
        runeId: `${item.rune?.id || item.rune_id || ''}`,
        runeName: item.rune?.name || '',
        spacedName: item.rune?.spaced_name || item.rune?.name || '',
        balance,
        balanceFormatted: balanceNum,
        decimals,
        symbol: item.rune?.symbol || '',
      };
    });
  } catch (error) {
    console.warn('[useWalletBalances] Failed to fetch runes:', error);
    return [];
  }
}

/**
 * Fetch alkanes balances via alkanes_protorunesbyaddress RPC
 * (balances.lua doesn't reliably return alkanes, so we fetch them separately like subfrost-app does)
 */
let lastAlkaneBalances: Array<{ runeId: string; balance: string }> = [];

async function fetchAlkanesBalances(address: string): Promise<Array<{ runeId: string; balance: string }>> {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/buildalkanes';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alkanes_protorunesbyaddress',
        params: [{ address, protocolTag: '1' }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return lastAlkaneBalances;

    const data = await res.json();
    if (data.error || !data.result?.outpoints) return lastAlkaneBalances;

    // Aggregate balances by alkane ID from all outpoints
    const balanceMap = new Map<string, bigint>();
    for (const outpoint of data.result.outpoints) {
      const balances = outpoint.balance_sheet?.cached?.balances || [];
      for (const bal of balances) {
        const runeId = `${bal.block}:${bal.tx}`;
        const amount = BigInt(bal.amount || 0);
        balanceMap.set(runeId, (balanceMap.get(runeId) || BigInt(0)) + amount);
      }
    }

    const result = Array.from(balanceMap, ([runeId, balance]) => ({ runeId, balance: balance.toString() }));
    if (result.length > 0) lastAlkaneBalances = result;
    return result;
  } catch (error) {
    console.warn('[useWalletBalances] fetchAlkanesBalances failed:', error);
    return lastAlkaneBalances;
  }
}

/**
 * Fetch wallet balances using the WebProvider directly (client-side)
 */
async function fetchWalletBalances(address: string): Promise<WalletBalancesResponse> {
  try {
    const provider = await getProvider();

    // Fetch all data in parallel (like subfrost-app does):
    // 1. getEnrichedBalances for BTC UTXOs
    // 2. alkanes_protorunesbyaddress for alkanes (separate call, more reliable)
    // 3. Hiro API for runes
    // Race getEnrichedBalances against a 10s timeout — the underlying lua_evalscript
    // calls metashrew_height() which can hang 60+s on 504. Fast timeout lets us fall
    // through to the esplora fallback without blocking token display.
    const enrichedWithTimeout = Promise.race([
      provider.getEnrichedBalances(address),
      new Promise<null>((resolve) => setTimeout(() => {
        console.warn('[useWalletBalances] getEnrichedBalances timed out after 5s');
        resolve(null);
      }, 5000)),
    ]).catch((err: Error) => {
      console.warn('[useWalletBalances] getEnrichedBalances failed:', err);
      return null;
    });

    const [rawEnrichedData, alkaneBalances, runesBalances] = await Promise.all([
      enrichedWithTimeout,
      fetchAlkanesBalances(address),
      fetchRunesBalances(address),
    ]);

    let btcBalance = 0;
    let btcBalanceAvailable = false;

    // Extract and normalize the enriched data (handles Map responses from WASM)
    const enrichedData = extractEnrichedData(rawEnrichedData);

    if (enrichedData) {
      const allUtxos = [...enrichedData.spendable, ...enrichedData.assets, ...enrichedData.pending];
      // Sum BTC from all UTXOs (spendable + assets + pending)
      for (const utxo of allUtxos) {
        btcBalance += utxo.value || 0;
      }
      // Cross-check: if we have alkanes tokens but zero BTC UTXOs, the balance RPC
      // likely failed (tokens are bound to UTXOs, so having tokens with 0 BTC is impossible)
      const hasTokens = alkaneBalances.length > 0;
      btcBalanceAvailable = allUtxos.length > 0 || !hasTokens;
    }

    // Fallback: if no enriched data, try esplora for BTC balance
    if (!btcBalanceAvailable) {
      try {
        const rawUtxos = await provider.getAddressUtxos(address);
        if (Array.isArray(rawUtxos)) {
          // WASM (serde_wasm_bindgen) may return Map objects instead of plain objects
          const utxos = rawUtxos.map(mapToObject);
          btcBalance = utxos.reduce((sum: number, utxo: any) => sum + (utxo.value || 0), 0);
          btcBalanceAvailable = utxos.length > 0 || !alkaneBalances.length;
        }
      } catch (err) {
        console.warn('[useWalletBalances] esplora fallback failed:', err);
      }
    }

    // Fetch metadata for all tokens in parallel
    const tokensWithMeta = await Promise.all(
      alkaneBalances.map(async (ab: any) => {
        const runeId = ab.runeId;
        const metadata = await getTokenMetadata(runeId);
        const balanceValue = typeof ab.balance === 'bigint' ? ab.balance : BigInt(ab.balance || 0);

        return {
          runeId,
          symbol: metadata.symbol,
          name: metadata.name,
          balance: balanceValue.toString(),
          balanceFormatted: Number(balanceValue) / Math.pow(10, metadata.decimals),
          decimals: metadata.decimals,
        };
      })
    );

    // Sort tokens: DIESEL first, then by balance
    tokensWithMeta.sort((a, b) => {
      // DIESEL (2:0) always first
      if (a.runeId === '2:0') return -1;
      if (b.runeId === '2:0') return 1;
      // Then by formatted balance descending
      return b.balanceFormatted - a.balanceFormatted;
    });

    // Sort runes: UNCOMMON•GOODS first, then by balance
    runesBalances.sort((a, b) => {
      if (a.spacedName === 'UNCOMMON•GOODS') return -1;
      if (b.spacedName === 'UNCOMMON•GOODS') return 1;
      return b.balanceFormatted - a.balanceFormatted;
    });

    return {
      btcBalance,
      btcBalanceFormatted: (btcBalance / 100000000).toFixed(8),
      btcBalanceAvailable,
      tokens: tokensWithMeta,
      runes: runesBalances,
      address,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[useWalletBalances] Error fetching balances:', error);
    throw error;
  }
}

/**
 * Hook to fetch wallet balances (BTC + alkane tokens)
 *
 * @param address - Bitcoin address to fetch balances for
 * @param enabled - Whether to enable the query (default: true when address is provided)
 */
export function useWalletBalances(address: string | undefined, enabled = true) {
  const isEnabled = enabled && !!address;

  return useQuery({
    queryKey: ['walletBalances', address],
    queryFn: () => fetchWalletBalances(address!),
    enabled: isEnabled,
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    refetchIntervalInBackground: true, // Continue refreshing even when tab is not focused
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });
}

/**
 * Format a balance with appropriate precision
 */
export function formatBalance(balance: number, decimals = 8): string {
  if (balance === 0) return '0';

  if (balance >= 1000000) {
    return `${(balance / 1000000).toFixed(2)}M`;
  }
  if (balance >= 1000) {
    return `${(balance / 1000).toFixed(2)}K`;
  }
  if (balance >= 1) {
    return balance.toFixed(Math.min(decimals, 4));
  }
  return balance.toFixed(Math.min(decimals, 8));
}

/**
 * Format BTC balance
 */
export function formatBtcBalance(satoshis: number, omitUnit = false): string {
  const btc = satoshis / 100000000;
  if (btc === 0) return omitUnit ? '0' : '0 BTC';
  if (btc >= 1) return omitUnit ? btc.toFixed(4) : `${btc.toFixed(4)} BTC`;
  if (btc >= 0.001) return omitUnit ? btc.toFixed(6) : `${btc.toFixed(6)} BTC`;
  return `${satoshis.toLocaleString()} sats`;
}

export interface MergedBalances {
  btcBalance: number;
  btcBalanceFormatted: string;
  btcBalanceAvailable: boolean;
  tokens: TokenBalance[];
  address: string;
  timestamp: number;
}

/**
 * Merge balances from primary (taproot) and payment (segwit) addresses
 */
export function mergeBalances(
  primary: WalletBalancesResponse | undefined,
  payment: WalletBalancesResponse | undefined,
): MergedBalances | null {
  if (!primary && !payment) return null;

  const p = primary || { btcBalance: 0, btcBalanceFormatted: '0', btcBalanceAvailable: false, tokens: [] as TokenBalance[], address: '', timestamp: 0 };
  if (!payment) return { btcBalance: p.btcBalance, btcBalanceFormatted: p.btcBalanceFormatted, btcBalanceAvailable: p.btcBalanceAvailable, tokens: p.tokens, address: p.address, timestamp: p.timestamp };

  const totalBtc = p.btcBalance + payment.btcBalance;
  const tokenMap = new Map<string, TokenBalance>();

  for (const token of p.tokens) tokenMap.set(token.runeId, token);
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
    btcBalanceAvailable: p.btcBalanceAvailable || payment.btcBalanceAvailable,
    tokens: Array.from(tokenMap.values()),
    address: p.address,
    timestamp: Date.now(),
  };
}

/**
 * Hook that fetches and merges balances from both primary and payment addresses
 */
export function useMergedWalletBalances(address: string | undefined, paymentAddress: string | undefined) {
  const { data: balances, isLoading: balancesLoading, isFetching: balancesFetching, refetch: refetchBalances } = useWalletBalances(address);
  const { data: paymentBalances, isLoading: paymentLoading, isFetching: paymentFetching, refetch: refetchPayment } = useWalletBalances(
    paymentAddress !== address ? paymentAddress : undefined
  );

  const merged = useMemo(() => mergeBalances(balances, paymentBalances), [balances, paymentBalances]);

  const isLoading = balancesLoading || paymentLoading;
  const isFetching = balancesFetching || paymentFetching;

  const refetch = useCallback(() => {
    refetchBalances();
    if (paymentAddress !== address) refetchPayment();
  }, [refetchBalances, refetchPayment, paymentAddress, address]);

  return { data: merged, isLoading, isFetching, refetch };
}

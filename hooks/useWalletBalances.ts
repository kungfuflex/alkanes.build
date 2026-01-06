'use client';

import { useQuery } from '@tanstack/react-query';
import { AlkanesProvider } from '@alkanes/ts-sdk';

export interface TokenBalance {
  runeId: string;
  symbol: string;
  name: string;
  balance: string;           // Raw balance as string (for BigInt)
  balanceFormatted: number;  // Human-readable balance
  decimals: number;
}

export interface WalletBalancesResponse {
  btcBalance: number;           // BTC balance in satoshis
  btcBalanceFormatted: string;  // BTC balance formatted
  tokens: TokenBalance[];
  address: string;
  timestamp: number;
}

/** Singleton provider for read-only operations */
let providerInstance: AlkanesProvider | null = null;
let providerInitPromise: Promise<AlkanesProvider> | null = null;

/** Cache for token metadata to avoid repeated RPC calls */
const tokenMetadataCache: Map<string, { name: string; symbol: string; decimals: number }> = new Map();

async function getProvider(): Promise<AlkanesProvider> {
  if (providerInstance) {
    return providerInstance;
  }

  if (providerInitPromise) {
    return providerInitPromise;
  }

  providerInitPromise = (async () => {
    console.log('[useWalletBalances] Initializing AlkanesProvider...');
    try {
      const provider = new AlkanesProvider({
        network: 'mainnet',
        rpcUrl: process.env.NEXT_PUBLIC_ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/buildalkanes'
      });
      await provider.initialize();
      console.log('[useWalletBalances] AlkanesProvider initialized successfully');
      providerInstance = provider;
      return provider;
    } catch (error) {
      console.error('[useWalletBalances] Failed to initialize provider:', error);
      throw error;
    }
  })();

  return providerInitPromise;
}

/**
 * Fetch token metadata using reflect API
 * Results are cached to avoid repeated calls
 */
async function getTokenMetadata(provider: AlkanesProvider, runeId: string): Promise<{ name: string; symbol: string; decimals: number }> {
  // Check cache first
  const cached = tokenMetadataCache.get(runeId);
  if (cached) {
    return cached;
  }

  try {
    const meta = await provider.alkanes.reflect(runeId);
    const metadata = {
      name: meta.name || runeId,
      symbol: meta.symbol || runeId,
      decimals: meta.decimals ?? 8,
    };
    tokenMetadataCache.set(runeId, metadata);
    return metadata;
  } catch (error) {
    // If reflect fails, return defaults
    console.warn(`Failed to fetch metadata for ${runeId}:`, error);
    const fallback = { name: runeId, symbol: runeId, decimals: 8 };
    tokenMetadataCache.set(runeId, fallback);
    return fallback;
  }
}

/**
 * Fetch wallet balances using the SDK directly (client-side)
 * This bypasses the API route and uses the SDK's WASM-based protobuf decoding
 */
async function fetchWalletBalances(address: string): Promise<WalletBalancesResponse> {
  console.log('[useWalletBalances] Fetching balances for:', address);

  try {
    const provider = await getProvider();
    console.log('[useWalletBalances] Provider ready');

    // Fetch BTC balance and alkane balances in parallel
    const [utxos, alkaneBalances] = await Promise.all([
      provider.esplora.getAddressUtxos(address),
      provider.alkanes.getBalance(address),
    ]);

    console.log('[useWalletBalances] UTXOs:', utxos.length);
    console.log('[useWalletBalances] Alkane balances:', alkaneBalances.length, alkaneBalances);

    // Calculate BTC balance from UTXOs
    const btcBalance = utxos.reduce((sum, utxo) => sum + (utxo.value || 0), 0);

    // Fetch metadata for all tokens in parallel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokensWithMeta = await Promise.all(
      alkaneBalances.map(async (ab: any) => {
        const runeId = `${ab.alkane_id.block}:${ab.alkane_id.tx}`;
        const metadata = await getTokenMetadata(provider, runeId);
        const balanceValue = typeof ab.balance === 'bigint' ? ab.balance : BigInt(ab.balance);

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

    console.log('[useWalletBalances] Final tokens:', tokensWithMeta);

    return {
      btcBalance,
      btcBalanceFormatted: (btcBalance / 100000000).toFixed(8),
      tokens: tokensWithMeta,
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

  // Debug: Log when the hook is called and what its state is
  console.log('[useWalletBalances] Hook called:', {
    address: address?.slice(0, 20) + '...',
    enabled,
    isEnabled,
    hasAddress: !!address
  });

  return useQuery({
    queryKey: ['walletBalances', address],
    queryFn: () => {
      console.log('[useWalletBalances] queryFn executing for:', address);
      return fetchWalletBalances(address!);
    },
    enabled: isEnabled,
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Refresh every minute
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
export function formatBtcBalance(satoshis: number): string {
  const btc = satoshis / 100000000;
  if (btc === 0) return '0 BTC';
  if (btc >= 1) return `${btc.toFixed(4)} BTC`;
  if (btc >= 0.001) return `${btc.toFixed(6)} BTC`;
  return `${satoshis.toLocaleString()} sats`;
}

/**
 * Utility functions for Alkanes SDK
 */
import * as bitcoin from 'bitcoinjs-lib';
import { NetworkType, AlkaneId } from '../types';
/**
 * Convert network type string to bitcoinjs-lib network object
 */
export declare function getNetwork(networkType: NetworkType): bitcoin.networks.Network;
/**
 * Validate Bitcoin address for a specific network
 */
export declare function validateAddress(address: string, network?: bitcoin.networks.Network): boolean;
/**
 * Convert satoshis to BTC
 */
export declare function satoshisToBTC(satoshis: number): number;
/**
 * Convert BTC to satoshis
 */
export declare function btcToSatoshis(btc: number): number;
/**
 * Format AlkaneId as string
 */
export declare function formatAlkaneId(id: AlkaneId): string;
/**
 * Parse AlkaneId from string
 */
export declare function parseAlkaneId(idString: string): AlkaneId;
/**
 * Wait for a specific amount of time
 */
export declare function delay(ms: number): Promise<void>;
/**
 * Retry a function with exponential backoff
 */
export declare function retry<T>(fn: () => Promise<T>, maxAttempts?: number, delayMs?: number): Promise<T>;
/**
 * Calculate transaction fee for given size and fee rate
 */
export declare function calculateFee(vsize: number, feeRate: number): number;
/**
 * Estimate transaction vsize
 */
export declare function estimateTxSize(inputCount: number, outputCount: number, inputType?: 'legacy' | 'segwit' | 'taproot'): number;
/**
 * Convert hex string to Uint8Array
 */
export declare function hexToBytes(hex: string): Uint8Array;
/**
 * Convert Uint8Array to hex string
 */
export declare function bytesToHex(bytes: Uint8Array): string;
/**
 * Reverse byte order (for block hashes, txids, etc.)
 */
export declare function reverseBytes(bytes: Uint8Array): Uint8Array;
/**
 * Convert little-endian hex to big-endian
 */
export declare function reversedHex(hex: string): string;
/**
 * Check if running in browser
 */
export declare function isBrowser(): boolean;
/**
 * Check if running in Node.js
 */
export declare function isNode(): boolean;
/**
 * Safe JSON parse with error handling
 */
export declare function safeJsonParse<T>(json: string, defaultValue?: T): T | null;
/**
 * Format timestamp to readable date
 */
export declare function formatTimestamp(timestamp: number): string;
/**
 * Calculate transaction weight
 */
export declare function calculateWeight(baseSize: number, witnessSize: number): number;
/**
 * Convert weight to vsize
 */
export declare function weightToVsize(weight: number): number;
//# sourceMappingURL=index.d.ts.map
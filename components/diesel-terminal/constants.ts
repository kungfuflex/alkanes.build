import type { ChainConfig, ChainAutoState, RbfData, CpfpData } from './types';

// localStorage keys for chain persistence
export const LOCALSTORAGE_CHAINS_KEY = 'diesel-terminal-chains';
export const LOCALSTORAGE_SETTINGS_KEY = 'diesel-terminal-settings';

// Fixed vsize for DIESEL mint transaction (P2TR input + P2TR output + OP_RETURN)
export const TX_VSIZE = 141;

// Bitcoin mempool limit for unconfirmed chain length
export const MAX_CHAIN_LENGTH = 25;

// Max time to wait for fresh fees after confirmation (3 refresh cycles)
export const FRESH_FEE_TIMEOUT_MS = 30_000;

// DIESEL protocol fee (5%)
export const DIESEL_FEE = 0.05;

// DIESEL base reward
export const DIESEL_BASE_REWARD = 3.125;
export const DIESEL_BASE_REWARD_SATS = 312_500_000;

// Bitcoin RBF incremental relay fee
export const INCREMENTAL_RELAY_FEE = 1; // sat/vB

// Default config for new chains
export const DEFAULT_CHAIN_CONFIG: ChainConfig = {
  mintCount: 20,
  minRate: 0.15,
  maxRate: 2.3,
  fixedFeeRate: null,
  autoRbf: true,
  rbfBuffer: 10,
  autoRestart: true,
};

// Empty auto-state for new chains
export function emptyAutoState(): ChainAutoState {
  return {
    enabled: false,
    triggered: false,
    rbfTriggered: false,
    waitingForFreshFees: false,
    feeAtConfirmation: null,
    waitStartTime: null,
    status: null,
    errorCount: 0,
    lastErrorTime: null,
  };
}

// Empty RBF data
export function emptyRbfData(): RbfData {
  return {
    lastTxInput: { txid: '', vout: 0, value: 0 },
    lastTxFee: 0,
    chainLength: 0,
    totalVsize: 0,
    feesExcludingLast: 0,
    totalFees: 0,
    preRbfTotalFees: null,
    preRbfLastTxid: null,
  };
}

// Empty CPFP data
export function emptyCpfpData(): CpfpData {
  return {
    lastTxid: '',
    lastOutputValue: 0,
    lastRawTxHex: '',
  };
}

// Delay between error retries (15 seconds)
export const ERROR_RETRY_DELAY_MS = 15_000;

// Float comparison epsilon
export const EPSILON = 0.001;

// Split UTXO transaction sizing (P2TR)
export const SPLIT_TX_BASE_VSIZE = 68;  // Header + 1 P2TR input
export const P2TR_OUTPUT_VSIZE = 43;    // Per P2TR output
export const DIESEL_OPRETURN_VSIZE = 30; // OP_RETURN output: 8 (value) + 1 (scriptLen) + 21 (script)
export const P2TR_DUST_LIMIT = 330;     // Taproot dust limit
export const MAX_SPLIT_OUTPUTS = 10;    // Max outputs per split

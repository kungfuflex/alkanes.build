export interface UtxoInput {
  txid: string;
  vout: number;
  value: number;
  rawTxHex?: string;
  confirmed?: boolean;
  ancestorCount?: number; // from getmempoolentry (unconfirmed only)
}

export type RbfData = {
  lastTxInput: UtxoInput;
  lastTxFee: number;
  chainLength: number;
  totalVsize: number;
  feesExcludingLast: number;
  totalFees: number;
  preRbfTotalFees: number | null; // Fees before first RBF (null = no RBF yet)
  preRbfLastTxid: string | null;  // Last txid before first RBF (null = no RBF yet)
};

export type CpfpData = {
  lastTxid: string;
  lastOutputValue: number;
  lastRawTxHex: string;
};

// Per-chain config
export type ChainConfig = {
  mintCount: number;      // TXs per chain (1-25)
  minRate: number;        // Min fee rate sat/vB
  maxRate: number;        // Max fee rate sat/vB
  fixedFeeRate: number | null; // Fixed fee rate (null = use mempool rate with min/max range)
  autoRbf: boolean;       // Auto-RBF toggle
  rbfBuffer: number;      // RBF % buffer
  autoRestart: boolean;   // Restart after confirmation
};

// Per-chain auto-mint state machine
export type ChainAutoState = {
  enabled: boolean;
  triggered: boolean;
  rbfTriggered: boolean;
  waitingForFreshFees: boolean;
  feeAtConfirmation: number | null;
  waitStartTime: number | null;
  status: string | null;
  errorCount: number;  // Consecutive errors — stops retrying at 3
  lastErrorTime: number | null; // Timestamp of last error — 15s cooldown between retries
};

export type ChainData = {
  mintResult: { txids: string[]; totalFee: number };
  rbfData: RbfData;
  cpfpData: CpfpData;
  config: ChainConfig;
  autoState: ChainAutoState;
  sourceUtxo?: UtxoInput; // For restart (change output)
  boundUtxo?: UtxoInput;  // UTXO bound at mint time (undefined until first mint)
};

// Action queue
export type ActionType = 'mint' | 'rbf' | 'cpfp';

export type ActionQueueItem = {
  chainId: string;
  type: ActionType;
  params: {
    mintCount?: number;
    feeRate?: number;
    targetRate?: number;
  };
};

// Persisted chain data for localStorage
export type PersistedChainConfig = {
  id: string;       // chain-{N}
  config: ChainConfig;
  // Full chain state (optional for backward compat with older saves)
  mintResult?: { txids: string[]; totalFee: number };
  rbfData?: RbfData;
  cpfpData?: CpfpData;
  boundUtxo?: UtxoInput;
  sourceUtxo?: UtxoInput;
  autoEnabled?: boolean;
};

export type MintResult = {
  txids: string[];
  totalFee: number;
};

export type SwapQuote = {
  amountIn: string;
  amountOut: string;
  route: string;
  feeBps: number;
  hops: number;
  error?: string;
};

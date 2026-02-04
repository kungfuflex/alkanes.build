'use client';

import { useState, useEffect, useRef } from 'react';

interface AutoMintPanelProps {
  // Current state
  currentFeeRate: number;          // Current mempool fee rate (sat/vB)
  currentEffectiveRate: number;    // Current chain effective rate (sat/vB)
  hasActiveChain: boolean;         // Whether there's an active unconfirmed chain
  chainLength: number;             // Current chain length (0-25)
  chainsCount: number;             // Number of active chains
  totalChainsTx: number;           // Total TX across all chains
  isConnected: boolean;            // Wallet connected
  isMinting: boolean;              // Currently minting
  isRbfing: boolean;               // Currently doing RBF

  // Strategy params for profit calculation
  blockReward: number;             // Block reward in DIESEL (R)
  dieselPrice: number;             // DIESEL price in satoshis (p)
  competition: number;             // Number of competing mints (M)

  // Actions
  onMint: (count: number, feeRate: number) => Promise<void>;
  onRbf: (targetRate: number) => Promise<void>;
  onCpfp: (targetRate: number) => Promise<void>;
}

const MAX_CHAIN_LENGTH = 25;

const TX_VSIZE = 141;
const DIESEL_FEE = 0.05;

export function AutoMintPanel({
  currentFeeRate,
  currentEffectiveRate,
  hasActiveChain,
  chainLength,
  chainsCount,
  totalChainsTx,
  isConnected,
  isMinting,
  isRbfing,
  blockReward,
  dieselPrice,
  competition,
  onMint,
  onRbf,
  onCpfp,
}: AutoMintPanelProps) {
  // Auto-mint settings
  const [enabled, setEnabled] = useState(false);
  const [autoRbf, setAutoRbf] = useState(true);  // Auto-RBF when chain rate drops
  const [minRate, setMinRate] = useState('0.15');
  const [maxRate, setMaxRate] = useState('2.3');
  const [mintCount, setMintCount] = useState('20');
  const [rbfBuffer, setRbfBuffer] = useState('10');  // RBF buffer % above mempool rate
  const [status, setStatus] = useState<string | null>(null);

  // Track if we've already triggered for current conditions
  const [triggered, setTriggered] = useState(false);
  const [rbfTriggered, setRbfTriggered] = useState(false);

  // Parse values (replace comma with dot for locales that use comma as decimal separator)
  const minRateNum = parseFloat(minRate.replace(',', '.')) || 0;
  const maxRateNum = parseFloat(maxRate.replace(',', '.')) || Infinity;
  const mintCountNum = Math.min(parseInt(mintCount) || 0, MAX_CHAIN_LENGTH);
  const rbfBufferNum = Math.max(0, parseInt(rbfBuffer) || 0);
  const rbfMultiplier = 1 + rbfBufferNum / 100;  // e.g., 10% -> 1.1

  // Check if fee rate is in range (with small epsilon for float comparison)
  const EPSILON = 0.001;
  const feeInRange = currentFeeRate >= (minRateNum - EPSILON) && currentFeeRate <= (maxRateNum + EPSILON);

  // Available slots in chain
  const availableSlots = MAX_CHAIN_LENGTH - chainLength;
  const effectiveMintCount = Math.min(mintCountNum, availableSlots);

  // Calculate profit metrics for ACTIVE chain
  // Use effectiveRate (what we're paying) for active chain, not mempool rate
  const activeRate = hasActiveChain && currentEffectiveRate > 0 ? currentEffectiveRate : currentFeeRate;
  const txCost = activeRate * TX_VSIZE;
  const pool = Math.max(0, blockReward - DIESEL_FEE);
  const M = Math.max(0, competition);
  // Use chainLength for active position, not effectiveMintCount
  const n = hasActiveChain ? chainLength : effectiveMintCount;
  const totalMints = n + M;

  const emission = n > 0 && totalMints > 0 ? (n / totalMints) * pool : 0;
  const costDiesel = n * (txCost / dieselPrice);
  const netProfit = emission - costDiesel;
  const netProfitSats = netProfit * dieselPrice;
  const totalCostSats = n * txCost;
  const roi = totalCostSats > 0 ? (netProfitSats / totalCostSats) * 100 : 0;
  const isProfitable = netProfit > 0;

  // Track previous hasActiveChain to detect when chain is confirmed
  const prevHasActiveChain = useRef(hasActiveChain);

  // Reset triggered state when conditions change
  useEffect(() => {
    if (!feeInRange || !enabled) {
      setTriggered(false);
      setRbfTriggered(false);
    }
  }, [feeInRange, enabled]);

  // Reset RBF triggered when effective rate catches up to target (mempool + buffer%)
  useEffect(() => {
    const targetRate = currentFeeRate * rbfMultiplier;
    if (currentEffectiveRate >= targetRate) {
      setRbfTriggered(false);
    }
  }, [currentEffectiveRate, currentFeeRate, rbfMultiplier]);

  // Reset triggered when chain is confirmed (hasActiveChain: true → false)
  useEffect(() => {
    if (prevHasActiveChain.current && !hasActiveChain) {
      // Chain was confirmed, reset ALL triggers to allow new cycle
      // Wait for mempool data to refresh before allowing new mint
      setStatus('CONFIRMED — refreshing fees...');
      const timer = setTimeout(() => {
        setTriggered(false);
        setRbfTriggered(false);
        setStatus(null);
      }, 2000); // 2 second delay to allow mempool refresh
      return () => clearTimeout(timer);
    }
    prevHasActiveChain.current = hasActiveChain;
  }, [hasActiveChain]);

  // Auto-mint logic
  useEffect(() => {
    // Block during RBF to prevent race conditions with stale UTXO data
    if (!enabled || !isConnected || isMinting || isRbfing || triggered) return;

    // If we have active chain, don't show WAIT - status is handled by separate useEffect
    if (hasActiveChain) return;

    // Check conditions for NEW mint
    if (!feeInRange) {
      if (currentFeeRate < minRateNum) {
        setStatus(`WAIT: ${currentFeeRate.toFixed(2)} < ${minRateNum.toFixed(2)} sat/vB`);
      } else {
        setStatus(`WAIT: ${currentFeeRate.toFixed(2)} > ${maxRateNum.toFixed(2)} sat/vB`);
      }
      return;
    }

    // Fee is in range, no active chain - start new mint
    if (effectiveMintCount > 0) {
      // No active chain - trigger initial mint
      setStatus(`MINTING ${effectiveMintCount} @ ${currentFeeRate.toFixed(2)} sat/vB...`);
      setTriggered(true);

      onMint(effectiveMintCount, currentFeeRate)
        .then(() => {
          // Reset RBF trigger for new chain
          setRbfTriggered(false);
          // Status will be updated by the ACTIVE branch on next tick
        })
        .catch((err) => {
          setStatus(`ERROR: ${err.message}`);
          setTriggered(false); // Allow retry on error
        });
    } else if (effectiveMintCount === 0) {
      setStatus(`CHAIN FULL: ${chainLength}/${MAX_CHAIN_LENGTH}`);
    }
  }, [
    enabled,
    autoRbf,
    isConnected,
    isMinting,
    isRbfing,
    triggered,
    rbfTriggered,
    feeInRange,
    hasActiveChain,
    chainLength,
    effectiveMintCount,
    currentFeeRate,
    currentEffectiveRate,
    minRateNum,
    maxRateNum,
    onMint,
    onRbf,
  ]);

  // Update status when disabled
  useEffect(() => {
    if (!enabled) {
      setStatus(null);
    }
  }, [enabled]);

  // Auto-RBF logic (runs independently of mint triggered state)
  // Triggers when EFF < NOW * rbfMultiplier and bumps to target
  useEffect(() => {
    if (!enabled || !autoRbf || !hasActiveChain || isMinting || isRbfing || rbfTriggered) return;
    if (!feeInRange) return;

    // Target rate with buffer % above current mempool
    const targetRate = currentFeeRate * rbfMultiplier;

    // Trigger RBF when effective rate drops below target (proactive bump)
    if (currentEffectiveRate < targetRate && currentEffectiveRate > 0) {
      setStatus(`RBF: ${currentEffectiveRate.toFixed(2)} → ${targetRate.toFixed(2)} sat/vB...`);
      setRbfTriggered(true);

      onRbf(targetRate)
        .then(() => {
          setStatus(`RBF OK: now @ ${targetRate.toFixed(2)} sat/vB`);
        })
        .catch((err) => {
          setStatus(`RBF ERROR: ${err.message}`);
          setRbfTriggered(false); // Allow retry on error
        });
    }
  }, [enabled, autoRbf, hasActiveChain, isMinting, isRbfing, rbfTriggered, feeInRange, currentEffectiveRate, currentFeeRate, rbfMultiplier, onRbf]);

  // Update status when waiting (chains info is in PENDING CHAINS section)
  useEffect(() => {
    if (!enabled || isMinting || isRbfing) return;

    if (chainsCount === 0) {
      setStatus('WAITING...');
    } else {
      // Don't show ACTIVE status here - it's already in PENDING CHAINS
      setStatus(null);
    }
  }, [enabled, chainsCount, isMinting, isRbfing]);

  if (!isConnected) return null;

  return (
    <div className="border-t border-[#252525]">
      {/* Header */}
      <div className="px-2 sm:px-4 py-2 bg-[#0d0d0d] border-b border-[#252525] flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm"><span className="text-orange-500 font-bold">2</span><span className="text-[#404040] mx-1">│</span><span className="text-[#e0e0e0] tracking-wide">AUTO-MINT</span></span>
          {enabled && (
            <span className={`w-2.5 h-2.5 ${feeInRange ? 'bg-[#00ff88] animate-pulse' : 'bg-[#ffcc00]'}`} />
          )}
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`px-4 py-1 text-sm font-bold border transition-colors tracking-wide ${
            enabled
              ? 'bg-orange-500 text-black border-orange-500 hover:bg-orange-400'
              : 'bg-transparent text-orange-500 border-orange-500 hover:bg-orange-500/10'
          }`}
        >
          {enabled ? 'STOP' : 'START'}
        </button>
      </div>

      {/* Settings */}
      <div className="px-2 sm:px-4 py-2 sm:py-3 space-y-2 sm:space-y-3 text-xs sm:text-sm">
        {/* Fee range row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-[#505050] w-12 sm:w-20 text-xs group relative cursor-help">
            <span className="border-b border-dotted border-[#505050]">FEE</span>
            <div className="absolute top-full left-0 mt-2 px-2 py-1.5 bg-[#1a1a1a] border border-[#404040] text-xs text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-48 pointer-events-none z-50 normal-case font-normal">
              Fee range (sat/vB). Mint only when mempool fee is within this range
            </div>
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={minRate}
            onChange={(e) => setMinRate(e.target.value)}
            className="w-14 sm:w-20 bg-[#0a0a0a] border border-[#303030] px-1 sm:px-2 py-1 text-[#e0e0e0] text-center focus:border-orange-500 focus:outline-none"
            placeholder="min"
          />
          <span className="text-[#303030]">—</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={maxRate}
            onChange={(e) => setMaxRate(e.target.value)}
            className="w-14 sm:w-20 bg-[#0a0a0a] border border-[#303030] px-1 sm:px-2 py-1 text-[#e0e0e0] text-center focus:border-orange-500 focus:outline-none"
            placeholder="max"
          />
          <span className="text-[#404040] text-xs">s/vB</span>

          {/* Current rate indicator */}
          <span className={`ml-auto flex items-center gap-1.5 group relative ${feeInRange ? 'text-[#00ff88]' : 'text-[#ffcc00]'}`}>
            <span className={`w-2 h-2 ${feeInRange ? 'bg-[#00ff88]' : 'bg-[#ffcc00]'}`}></span>
            {currentFeeRate.toFixed(2)}
            <div className="absolute top-full right-0 mt-2 px-2 py-1.5 bg-[#1a1a1a] border border-[#404040] text-xs text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-44 pointer-events-none z-50 normal-case font-normal">
              Current mempool fee rate. Green = in range, Yellow = outside
            </div>
          </span>
        </div>

        {/* Mint count row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-[#505050] w-12 sm:w-20 text-xs group relative cursor-help">
            <span className="border-b border-dotted border-[#505050]">MINTS</span>
            <div className="absolute top-full left-0 mt-2 px-2 py-1.5 bg-[#1a1a1a] border border-[#404040] text-xs text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-48 pointer-events-none z-50 normal-case font-normal">
              Number of chained mint TXs to create (max 25 due to mempool limit)
            </div>
          </span>
          <input
            type="number"
            step="1"
            min="1"
            max={MAX_CHAIN_LENGTH}
            value={mintCount}
            onChange={(e) => setMintCount(e.target.value)}
            className="w-14 sm:w-20 bg-[#0a0a0a] border border-[#303030] px-1 sm:px-2 py-1 text-[#e0e0e0] text-center focus:border-orange-500 focus:outline-none"
          />
          <span className="text-[#404040] text-xs">/{MAX_CHAIN_LENGTH}</span>
        </div>

        {/* Auto-RBF toggle */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-[#505050] w-12 sm:w-20 text-xs group relative cursor-help">
            <span className="border-b border-dotted border-[#505050]">RBF</span>
            <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-[#1a1a1a] border border-[#404040] text-xs text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-72 pointer-events-none z-50 normal-case font-normal">
              <div className="text-orange-500 font-bold mb-1">AUTO FEE BUMP</div>
              <div className="mb-2">Keeps your chain +buffer% above mempool</div>
              <div className="text-[#606060] border-t border-[#303030] pt-2 mt-2">
                <div>Example (buffer=10%):</div>
                <div>• Mempool: 1.0 → Target: 1.1 sat/vB</div>
                <div>• Your EFF: 1.05 {'<'} 1.1 → RBF triggers</div>
                <div>• Bumps to 1.1 sat/vB</div>
              </div>
            </div>
          </span>
          <button
            onClick={() => setAutoRbf(!autoRbf)}
            className={`relative w-12 h-6 border transition-colors ${
              autoRbf
                ? 'bg-orange-500/20 border-orange-500'
                : 'bg-[#151515] border-[#303030]'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 transition-all ${
              autoRbf
                ? 'right-1 bg-orange-500'
                : 'left-1 bg-[#404040]'
            }`} />
          </button>
          <span className={`text-xs ${autoRbf ? 'text-orange-500' : 'text-[#404040]'}`}>{autoRbf ? 'ON' : 'OFF'}</span>
          <span className="text-[#303030] text-xs">+</span>
          <input
            type="number"
            step="1"
            min="0"
            max="100"
            value={rbfBuffer}
            onChange={(e) => setRbfBuffer(String(Math.floor(Math.abs(parseInt(e.target.value) || 0))))}
            className="w-12 bg-[#0a0a0a] border border-[#303030] px-1 py-1 text-[#e0e0e0] text-center text-xs focus:border-orange-500 focus:outline-none"
          />
          <span className="text-[#404040] text-xs">%</span>
          {hasActiveChain && currentEffectiveRate > 0 && (
            <span className={`ml-auto flex items-center gap-1.5 group relative ${currentEffectiveRate >= currentFeeRate ? 'text-[#00ff88]' : 'text-[#ffcc00]'}`}>
              <span className="text-[#505050] text-xs border-b border-dotted border-[#505050] cursor-help">EFF</span>
              {currentEffectiveRate.toFixed(2)}
              <div className="absolute top-full right-0 mt-2 px-2 py-1.5 bg-[#1a1a1a] border border-[#404040] text-xs text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-48 pointer-events-none z-50 normal-case font-normal">
                Chain effective fee rate. Green = above mempool, Yellow = below
              </div>
            </span>
          )}
        </div>

        {/* Status row */}
        {status && (
          <div className={`text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 border-l-2 ${
            status.startsWith('ERROR') || status.startsWith('RBF ERROR')
              ? 'bg-[#1a0a0a] border-[#ff4444] text-[#ff4444]'
              : status.startsWith('MINTING') || status.startsWith('RBF:')
              ? 'bg-[#1a1500] border-[#ffcc00] text-[#ffcc00]'
              : status.startsWith('MINTED') || status.startsWith('RBF OK')
              ? 'bg-[#0a1a0a] border-[#00ff88] text-[#00ff88]'
              : status.startsWith('ACTIVE')
              ? 'bg-[#0a0a1a] border-[#00d4ff] text-[#00d4ff]'
              : 'bg-[#151515] border-[#404040] text-[#707070]'
          }`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';

interface AutoMintPanelProps {
  // Current state
  currentFeeRate: number;          // Current mempool fee rate (sat/vB)
  currentEffectiveRate: number;    // Current chain effective rate (sat/vB)
  hasActiveChain: boolean;         // Whether there's an active unconfirmed chain
  chainLength: number;             // Current chain length (0-25)
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
  const [maxRate, setMaxRate] = useState('1.0');
  const [mintCount, setMintCount] = useState('10');
  const [status, setStatus] = useState<string | null>(null);

  // Track if we've already triggered for current conditions
  const [triggered, setTriggered] = useState(false);
  const [rbfTriggered, setRbfTriggered] = useState(false);

  // Parse values (replace comma with dot for locales that use comma as decimal separator)
  const minRateNum = parseFloat(minRate.replace(',', '.')) || 0;
  const maxRateNum = parseFloat(maxRate.replace(',', '.')) || Infinity;
  const mintCountNum = Math.min(parseInt(mintCount) || 0, MAX_CHAIN_LENGTH);

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

  // Reset RBF triggered when effective rate catches up to target (mempool + 10%)
  useEffect(() => {
    const targetRate = currentFeeRate * 1.1;
    if (currentEffectiveRate >= targetRate) {
      setRbfTriggered(false);
    }
  }, [currentEffectiveRate, currentFeeRate]);

  // Reset triggered when chain is confirmed (hasActiveChain: true → false)
  useEffect(() => {
    if (prevHasActiveChain.current && !hasActiveChain) {
      // Chain was confirmed, reset ALL triggers to allow new cycle
      // Add small delay to ensure chain data is fully cleared
      setStatus('READY: chain confirmed, waiting...');
      const timer = setTimeout(() => {
        setTriggered(false);
        setRbfTriggered(false);
      }, 1000); // 1 second delay before allowing new mint
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
  // Triggers when EFF < NOW * 1.1 (10% buffer) and bumps to NOW * 1.1
  useEffect(() => {
    if (!enabled || !autoRbf || !hasActiveChain || isMinting || isRbfing || rbfTriggered) return;
    if (!feeInRange) return;

    // Target rate with 10% buffer above current mempool
    const targetRate = currentFeeRate * 1.1;

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
  }, [enabled, autoRbf, hasActiveChain, isMinting, isRbfing, rbfTriggered, feeInRange, currentEffectiveRate, currentFeeRate, onRbf]);

  // Update status for active chain (runs independently of triggered state)
  useEffect(() => {
    if (!enabled || !hasActiveChain || isMinting || isRbfing) return;

    // Show active chain status with 10% target indicator
    const targetRate = currentFeeRate * 1.1;
    const rateStatus = currentEffectiveRate < targetRate
      ? `⚠ ${currentEffectiveRate.toFixed(2)} < ${targetRate.toFixed(2)}`
      : `@ ${currentEffectiveRate.toFixed(2)} sat/vB`;
    setStatus(`ACTIVE: ${chainLength}/${MAX_CHAIN_LENGTH} TXs ${rateStatus}`);
  }, [enabled, hasActiveChain, chainLength, currentEffectiveRate, currentFeeRate, isMinting, isRbfing]);

  if (!isConnected) return null;

  return (
    <div className="border-t border-gray-700">
      {/* Header */}
      <div className="px-3 py-1.5 bg-gray-800/30 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${enabled ? 'text-green-400' : 'text-gray-400'}`}>
            AUTO-MINT
          </span>
          {enabled && (
            <span className={`w-2 h-2 rounded-full ${feeInRange ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          )}
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`px-2 py-0.5 text-xs font-bold rounded transition-colors ${
            enabled
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Settings */}
      <div className="px-3 py-2 space-y-2">
        {/* Fee range row */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 w-16">FEE RANGE</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={minRate}
            onChange={(e) => setMinRate(e.target.value)}
            className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-center focus:border-yellow-500 focus:outline-none"
            placeholder="min"
          />
          <span className="text-gray-500">-</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={maxRate}
            onChange={(e) => setMaxRate(e.target.value)}
            className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-center focus:border-yellow-500 focus:outline-none"
            placeholder="max"
          />
          <span className="text-gray-500">sat/vB</span>

          {/* Current rate indicator */}
          <span className={`ml-auto ${feeInRange ? 'text-green-400' : 'text-yellow-400'}`}>
            NOW: {currentFeeRate.toFixed(2)}
          </span>
        </div>

        {/* Mint count row */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 w-16">MINTS</span>
          <input
            type="number"
            step="1"
            min="1"
            max={MAX_CHAIN_LENGTH}
            value={mintCount}
            onChange={(e) => setMintCount(e.target.value)}
            className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-center focus:border-yellow-500 focus:outline-none"
          />
          <span className="text-gray-500">/ {MAX_CHAIN_LENGTH} max</span>

          {/* Available slots */}
          {hasActiveChain && (
            <span className="ml-auto text-gray-400">
              AVAILABLE: {availableSlots}
            </span>
          )}
        </div>

        {/* Auto-RBF toggle */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 w-16">AUTO-RBF</span>
          <button
            onClick={() => setAutoRbf(!autoRbf)}
            className={`px-2 py-0.5 text-xs font-bold rounded transition-colors ${
              autoRbf
                ? 'bg-yellow-600/50 text-yellow-300 hover:bg-yellow-600/70'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {autoRbf ? 'ON' : 'OFF'}
          </button>
          <span className="text-gray-600">bump when rate drops below mempool</span>
          {hasActiveChain && currentEffectiveRate > 0 && (
            <span className={`ml-auto ${currentEffectiveRate >= currentFeeRate ? 'text-green-400' : 'text-yellow-400'}`}>
              EFF: {currentEffectiveRate.toFixed(2)}
            </span>
          )}
        </div>

        {/* Profit calculation row - show for active chain */}
        {hasActiveChain && chainLength > 0 && (
          <div className="flex items-center gap-3 text-xs bg-gray-800/50 rounded px-2 py-1.5">
            <span className={`font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
              {isProfitable ? '●' : '○'} {roi >= 0 ? '+' : ''}{roi.toFixed(0)}% ROI
            </span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">
              EXP: <span className="text-cyan-400">{emission.toFixed(2)}</span> DSL
            </span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">
              COST: <span className="text-yellow-400">{Math.round(totalCostSats)}</span> sats
            </span>
            <span className="text-gray-500">|</span>
            <span className={`font-mono ${netProfitSats >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netProfitSats >= 0 ? '+' : ''}{Math.round(netProfitSats)} sats
            </span>
          </div>
        )}

        {/* Status row */}
        {status && (
          <div className={`text-xs px-2 py-1 rounded ${
            status.startsWith('ERROR') || status.startsWith('RBF ERROR')
              ? 'bg-red-900/30 text-red-400'
              : status.startsWith('MINTING') || status.startsWith('RBF:')
              ? 'bg-yellow-900/30 text-yellow-400'
              : status.startsWith('MINTED') || status.startsWith('RBF OK')
              ? 'bg-green-900/30 text-green-400'
              : status.startsWith('ACTIVE')
              ? 'bg-blue-900/30 text-blue-400'
              : 'bg-gray-800 text-gray-400'
          }`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useCallback } from 'react';
import type { ChainData, ChainAutoState, ActionType } from './types';
import { TX_VSIZE, FRESH_FEE_TIMEOUT_MS, ERROR_RETRY_DELAY_MS, EPSILON, MAX_CHAIN_LENGTH } from './constants';

interface MultiChainAutoMintParams {
  chainsMap: Map<string, ChainData>;
  setChainsMap: React.Dispatch<React.SetStateAction<Map<string, ChainData>>>;
  currentFeeRate: number;
  globalEnabled: boolean;
  isProcessingAction: boolean;
  sessionSpent: number;
  sessionLimit: number; // 0 = no limit
  enqueue: (item: { chainId: string; type: 'mint' | 'rbf' | 'cpfp'; params: { mintCount?: number; feeRate?: number; targetRate?: number } }) => void;
  hasAction: (chainId: string, type?: ActionType) => boolean;
}

export function useMultiChainAutoMint({
  chainsMap,
  setChainsMap,
  currentFeeRate,
  globalEnabled,
  isProcessingAction,
  sessionSpent,
  sessionLimit,
  enqueue,
  hasAction,
}: MultiChainAutoMintParams) {
  const freshFeeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of freshFeeTimers.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  // Helper to update a single chain's autoState
  const updateAutoState = useCallback((chainId: string, update: Partial<ChainAutoState>) => {
    setChainsMap(prev => {
      const chain = prev.get(chainId);
      if (!chain) return prev;
      const newMap = new Map(prev);
      newMap.set(chainId, {
        ...chain,
        autoState: { ...chain.autoState, ...update },
      });
      return newMap;
    });
  }, [setChainsMap]);

  // Main auto-mint evaluation loop
  useEffect(() => {
    if (!globalEnabled) return;

    for (const [chainId, chain] of chainsMap) {
      const { config, autoState, mintResult } = chain;

      if (!autoState.enabled) continue;

      const hasSessionLimit = sessionLimit > 0;
      const sessionRemaining = hasSessionLimit ? sessionLimit - sessionSpent : Infinity;

      const isFixed = config.fixedFeeRate != null;
      const mintFeeRate = isFixed ? config.fixedFeeRate! : currentFeeRate;
      const feeInRange = currentFeeRate >= (config.minRate - EPSILON) &&
                          currentFeeRate <= (config.maxRate + EPSILON);

      const hasActiveChain = mintResult.txids.length > 0;

      // --- Fresh fees check ---
      if (autoState.waitingForFreshFees) {
        const feeChanged = autoState.feeAtConfirmation !== null &&
          Math.abs(currentFeeRate - autoState.feeAtConfirmation) > EPSILON;
        const timedOut = autoState.waitStartTime !== null &&
          Date.now() - autoState.waitStartTime >= FRESH_FEE_TIMEOUT_MS;

        if (feeChanged || timedOut) {
          updateAutoState(chainId, {
            waitingForFreshFees: false,
            feeAtConfirmation: null,
            waitStartTime: null,
            status: null,
          });
          // Clear timer if exists
          const timer = freshFeeTimers.current.get(chainId);
          if (timer) {
            clearTimeout(timer);
            freshFeeTimers.current.delete(chainId);
          }
        }
        continue; // Skip this chain until fresh fees arrive
      }

      // --- Mint condition (no active chain) ---
      if (!hasActiveChain && !autoState.triggered && !isProcessingAction) {
        // Stop retrying after 3 consecutive errors
        if (autoState.errorCount >= 3) continue;
        // 15s cooldown between retries
        if (autoState.lastErrorTime && Date.now() - autoState.lastErrorTime < ERROR_RETRY_DELAY_MS) continue;

        // Fixed-rate chains mint unconditionally; range chains wait for feeInRange
        if (!isFixed && !feeInRange) {
          const newStatus = currentFeeRate < config.minRate
            ? `WAIT: ${currentFeeRate.toFixed(2)} < ${config.minRate.toFixed(2)} sat/vB`
            : `WAIT: ${currentFeeRate.toFixed(2)} > ${config.maxRate.toFixed(2)} sat/vB`;
          if (autoState.status !== newStatus) {
            updateAutoState(chainId, { status: newStatus });
          }
          continue;
        }

        if (hasAction(chainId)) continue;

        const effectiveMintCount = Math.min(config.mintCount, MAX_CHAIN_LENGTH);
        if (effectiveMintCount <= 0) continue;

        // Check session limit
        const feePerTx = Math.ceil(TX_VSIZE * mintFeeRate);
        const estimatedCost = effectiveMintCount * feePerTx;
        if (hasSessionLimit && estimatedCost > sessionRemaining) {
          updateAutoState(chainId, {
            status: `LIMIT: need ${estimatedCost.toLocaleString()} sats, have ${Math.max(0, sessionRemaining).toLocaleString()}`,
          });
          continue;
        }

        // Enqueue mint
        updateAutoState(chainId, {
          triggered: true,
          status: `MINTING ${effectiveMintCount} @ ${mintFeeRate.toFixed(2)} sat/vB${isFixed ? ' (fixed)' : ''}...`,
        });
        enqueue({
          chainId,
          type: 'mint',
          params: { mintCount: effectiveMintCount, feeRate: mintFeeRate },
        });
        continue;
      }

      // --- RBF condition (active chain, autoRbf enabled) ---
      if (hasActiveChain && config.autoRbf && !autoState.rbfTriggered && !isProcessingAction) {
        if (autoState.errorCount >= 3) continue;
        if (autoState.lastErrorTime && Date.now() - autoState.lastErrorTime < ERROR_RETRY_DELAY_MS) continue;
        if (!feeInRange) continue;
        if (hasAction(chainId)) continue;

        const rbfMultiplier = 1 + config.rbfBuffer / 100;
        const targetRate = currentFeeRate * rbfMultiplier;
        const effectiveRate = chain.rbfData.totalVsize > 0
          ? chain.rbfData.totalFees / chain.rbfData.totalVsize
          : 0;

        if (effectiveRate < targetRate && effectiveRate > 0) {
          // Check session limit
          const totalVsize = chain.rbfData.chainLength * TX_VSIZE;
          const rbfCost = Math.ceil((targetRate - effectiveRate) * totalVsize);
          if (hasSessionLimit && rbfCost > sessionRemaining) {
            updateAutoState(chainId, {
              status: `LIMIT: RBF needs ${rbfCost.toLocaleString()} sats`,
            });
            continue;
          }

          updateAutoState(chainId, {
            rbfTriggered: true,
            status: `RBF: ${effectiveRate.toFixed(2)} → ${targetRate.toFixed(2)} sat/vB...`,
          });
          enqueue({
            chainId,
            type: 'rbf',
            params: { targetRate },
          });
        }
      }

      // --- Reset RBF triggered when effective rate catches up ---
      if (hasActiveChain && autoState.rbfTriggered) {
        const rbfMultiplier = 1 + config.rbfBuffer / 100;
        const targetRate = currentFeeRate * rbfMultiplier;
        const effectiveRate = chain.rbfData.totalVsize > 0
          ? chain.rbfData.totalFees / chain.rbfData.totalVsize
          : 0;
        if (effectiveRate >= targetRate) {
          updateAutoState(chainId, { rbfTriggered: false });
        }
      }

      // --- Reset triggered when conditions change ---
      if (!autoState.enabled) {
        if (autoState.triggered || autoState.rbfTriggered) {
          updateAutoState(chainId, { triggered: false, rbfTriggered: false });
        }
      } else if (!feeInRange) {
        // Fee out of range: reset RBF always; reset mint only for range-based chains
        const resetTriggered = !isFixed && autoState.triggered;
        if (resetTriggered || autoState.rbfTriggered) {
          updateAutoState(chainId, {
            ...(resetTriggered ? { triggered: false } : {}),
            rbfTriggered: false,
          });
        }
      }
    }
  }, [
    chainsMap,
    currentFeeRate,
    globalEnabled,
    isProcessingAction,
    sessionSpent,
    sessionLimit,
    enqueue,
    hasAction,
    updateAutoState,
  ]);

  // Start fresh-fee timeout when a chain enters waitingForFreshFees
  const startFreshFeeTimeout = useCallback((chainId: string) => {
    // Clear existing
    const existing = freshFeeTimers.current.get(chainId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      updateAutoState(chainId, {
        waitingForFreshFees: false,
        feeAtConfirmation: null,
        waitStartTime: null,
        status: null,
      });
      freshFeeTimers.current.delete(chainId);
    }, FRESH_FEE_TIMEOUT_MS);
    freshFeeTimers.current.set(chainId, timer);
  }, [updateAutoState]);

  return { startFreshFeeTimeout };
}

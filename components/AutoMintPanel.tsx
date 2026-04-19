'use client';

import { useState } from 'react';
import type { ChainConfig } from './diesel-terminal/types';
import { DEFAULT_CHAIN_CONFIG } from './diesel-terminal/constants';
import { ChainConfigEditor } from './diesel-terminal/ChainConfigEditor';

interface AutoMintPanelProps {
  currentFeeRate: number;
  isConnected: boolean;
  globalEnabled: boolean;
  onGlobalEnabledChange: (enabled: boolean) => void;

  // Session spending
  sessionSpent: number;
  sessionLimit: number;
  onSessionLimitChange: (limit: number) => void;
  onResetSpent: () => void;

  // Launch chain (no UTXO — selected lazily at mint time)
  onLaunch: (config: ChainConfig) => void;

  chainsCount: number;
}

export function AutoMintPanel({
  currentFeeRate,
  isConnected,
  globalEnabled,
  onGlobalEnabledChange,
  sessionSpent,
  sessionLimit,
  onSessionLimitChange,
  onResetSpent,
  onLaunch,
  chainsCount,
}: AutoMintPanelProps) {
  const [showNewChain, setShowNewChain] = useState(false);
  const [config, setConfig] = useState<ChainConfig>({ ...DEFAULT_CHAIN_CONFIG });

  if (!isConnected) return null;

  const EPSILON = 0.001;
  const feeInRange = currentFeeRate >= (DEFAULT_CHAIN_CONFIG.minRate - EPSILON) &&
                     currentFeeRate <= (DEFAULT_CHAIN_CONFIG.maxRate + EPSILON);

  const hasSessionLimit = sessionLimit > 0;
  const sessionRemaining = hasSessionLimit ? sessionLimit - sessionSpent : Infinity;

  const handleAdd = () => {
    onLaunch(config);
    setShowNewChain(false);
    setConfig({ ...DEFAULT_CHAIN_CONFIG });
  };

  const handleToggleNewChain = () => {
    if (!showNewChain) {
      setConfig({ ...DEFAULT_CHAIN_CONFIG });
    }
    setShowNewChain(!showNewChain);
  };

  return (
    <div className="border-t border-[#252525]">
      {/* Header */}
      <div className="px-2 sm:px-4 py-2 bg-[#0d0d0d] border-b border-[#252525] flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm">
            <span className="text-orange-500 font-bold">2</span>
            <span className="text-[#404040] mx-1">|</span>
            <span className="text-[#e0e0e0] tracking-wide">AUTO-MINT</span>
          </span>
          {globalEnabled && (
            <span className={`w-2.5 h-2.5 ${feeInRange ? 'bg-[#00ff88] animate-pulse' : 'bg-[#ffcc00]'}`} />
          )}
          {chainsCount > 0 && (
            <span className="text-[#505050] text-xs">{chainsCount} chain{chainsCount !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleNewChain}
            className={`px-3 py-1 text-xs font-bold border transition-colors tracking-wide ${
              showNewChain
                ? 'border-orange-500 text-orange-500'
                : 'border-[#303030] text-[#707070] hover:border-orange-500 hover:text-orange-500'
            }`}
          >
            {showNewChain ? '✕' : '+ CHAIN'}
          </button>
          <button
            onClick={() => onGlobalEnabledChange(!globalEnabled)}
            className={`px-4 py-1 text-sm font-bold border transition-colors tracking-wide ${
              globalEnabled
                ? 'bg-orange-500 text-black border-orange-500 hover:bg-orange-400'
                : 'bg-transparent text-orange-500 border-orange-500 hover:bg-orange-500/10'
            }`}
          >
            {globalEnabled ? 'STOP' : 'START'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
        {/* Session limit row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-[#505050] w-12 sm:w-20 text-xs group relative cursor-help">
            <span className="border-b border-dotted border-[#505050]">LIMIT</span>
            <div className="absolute top-full left-0 mt-2 px-2 py-1.5 bg-[#1a1a1a] border border-[#404040] text-xs text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity w-56 pointer-events-none z-50 normal-case font-normal">
              Session spending limit in sats. Auto-mint pauses when reached. Empty = no limit
            </div>
          </span>
          <input
            type="number"
            step="1000"
            min="0"
            value={sessionLimit || ''}
            onChange={(e) => onSessionLimitChange(parseInt(e.target.value) || 0)}
            className="w-20 sm:w-24 bg-[#0a0a0a] border border-[#303030] px-1 sm:px-2 py-1 text-[#e0e0e0] text-center focus:border-orange-500 focus:outline-none"
            placeholder="∞"
          />
          <span className="text-[#404040] text-xs">sats</span>
          {/* Current fee rate */}
          <span className={`flex items-center gap-1 ${feeInRange ? 'text-[#00ff88]' : 'text-[#ffcc00]'}`}>
            <span className={`w-1.5 h-1.5 ${feeInRange ? 'bg-[#00ff88]' : 'bg-[#ffcc00]'}`}></span>
            <span className="text-xs">{currentFeeRate.toFixed(2)}</span>
            <span className="text-[#404040] text-xs">s/vB</span>
          </span>
          {(hasSessionLimit || sessionSpent > 0) && (
            <span className={`ml-auto flex items-center gap-2 ${!hasSessionLimit || sessionRemaining > 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
              <span className="text-[#505050] text-xs">SPENT</span>
              <span className="text-[#e0e0e0]">{sessionSpent.toLocaleString()}</span>
              {hasSessionLimit && (
                <>
                  <span className="text-[#303030]">/</span>
                  <span>{sessionLimit.toLocaleString()}</span>
                </>
              )}
              {sessionSpent > 0 && (
                <button
                  onClick={onResetSpent}
                  className="text-[#505050] hover:text-orange-500 text-xs ml-1"
                  title="Reset session spending"
                >
                  [RST]
                </button>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Inline new chain panel */}
      {showNewChain && (
        <div className="border-t border-orange-500/30 bg-[#080808]">
          <div className="px-2 sm:px-4 py-3">
            {/* Config editor */}
            <div className="border border-[#252525] p-3 mb-3">
              <div className="text-[#505050] text-xs tracking-wide mb-2">CHAIN CONFIG</div>
              <ChainConfigEditor config={config} onChange={setConfig} compact />
            </div>

            <div className="text-[#505050] text-xs mb-3">
              UTXO will be selected automatically when minting starts
            </div>

            {/* Add button */}
            <button
              onClick={handleAdd}
              className="w-full py-2 border border-orange-500 text-orange-500 font-bold text-xs tracking-wide hover:bg-orange-500 hover:text-black transition-colors"
            >
              + CHAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import type { ChainConfig } from './types';
import { MAX_CHAIN_LENGTH } from './constants';

interface ChainConfigEditorProps {
  config: ChainConfig;
  onChange: (config: ChainConfig) => void;
  compact?: boolean;
}

export function ChainConfigEditor({ config, onChange, compact = false }: ChainConfigEditorProps) {
  const update = (partial: Partial<ChainConfig>) => {
    onChange({ ...config, ...partial });
  };

  const isFixed = config.fixedFeeRate != null;

  const inputClass = compact
    ? 'w-14 bg-[#0a0a0a] border border-[#303030] px-1 py-0.5 text-[#e0e0e0] text-center text-xs focus:border-orange-500 focus:outline-none'
    : 'w-16 bg-[#0a0a0a] border border-[#303030] px-2 py-1 text-[#e0e0e0] text-center text-xs focus:border-orange-500 focus:outline-none';

  return (
    <div className={`space-y-2 text-xs ${compact ? '' : 'py-2'}`}>
      {/* Mints + Fee range */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[#505050] w-14">MINTS</span>
        <input
          type="number"
          step="1"
          min="1"
          max={MAX_CHAIN_LENGTH}
          value={config.mintCount}
          onChange={e => update({ mintCount: Math.min(parseInt(e.target.value) || 1, MAX_CHAIN_LENGTH) })}
          className={inputClass}
        />
        <span className="text-[#303030] mx-1">|</span>
        <span className="text-[#505050]">FEE</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={config.minRate}
          onChange={e => update({ minRate: parseFloat(e.target.value) || 0 })}
          className={inputClass}
        />
        <span className="text-[#303030]">—</span>
        <input
          type="number"
          step="0.1"
          min="0"
          value={config.maxRate}
          onChange={e => update({ maxRate: parseFloat(e.target.value) || 0 })}
          className={inputClass}
        />
        <span className="text-[#404040]">s/vB</span>
      </div>

      {/* Fixed init rate + RBF + Restart */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[#505050] w-14">INIT</span>
        <button
          onClick={() => update({ fixedFeeRate: isFixed ? null : (config.minRate || 1) })}
          className={`w-4 h-4 border flex items-center justify-center transition-colors ${
            isFixed
              ? 'border-[#00bfff] bg-[#00bfff]/20'
              : 'border-[#303030] hover:border-[#505050]'
          }`}
        >
          {isFixed && <span className="text-[#00bfff] text-[10px] leading-none">✓</span>}
        </button>
        {isFixed && (
          <>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={config.fixedFeeRate!}
              onChange={e => update({ fixedFeeRate: parseFloat(e.target.value) || 0.01 })}
              className={inputClass}
            />
            <span className="text-[#404040]">s/vB</span>
          </>
        )}

        <span className="text-[#303030] mx-1">|</span>
        <span className="text-[#505050]">RBF</span>
        <button
          onClick={() => update({ autoRbf: !config.autoRbf })}
          className={`relative w-10 h-5 border transition-colors ${
            config.autoRbf
              ? 'bg-orange-500/20 border-orange-500'
              : 'bg-[#151515] border-[#303030]'
          }`}
        >
          <span className={`absolute top-0.5 w-3.5 h-3.5 transition-all ${
            config.autoRbf
              ? 'right-0.5 bg-orange-500'
              : 'left-0.5 bg-[#404040]'
          }`} />
        </button>
        <span className={`text-xs ${config.autoRbf ? 'text-orange-500' : 'text-[#404040]'}`}>
          {config.autoRbf ? 'ON' : 'OFF'}
        </span>
        {config.autoRbf && (
          <>
            <span className="text-[#303030]">+</span>
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={config.rbfBuffer}
              onChange={e => update({ rbfBuffer: Math.max(0, parseInt(e.target.value) || 0) })}
              className="w-10 bg-[#0a0a0a] border border-[#303030] px-1 py-0.5 text-[#e0e0e0] text-center text-xs focus:border-orange-500 focus:outline-none"
            />
            <span className="text-[#404040]">%</span>
          </>
        )}

        <span className="text-[#303030] mx-1">|</span>
        <span className="text-[#505050]">RESTART</span>
        <button
          onClick={() => update({ autoRestart: !config.autoRestart })}
          className={`relative w-10 h-5 border transition-colors ${
            config.autoRestart
              ? 'bg-[#00ff88]/20 border-[#00ff88]'
              : 'bg-[#151515] border-[#303030]'
          }`}
        >
          <span className={`absolute top-0.5 w-3.5 h-3.5 transition-all ${
            config.autoRestart
              ? 'right-0.5 bg-[#00ff88]'
              : 'left-0.5 bg-[#404040]'
          }`} />
        </button>
        <span className={`text-xs ${config.autoRestart ? 'text-[#00ff88]' : 'text-[#404040]'}`}>
          {config.autoRestart ? 'ON' : 'OFF'}
        </span>
      </div>
    </div>
  );
}

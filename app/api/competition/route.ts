import { NextRequest, NextResponse } from 'next/server';
import { cacheGet, cacheSet } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const RPC_URL = process.env.NEXT_PUBLIC_ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/buildalkanes';

const DIESEL_SCAN_SCRIPT = `
local minFeeRate = tonumber(args[1]) or 1
local DIESEL_PREFIX = "6a5d1214011400"

local mempool = _RPC.btc_getrawmempool(true)

local dieselCount = 0
local totalMempool = 0
local qualifying = 0

for txid, entry in pairs(mempool) do
  totalMempool = totalMempool + 1

  -- Ancestor fee rate: can this TX get in with its parents?
  local ancestorFeeRate = (entry.fees.ancestor * 100000000) / entry.ancestorsize

  -- Descendant fee rate: can this TX get in via CPFP (child paying for it)?
  local descendantFeeRate = (entry.fees.descendant * 100000000) / entry.descendantsize

  -- TX qualifies if EITHER rate is high enough
  -- Also add 10% buffer for borderline cases
  local threshold = minFeeRate * 0.9

  if ancestorFeeRate >= threshold or descendantFeeRate >= threshold then
    qualifying = qualifying + 1
    local tx = _RPC.btc_getrawtransaction(txid, true)

    if tx and tx.vout then
      for _, output in ipairs(tx.vout) do
        if output.scriptPubKey and output.scriptPubKey.hex then
          if string.sub(output.scriptPubKey.hex, 1, 14) == DIESEL_PREFIX then
            dieselCount = dieselCount + 1
            break
          end
        end
      end
    end
  end
end

return {
  total_mempool = totalMempool,
  qualifying = qualifying,
  diesel_mints = dieselCount
}
`;

interface CompetitionResult {
  total_mempool: number;
  qualifying: number;
  diesel_mints: number;
}

/**
 * GET /api/competition?minFeeRate=15
 *
 * Scans the mempool for competing DIESEL mints using a Lua script.
 * Results are cached in Redis for 10 seconds since the mempool is
 * identical for all users.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const minFeeRateParam = searchParams.get('minFeeRate');

    if (!minFeeRateParam) {
      return NextResponse.json(
        { success: false, error: 'minFeeRate parameter required' },
        { status: 400 }
      );
    }

    const minFeeRate = parseFloat(minFeeRateParam);
    if (isNaN(minFeeRate) || minFeeRate <= 0) {
      return NextResponse.json(
        { success: false, error: 'minFeeRate must be a positive number' },
        { status: 400 }
      );
    }

    // Round to integer for cache key (different fractional rates share cache)
    const cacheKey = `competition:scan:${Math.max(1, Math.round(minFeeRate))}`;
    const cached = await cacheGet<CompetitionResult>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    // Cache miss — execute Lua script via RPC
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'lua_evalscript',
        params: [DIESEL_SCAN_SCRIPT, minFeeRateParam],
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    if (json.error) {
      throw new Error(`RPC error: ${json.error.message || JSON.stringify(json.error)}`);
    }

    const result: CompetitionResult = json.result?.returns;
    if (!result) {
      throw new Error('No result returned from Lua script');
    }

    // Cache for 15 seconds (mempool changes slowly, matches client polling interval)
    await cacheSet(cacheKey, result, 15);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[/api/competition] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

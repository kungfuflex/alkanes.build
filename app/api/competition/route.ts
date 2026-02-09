import { NextRequest, NextResponse } from 'next/server';
import { cacheGet, cacheSet } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const RPC_URL = process.env.NEXT_PUBLIC_ALKANES_RPC_URL || 'https://mainnet.subfrost.io/v4/buildalkanes';
const DIESEL_PREFIX = '6a5d1214011400';

interface CompetitionResult {
  next_block_txs: number;
  diesel_mints: number;
}

/**
 * GET /api/competition
 *
 * Counts DIESEL mints in the projected next block via getblocktemplate.
 * Direct RPC call — no Lua script needed.
 * Results are cached in Redis for 15 seconds.
 */
export async function GET(request: NextRequest) {
  try {
    const cacheKey = 'competition:scan';
    const cached = await cacheGet<CompetitionResult>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    // Call getblocktemplate directly via JSON-RPC
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'btc_getblocktemplate',
        params: [{ rules: ['segwit'] }],
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    if (json.error) {
      throw new Error(`RPC error: ${json.error.message || JSON.stringify(json.error)}`);
    }

    const transactions: { data: string }[] = json.result?.transactions;
    if (!transactions) {
      throw new Error('No transactions in block template');
    }

    let dieselCount = 0;
    for (const tx of transactions) {
      if (tx.data.includes(DIESEL_PREFIX)) {
        dieselCount++;
      }
    }

    const result: CompetitionResult = {
      next_block_txs: transactions.length,
      diesel_mints: dieselCount,
    };

    // Cache for 15 seconds
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

import { NextRequest, NextResponse } from 'next/server';
import {
  POOLS,
  getPoolReserves,
  getPoolPrice,
  getCurrentBlockHeight,
  type PoolKey,
} from '@/lib/pools/pool-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pools
 * Query params:
 *   - pool: 'DIESEL_FRBTC' | 'DIESEL_BUSD' | 'all'
 *   - height: block height (optional, defaults to latest)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const poolParam = searchParams.get('pool') || 'all';
    const heightParam = searchParams.get('height');

    const height = heightParam ? parseInt(heightParam, 10) : undefined;

    if (poolParam === 'all') {
      // Get data for all pools
      const [dieselFrbtc, dieselBusd, currentHeight] = await Promise.all([
        getPoolPrice('DIESEL_FRBTC'),
        getPoolPrice('DIESEL_BUSD'),
        getCurrentBlockHeight(),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          currentHeight,
          pools: {
            DIESEL_FRBTC: {
              ...dieselFrbtc,
              reserve0: dieselFrbtc.reserve0.toString(),
              reserve1: dieselFrbtc.reserve1.toString(),
            },
            DIESEL_BUSD: {
              ...dieselBusd,
              reserve0: dieselBusd.reserve0.toString(),
              reserve1: dieselBusd.reserve1.toString(),
            },
          },
        },
      });
    }

    // Validate pool key
    if (!Object.keys(POOLS).includes(poolParam)) {
      return NextResponse.json(
        { success: false, error: `Invalid pool: ${poolParam}` },
        { status: 400 }
      );
    }

    const poolKey = poolParam as PoolKey;

    if (height) {
      // Get reserves at specific height
      const reserves = await getPoolReserves(poolKey, height);
      return NextResponse.json({
        success: true,
        data: {
          ...reserves,
          reserve0: reserves.reserve0.toString(),
          reserve1: reserves.reserve1.toString(),
          totalSupply: reserves.totalSupply.toString(),
        },
      });
    }

    // Get current price
    const price = await getPoolPrice(poolKey);
    return NextResponse.json({
      success: true,
      data: {
        ...price,
        reserve0: price.reserve0.toString(),
        reserve1: price.reserve1.toString(),
      },
    });
  } catch (error) {
    console.error('Pool API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

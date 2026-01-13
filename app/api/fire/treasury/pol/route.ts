/**
 * GET /api/fire/treasury/pol
 *
 * Fetch Protocol Owned Liquidity (POL) statistics from the treasury contract.
 * Currently returns mock data - will be connected to chain once contracts are deployed.
 */

import { NextResponse } from 'next/server';
import { getFireContracts, alkaneIdToString } from '@/lib/fire/constants';

interface POLStatsResponse {
  /** LP tokens held by treasury (raw amount as string for bigint serialization) */
  polLpTokens: string;
  /** Value of POL in USD */
  polValueUsd: number;
  /** POL as percentage of total pool (0-100) */
  polPercentOfPool: number;
  /** Total treasury value in USD */
  treasuryValueUsd: number;
  /** Circulating FIRE supply (raw amount as string) */
  fireCirculatingSupply: string;
  /** Backing value per FIRE token in USD */
  liquidityBackedPerFire: number;
}

export async function GET() {
  try {
    // TODO: Once treasury contract is properly deployed, query it here
    // const contracts = getFireContracts();
    // const treasuryContract = alkaneIdToString(contracts.fireTreasury);
    //
    // Query would use metashrew_view with:
    // - GetBackingInfo opcode (22) for LP tokens held
    // - GetTreasuryStats opcode (23) for overall stats
    //
    // Also need to:
    // - Query FIRE token total supply
    // - Query pool reserves to calculate USD values
    // - Query BTC price for USD conversion

    // For now, return placeholder values (contracts not yet fully deployed)
    // Once contracts are deployed and funded, these will be real values
    const response: POLStatsResponse = {
      polLpTokens: '0',            // No POL yet
      polValueUsd: 0,
      polPercentOfPool: 0,
      treasuryValueUsd: 0,
      fireCirculatingSupply: '0', // No FIRE circulating yet
      liquidityBackedPerFire: 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch POL stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch POL stats' },
      { status: 500 }
    );
  }
}

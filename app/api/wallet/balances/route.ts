import { NextRequest, NextResponse } from "next/server";
import { alkanesClient, KNOWN_TOKENS } from "@/lib/alkanes-client";

/**
 * GET /api/wallet/balances?address=<bitcoin_address>
 *
 * Fetches wallet balances including:
 * - BTC balance (from esplora UTXOs via alkanes-web-sys)
 * - Alkane token balances (from protorunesbyaddress via alkanes-web-sys)
 *
 * This endpoint uses the shared alkanes-client which wraps @alkanes/ts-sdk
 * for all blockchain interactions.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Use the alkanes client to fetch all wallet balances
    // This internally uses:
    // - esplora_address::utxo for BTC balance
    // - protorunesbyaddress via metashrew_view for token balances
    const walletBalances = await alkanesClient.getWalletBalances(address);

    // Transform to API response format
    const response = {
      btcBalance: walletBalances.btcBalance,
      btcBalanceFormatted: walletBalances.btcBalanceFormatted,
      tokens: walletBalances.tokens.map(token => ({
        runeId: token.runeId,
        symbol: token.symbol,
        name: token.name,
        balance: token.balance.toString(),
        balanceFormatted: token.balanceFormatted,
        decimals: token.decimals,
      })),
      address: walletBalances.address,
      timestamp: walletBalances.timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching wallet balances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet balances', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

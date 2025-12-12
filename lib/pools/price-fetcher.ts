/**
 * Price Fetcher Module
 *
 * Provides functions for fetching Bitcoin and token prices from the Alkanes Data API.
 * This is a shared module used by both server-side routes and live integration tests.
 *
 * Used by:
 * - Server-side API routes (app/api/btc-price, app/api/pools)
 * - Live integration tests
 */

export interface BitcoinPrice {
  usd: number;
  timestamp: number;
}

export interface PriceFetcherConfig {
  dataApiUrl?: string;
}

const DEFAULT_DATA_API_URL = 'https://mainnet.subfrost.io/v4/buildalkanes';

/**
 * Fetch current Bitcoin price in USD from the Data API
 */
export async function fetchBitcoinPrice(
  config?: PriceFetcherConfig
): Promise<BitcoinPrice> {
  const dataApiUrl = config?.dataApiUrl || process.env.ALKANES_DATA_API_URL || DEFAULT_DATA_API_URL;

  const response = await fetch(`${dataApiUrl}/get-bitcoin-price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch BTC price: ${response.status}`);
  }

  const json = await response.json() as {
    statusCode?: number;
    data?: { bitcoin?: { usd?: number } };
    bitcoin?: { usd?: number };
  };

  // Handle wrapped response (with data envelope) or direct response
  const btcData = json.data?.bitcoin || json.bitcoin;
  const usd = btcData?.usd;

  if (typeof usd !== 'number') {
    throw new Error('Invalid BTC price response');
  }

  return {
    usd,
    timestamp: Date.now(),
  };
}

/**
 * Calculate DIESEL price in USD based on pool prices and BTC price
 *
 * @param dieselFrbtcPrice - DIESEL price in frBTC (from DIESEL/frBTC pool)
 * @param btcUsdPrice - BTC price in USD
 * @returns DIESEL price in USD
 */
export function calculateDieselUsdPrice(
  dieselFrbtcPrice: number,
  btcUsdPrice: number
): number {
  // frBTC is 1:1 with BTC, so DIESEL/frBTC * BTC/USD = DIESEL/USD
  return dieselFrbtcPrice * btcUsdPrice;
}

/**
 * Get comprehensive DIESEL price metrics
 */
export interface DieselPriceMetrics {
  // Direct pool prices
  dieselFrbtcPrice: number;  // DIESEL price in frBTC
  dieselBusdPrice: number;   // DIESEL price in bUSD

  // BTC reference
  btcUsdPrice: number;       // BTC price in USD

  // Calculated USD price (via frBTC)
  dieselUsdViaFrbtc: number; // DIESEL price in USD (via frBTC * BTC)

  // Timestamp
  timestamp: number;
}

export async function fetchDieselPriceMetrics(
  dieselFrbtcPrice: number,
  dieselBusdPrice: number,
  config?: PriceFetcherConfig
): Promise<DieselPriceMetrics> {
  const btcPrice = await fetchBitcoinPrice(config);

  return {
    dieselFrbtcPrice,
    dieselBusdPrice,
    btcUsdPrice: btcPrice.usd,
    dieselUsdViaFrbtc: calculateDieselUsdPrice(dieselFrbtcPrice, btcPrice.usd),
    timestamp: Date.now(),
  };
}

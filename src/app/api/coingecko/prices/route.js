import { NextResponse } from 'next/server';
import { fetchCoinGeckoMarkets } from '@/lib/coingecko-prices-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/coingecko/prices?symbols=BTC,ETH,USDT
 * Uses CoinGecko **coins/markets** (not simple/price) so we get both USD rate and **image** URLs.
 * Server-only: COINGECKO_API_KEY as x_cg_demo_api_key.
 * @see https://docs.coingecko.com/reference/coins-markets
 */
export async function GET(request) {
  const key = process.env.COINGECKO_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: 'Missing COINGECKO_API_KEY', hint: 'Add it to front/.env or .env.local (server-only).' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('symbols') || 'BTC,ETH,USDT,USDC,SOL,BNB';
  const symbols = raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const { prices, images } = await fetchCoinGeckoMarkets(symbols);
  return NextResponse.json({ prices, images, updatedAt: Date.now() });
}

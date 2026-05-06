import { NextResponse } from 'next/server';
import {
  COINGECKO_SYMBOL_TO_ID,
  COINGECKO_ID_TO_SYMBOL,
} from '@/lib/coingecko';

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

  const ids = [...new Set(symbols.map((s) => COINGECKO_SYMBOL_TO_ID[s]).filter(Boolean))];
  if (ids.length === 0) {
    return NextResponse.json({ prices: {}, images: {}, updatedAt: Date.now() });
  }

  const cgUrl = new URL('https://api.coingecko.com/api/v3/coins/markets');
  cgUrl.searchParams.set('vs_currency', 'usd');
  cgUrl.searchParams.set('ids', ids.join(','));
  cgUrl.searchParams.set('order', 'market_cap_desc');
  cgUrl.searchParams.set('per_page', '250');
  cgUrl.searchParams.set('page', '1');
  cgUrl.searchParams.set('sparkline', 'false');
  cgUrl.searchParams.set('x_cg_demo_api_key', key);

  let res;
  try {
    res = await fetch(cgUrl.href, {
      cache: 'no-store',
      next: { revalidate: 0 },
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'CoinGecko unreachable', message: e?.message || String(e) },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return NextResponse.json(
      { error: 'CoinGecko error', status: res.status, detail: detail.slice(0, 400) },
      { status: 502 },
    );
  }

  /** @type {unknown[]} */
  const data = await res.json();
  const prices = {};
  const images = {};

  if (!Array.isArray(data)) {
    return NextResponse.json({ prices, images, updatedAt: Date.now() });
  }

  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    const id = row.id;
    const sym = typeof id === 'string' ? COINGECKO_ID_TO_SYMBOL[id] : undefined;
    if (sym == null) continue;

    const p = row.current_price;
    if (typeof p === 'number' && Number.isFinite(p) && p > 0) {
      prices[sym] = p;
    }
    if (typeof row.image === 'string' && row.image.startsWith('http')) {
      images[sym] = row.image;
    }
  }

  return NextResponse.json({ prices, images, updatedAt: Date.now() });
}

import { COINGECKO_SYMBOL_TO_ID, COINGECKO_ID_TO_SYMBOL } from './coingecko';

export { computeLiveUsdTotal, walletPricesReady } from './coingecko-prices';

/**
 * Fetch USD prices (+ icons) from CoinGecko markets for wallet tickers.
 * Returns empty maps when the API key is missing or the request fails.
 */
export async function fetchCoinGeckoMarkets(symbols) {
  const key = process.env.COINGECKO_API_KEY?.trim();
  if (!key) {
    return { prices: {}, images: {} };
  }

  const normalized = [...new Set((symbols || []).map((s) => String(s).trim().toUpperCase()).filter(Boolean))];
  const ids = [...new Set(normalized.map((s) => COINGECKO_SYMBOL_TO_ID[s]).filter(Boolean))];
  if (ids.length === 0) {
    return { prices: {}, images: {} };
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
    res = await fetch(cgUrl.href, { cache: 'no-store', next: { revalidate: 0 } });
  } catch {
    return { prices: {}, images: {} };
  }

  if (!res.ok) {
    return { prices: {}, images: {} };
  }

  const data = await res.json().catch(() => []);
  const prices = {};
  const images = {};

  if (!Array.isArray(data)) {
    return { prices, images };
  }

  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    const sym = typeof row.id === 'string' ? COINGECKO_ID_TO_SYMBOL[row.id] : undefined;
    if (sym == null) continue;
    const p = row.current_price;
    if (typeof p === 'number' && Number.isFinite(p) && p > 0) {
      prices[sym] = p;
    }
    if (typeof row.image === 'string' && row.image.startsWith('http')) {
      images[sym] = row.image;
    }
  }

  return { prices, images };
}

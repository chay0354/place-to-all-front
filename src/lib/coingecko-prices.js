/** True when every non-stable wallet ticker has a live USD price. */
export function walletPricesReady(wallets, prices) {
  const needsLive = (wallets || []).some((w) => {
    const c = (w?.currency || '').toUpperCase();
    return c && c !== 'USDT' && c !== 'USDC';
  });
  if (!needsLive) return true;
  if (!prices || typeof prices !== 'object') return false;
  for (const w of wallets || []) {
    const c = (w?.currency || '').toUpperCase();
    if (!c || c === 'USDT' || c === 'USDC') continue;
    if (!(typeof prices[c] === 'number' && prices[c] > 0)) return false;
  }
  return true;
}

/** USD total using live prices only — no static fallbacks (avoids load-time jumps). */
export function computeLiveUsdTotal(wallets, prices) {
  return (wallets || []).reduce((sum, w) => {
    const c = w?.currency || '';
    let unit = null;
    if (c === 'USDT' || c === 'USDC') {
      unit = 1;
    } else if (prices && typeof prices[c] === 'number' && prices[c] > 0) {
      unit = prices[c];
    }
    if (unit == null) return sum;
    const bal = typeof w.balance === 'number' ? w.balance : parseFloat(w.balance) || 0;
    return sum + bal * unit;
  }, 0);
}

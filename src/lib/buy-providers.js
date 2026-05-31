/**
 * On-ramp providers shown on the buy page (MoonPay, Paybis, Transak).
 * Effective rates at ~$100 USD card checkout (service + processing + typical spread).
 */
export const BUY_PROVIDERS = [
  {
    id: 'paybis',
    name: 'Paybis',
    feeSummary: 'Card 1.49% + 4.5% processing',
    effectiveFeePercent: 5.5,
    netUsdtPer100Usd: 94.5,
    active: false,
  },
  {
    id: 'moonpay',
    name: 'Moonpay',
    feeSummary: 'Card ~4.5% + spread',
    effectiveFeePercent: 6.62,
    netUsdtPer100Usd: 93.38,
    active: true,
  },
  {
    id: 'transak',
    name: 'Transak',
    feeSummary: 'Card ~3.5–5.5%',
    effectiveFeePercent: 10.74,
    netUsdtPer100Usd: 89.26,
    active: false,
  },
].sort((a, b) => b.netUsdtPer100Usd - a.netUsdtPer100Usd);

/** Quote line: $ USD in → crypto out after provider fees. */
export function providerQuote(provider, { usdAmount = 100, cryptoAmount, currency = 'USDT' } = {}) {
  const usd = Number(usdAmount) > 0 ? Number(usdAmount) : 100;
  let out;
  if (Number(cryptoAmount) > 0) {
    out = Number(cryptoAmount) * (1 - provider.effectiveFeePercent / 100);
  } else {
    out = (usd / 100) * provider.netUsdtPer100Usd;
  }
  const formatted = out
    .toFixed(8)
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '');
  return {
    usd,
    out,
    label: `$ ${usd.toLocaleString('en-US', { maximumFractionDigits: 2 })} ==> ${formatted} ${String(currency).toUpperCase()}`,
  };
}

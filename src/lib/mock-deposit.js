/** Mock deposit flow: coin → network → address (UI only). */

export const DEPOSIT_RECOMMENDED = ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'XRP', 'TRX', 'BNB'];

export const DEPOSIT_COINS = [
  { code: 'AAVE', name: 'Aave' },
  { code: 'ADA', name: 'Cardano' },
  { code: 'APT', name: 'Aptos' },
  { code: 'ARB', name: 'Arbitrum' },
  { code: 'ATOM', name: 'Cosmos' },
  { code: 'AVAX', name: 'Avalanche' },
  { code: 'BNB', name: 'BNB' },
  { code: 'BTC', name: 'Bitcoin' },
  { code: 'DOGE', name: 'Dogecoin' },
  { code: 'DOT', name: 'Polkadot' },
  { code: 'ETH', name: 'Ethereum' },
  { code: 'LINK', name: 'Chainlink' },
  { code: 'LTC', name: 'Litecoin' },
  { code: 'MATIC', name: 'Polygon' },
  { code: 'NEAR', name: 'NEAR' },
  { code: 'OP', name: 'Optimism' },
  { code: 'SOL', name: 'Solana' },
  { code: 'TRX', name: 'TRON' },
  { code: 'UNI', name: 'Uniswap' },
  { code: 'USDC', name: 'USD Coin' },
  { code: 'USDT', name: 'Tether' },
  { code: 'XLM', name: 'Stellar' },
  { code: 'XRP', name: 'XRP' },
];

/** Networks available per coin (mock). */
const NETWORKS_BY_COIN = {
  USDT: [
    { id: 'trc20', label: 'TRON (TRC20)', confirmations: 20, minDeposit: '0.005', recentlyUsed: true },
    { id: 'erc20', label: 'Ethereum (ERC20)', confirmations: 6, minDeposit: '10' },
    { id: 'bep20', label: 'BSC (BEP20)', confirmations: 60, minDeposit: '1' },
    { id: 'sol', label: 'SOL', confirmations: 200, minDeposit: '1' },
    { id: 'polygon', label: 'Polygon PoS', confirmations: 128, minDeposit: '1' },
  ],
  USDC: [
    { id: 'erc20', label: 'Ethereum (ERC20)', confirmations: 6, minDeposit: '10', recentlyUsed: true },
    { id: 'sol', label: 'SOL', confirmations: 200, minDeposit: '1' },
    { id: 'bep20', label: 'BSC (BEP20)', confirmations: 60, minDeposit: '1' },
  ],
  ETH: [
    { id: 'ethereum', label: 'Ethereum', confirmations: 6, minDeposit: '0.001', recentlyUsed: true },
    { id: 'arbitrum', label: 'Arbitrum One', confirmations: 12, minDeposit: '0.001' },
    { id: 'optimism', label: 'Optimism', confirmations: 12, minDeposit: '0.001' },
    { id: 'bep20', label: 'BSC (BEP20)', confirmations: 60, minDeposit: '0.001' },
  ],
  BTC: [
    { id: 'bitcoin', label: 'Bitcoin', confirmations: 2, minDeposit: '0.0001', recentlyUsed: true },
  ],
  SOL: [
    { id: 'sol', label: 'Solana', confirmations: 32, minDeposit: '0.01', recentlyUsed: true },
  ],
  TRX: [
    { id: 'trc20', label: 'TRON (TRC20)', confirmations: 20, minDeposit: '1', recentlyUsed: true },
  ],
  XRP: [
    { id: 'xrp', label: 'XRP Ledger', confirmations: 1, minDeposit: '10', recentlyUsed: true },
  ],
  BNB: [
    { id: 'bep20', label: 'BSC (BEP20)', confirmations: 60, minDeposit: '0.01', recentlyUsed: true },
  ],
};

const DEFAULT_NETWORKS = [
  { id: 'ethereum', label: 'Ethereum (ERC20)', confirmations: 6, minDeposit: '0.01', recentlyUsed: true },
  { id: 'bep20', label: 'BSC (BEP20)', confirmations: 60, minDeposit: '0.01' },
];

/** Fake but stable-looking addresses per coin+network. */
const MOCK_ADDRESSES = {
  'USDT:trc20': 'TPiFPA3PbopDM4FhMyuyP1xmhYZGP66xDR',
  'USDT:erc20': '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  'USDT:bep20': '0x55d398326f99059fF775485246999027B3197955',
  'USDT:sol': '7EqQdEULxWcraVx3uXCwMYU5rqUx6PjQfL8zSSuL3v6h',
  'USDT:polygon': '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  'USDC:erc20': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'USDC:sol': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'USDC:bep20': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  'ETH:ethereum': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
  'ETH:arbitrum': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
  'ETH:optimism': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
  'ETH:bep20': '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  'BTC:bitcoin': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  'SOL:sol': '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  'TRX:trc20': 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
  'XRP:xrp': 'rN7n7otQDd6FczFgLdlqtyMVrn3nAvkqZh',
  'BNB:bep20': '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
};

export function normalizeDepositCoin(code) {
  return String(code || '').trim().toUpperCase();
}

export function getDepositCoin(code) {
  const c = normalizeDepositCoin(code);
  return DEPOSIT_COINS.find((coin) => coin.code === c) || null;
}

export function getDepositNetworks(coinCode) {
  const c = normalizeDepositCoin(coinCode);
  return NETWORKS_BY_COIN[c] || DEFAULT_NETWORKS;
}

export function getDepositNetwork(coinCode, networkId) {
  const id = String(networkId || '').trim().toLowerCase();
  return getDepositNetworks(coinCode).find((n) => n.id === id) || null;
}

export function getMockDepositAddress(coinCode, networkId) {
  const c = normalizeDepositCoin(coinCode);
  const id = String(networkId || '').trim().toLowerCase();
  const key = `${c}:${id}`;
  if (MOCK_ADDRESSES[key]) return MOCK_ADDRESSES[key];
  // Fallback pseudo-address
  return `0xMOCK${c}${id}`.slice(0, 42).padEnd(42, '0');
}

export function groupDepositCoinsByLetter(coins) {
  const map = new Map();
  for (const coin of coins) {
    const letter = (coin.code?.[0] || '#').toUpperCase();
    const key = /[A-Z]/.test(letter) ? letter : '#';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(coin);
  }
  return [...map.entries()].sort(([a], [b]) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });
}

export function qrCodeUrl(address) {
  const data = encodeURIComponent(address || '');
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${data}&margin=8`;
}

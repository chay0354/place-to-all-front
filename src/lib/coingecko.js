/**
 * CoinGecko coin ids for /api/v3/simple/price ?ids=
 * @see https://api.coingecko.com/api/v3/coins/list
 */
export const COINGECKO_SYMBOL_TO_ID = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AVAX: 'avalanche-2',
  LTC: 'litecoin',
  ATOM: 'cosmos',
  TRX: 'tron',
  NEAR: 'near',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  SHIB: 'shiba-inu',
  DAI: 'dai',
  CELO: 'celo',
  FIL: 'filecoin',
  VET: 'vechain',
  ICP: 'internet-computer',
  THETA: 'theta-token',
  EOS: 'eos',
  XTZ: 'tezos',
  AAVE: 'aave',
  MKR: 'maker',
  COMP: 'compound-governance-token',
  SNX: 'havven',
  CRV: 'curve-dao-token',
  PEPE: 'pepe',
  FTM: 'fantom',
  GALA: 'gala',
  SAND: 'the-sandbox',
  MANA: 'decentraland',
  AXS: 'axie-infinity',
  CHZ: 'chiliz',
  FLOW: 'flow',
};

/** Reverse lookup: coingecko id → uppercase ticker */
export const COINGECKO_ID_TO_SYMBOL = Object.fromEntries(
  Object.entries(COINGECKO_SYMBOL_TO_ID).map(([sym, id]) => [id, sym]),
);

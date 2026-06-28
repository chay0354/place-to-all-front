import { joinBackendUrl } from './api-base.js';
import { toRelayUrl } from './relay-url.js';
import { getProfileFromSupabase, updateProfileViaSupabase } from './profile-client.js';

export async function apiRequest(path, options = {}, accessToken) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const isBrowser = typeof window !== 'undefined';
  const url = isBrowser ? toRelayUrl(path) : joinBackendUrl(path);
  if (!isBrowser && options.userId) {
    headers['X-User-Id'] = options.userId;
  }

  const fetchOpts = {
    method: options.method || 'GET',
    headers,
    cache: options.cache ?? 'no-store',
  };
  if (isBrowser) {
    fetchOpts.credentials = 'include';
  }
  if (
    options.body != null &&
    fetchOpts.method !== 'GET' &&
    fetchOpts.method !== 'HEAD'
  ) {
    fetchOpts.body = options.body;
  }

  const res = await fetch(url, fetchOpts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText);
    err.response = data;
    throw err;
  }
  return data;
}

export async function getWallets(userId, accessToken) {
  const path = `/api/wallets?_t=${Date.now()}`;
  return apiRequest(path, { userId, cache: 'no-store' }, accessToken);
}

/** Use the app’s /api/wallets route so the server sends the authenticated user to the backend. Use this for the dashboard. */
export async function getWalletsForDashboard() {
  const path = `/api/wallets?_t=${Date.now()}`;
  const res = await fetch(path, { credentials: 'include', cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/** Transaction history via same-origin /api/transactions (avoids relay quirks on dashboard). */
export async function getTransactionsForDashboard() {
  const res = await fetch('/api/transactions', { credentials: 'include', cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || res.statusText);
  return data;
}

/** Get current user's profile (role, referred_by_id). Uses app /api/profile with credentials. */
export async function getProfile() {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/profile', { credentials: 'include', cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data;
    } catch {
      /* fall through to Supabase */
    }
    return getProfileFromSupabase();
  }

  const res = await fetch('/api/profile', { credentials: 'include', cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/** PATCH profile fields (e.g. avatar_url after storage upload). */
export async function updateProfile(body) {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data;
      if (res.status >= 400 && res.status < 500) {
        throw new Error(data.error || data.message || res.statusText);
      }
    } catch (e) {
      if (e?.message && !String(e.message).includes('Failed to fetch')) throw e;
      /* fall through to Supabase on network / 5xx */
    }
    return updateProfileViaSupabase(body);
  }

  const res = await fetch('/api/profile', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || res.statusText);
  return data;
}

/** Super agent: agents under you. Agent: regular users you referred. */
export async function getProfileDownline() {
  const res = await fetch('/api/profile/downline', { credentials: 'include', cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/** Agent+ dashboard payload: downline users with transactions + fee-flow history. */
export async function getAffiliationDashboard() {
  const res = await fetch('/api/profile/affiliation-dashboard', { credentials: 'include', cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/** GET commission take settings — single affiliateTakePercent 0–6 (null = default 4%). */
export async function getAffiliationFees() {
  const res = await fetch('/api/profile/affiliation-fees', { credentials: 'include', cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/** PATCH { affiliateTakePercent: number } — 0–6 */
export async function patchAffiliationFees(body) {
  const res = await fetch('/api/profile/affiliation-fees', {
    method: 'PATCH',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/** Get transaction history for the user. */
export async function getTransactions(userId, accessToken) {
  return apiRequest('/api/transactions', { userId }, accessToken);
}

export async function transfer(userId, body, accessToken) {
  return apiRequest('/api/transfer', {
    method: 'POST',
    body: JSON.stringify(body),
    userId,
  }, accessToken);
}

export async function buyCrypto(userId, body, accessToken) {
  return apiRequest('/api/buy', {
    method: 'POST',
    body: JSON.stringify(body),
    userId,
  }, accessToken);
}

export async function sellCrypto(userId, body, accessToken) {
  return apiRequest('/api/sell', {
    method: 'POST',
    body: JSON.stringify(body),
    userId,
  }, accessToken);
}

/** Create Rapyd checkout; returns { redirect_url, checkout_id }. User pays fiat to us; webhook then buys from Coinbase and credits user. */
export async function createRapydCheckout(userId, { currency, fiatAmount, cryptoAmount, fiatCurrency, beneficiaryUserId, paymentLinkToken } = {}, accessToken) {
  const body = { currency, fiatAmount, cryptoAmount, fiatCurrency: fiatCurrency || 'USD' };
  if (beneficiaryUserId && paymentLinkToken) {
    body.beneficiaryUserId = beneficiaryUserId;
    body.paymentLinkToken = paymentLinkToken;
  }
  return apiRequest('/api/rapyd/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    userId,
  }, accessToken);
}

/** Public: load payment link details for /pay/[token] page. */
export async function getPublicPaymentLink(linkToken) {
  const path = `/api/payment-links/public/${encodeURIComponent(linkToken)}`;
  const url = typeof window !== 'undefined' ? toRelayUrl(path) : joinBackendUrl(path);
  const res = await fetch(url, { cache: 'no-store', credentials: typeof window !== 'undefined' ? 'include' : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/** Public: simulated pay — no sign-in. Optional body.amount when the link has no fixed amount. */
export async function simulatePublicPaymentLink(linkToken, body = {}) {
  const path = `/api/payment-links/public/${encodeURIComponent(linkToken)}/simulate-pay`;
  const url = typeof window !== 'undefined' ? toRelayUrl(path) : joinBackendUrl(path);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
    credentials: typeof window !== 'undefined' ? 'include' : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export async function createPaymentLink(userId, body, accessToken) {
  return apiRequest('/api/payment-links', {
    method: 'POST',
    body: JSON.stringify(body || {}),
    userId,
  }, accessToken);
}

export async function listPaymentLinks(userId, accessToken) {
  return apiRequest('/api/payment-links', { userId, cache: 'no-store' }, accessToken);
}

/** Admin: list agents, super agents, and super super agents (operator email only — see backend). */
export async function adminListAgents(userId, accessToken) {
  return apiRequest('/api/admin/agents', { userId, cache: 'no-store' }, accessToken);
}

/** Admin: promote an agent to super_agent. */
export async function adminPromoteToSuperAgent(userId, targetUserId, accessToken) {
  return apiRequest('/api/admin/promote-to-super-agent', {
    method: 'POST',
    userId,
    body: JSON.stringify({ targetUserId }),
  }, accessToken);
}

/** Admin: promote a super_agent to super_super_agent. */
export async function adminPromoteToSuperSuperAgent(userId, targetUserId, accessToken) {
  return apiRequest('/api/admin/promote-to-super-super-agent', {
    method: 'POST',
    userId,
    body: JSON.stringify({ targetUserId }),
  }, accessToken);
}

/** Admin: users/agents with referred_by_id = referrerId */
export async function adminListInvites(userId, referrerId, accessToken) {
  return apiRequest(`/api/admin/invites/${encodeURIComponent(referrerId)}`, { userId, cache: 'no-store' }, accessToken);
}

/** Admin: all regular-role profiles */
export async function adminListRegularUsers(userId, accessToken) {
  return apiRequest('/api/admin/regular-users', { userId, cache: 'no-store' }, accessToken);
}

/** Get signed MoonPay widget URL. Pass quoteCurrencyAmount (crypto) and baseCurrencyAmount (USD); amounts are locked in MoonPay by default. */
export async function getMoonPayUrl(
  userId,
  { currencyCode = 'eth', baseCurrencyCode = 'usd', baseCurrencyAmount, quoteCurrencyAmount, lockAmount = true } = {},
  accessToken,
) {
  const q = new URLSearchParams();
  if (currencyCode) q.set('currencyCode', currencyCode);
  if (baseCurrencyCode) q.set('baseCurrencyCode', baseCurrencyCode);
  if (baseCurrencyAmount != null && Number(baseCurrencyAmount) > 0) {
    q.set('baseCurrencyAmount', String(Number(baseCurrencyAmount)));
  }
  if (quoteCurrencyAmount != null && Number(quoteCurrencyAmount) > 0) {
    q.set('quoteCurrencyAmount', String(Number(quoteCurrencyAmount)));
  }
  if (lockAmount === false) q.set('lockAmount', 'false');
  return apiRequest(`/api/moonpay/url?${q.toString()}`, { userId }, accessToken);
}

/** Public: MoonPay URL for an active payment link — crypto goes to the recipient’s wallet; webhook credits their ledger. */
export async function getMoonPayPaymentLinkUrl(
  linkToken,
  { baseCurrencyAmount, quoteCurrencyAmount, lockAmount = true } = {},
) {
  const q = new URLSearchParams();
  q.set('token', linkToken);
  if (baseCurrencyAmount != null && Number(baseCurrencyAmount) > 0) {
    q.set('baseCurrencyAmount', String(Number(baseCurrencyAmount)));
  }
  if (quoteCurrencyAmount != null && Number(quoteCurrencyAmount) > 0) {
    q.set('quoteCurrencyAmount', String(Number(quoteCurrencyAmount)));
  }
  if (lockAmount === false) q.set('lockAmount', 'false');
  const path = `/api/moonpay/payment-link-url?${q.toString()}`;
  const url = typeof window !== 'undefined' ? toRelayUrl(path) : joinBackendUrl(path);
  const res = await fetch(url, { cache: 'no-store', credentials: typeof window !== 'undefined' ? 'include' : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function coinbaseRelayUrl(pathWithQuery) {
  return typeof window !== 'undefined' ? toRelayUrl(pathWithQuery) : joinBackendUrl(pathWithQuery);
}

export async function getCoinbaseBuyQuote(fiatAmount, currency = 'BTC', fiatCurrency = 'USD') {
  const q = `fiatAmount=${encodeURIComponent(fiatAmount)}&currency=${encodeURIComponent(currency)}&fiatCurrency=${encodeURIComponent(fiatCurrency)}`;
  const res = await fetch(coinbaseRelayUrl(`/api/coinbase/quote/buy?${q}`), {
    credentials: typeof window !== 'undefined' ? 'include' : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export async function getCoinbaseSellQuote(cryptoAmount, currency = 'BTC', fiatCurrency = 'USD') {
  const q = `cryptoAmount=${encodeURIComponent(cryptoAmount)}&currency=${encodeURIComponent(currency)}&fiatCurrency=${encodeURIComponent(fiatCurrency)}`;
  const res = await fetch(coinbaseRelayUrl(`/api/coinbase/quote/sell?${q}`), {
    credentials: typeof window !== 'undefined' ? 'include' : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/**
 * Buy-page tickers with USD spot (same getSpotPriceUsd chain as /api/coinbase/price on the server).
 * Public via relay (GET /api/coinbase/market-overview).
 */
export async function getMarketOverview() {
  const res = await fetch(coinbaseRelayUrl('/api/coinbase/market-overview'), {
    credentials: typeof window !== 'undefined' ? 'include' : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/** Current USD spot price for an asset (Coinbase). */
export async function getCoinbasePrice(currency = 'BTC') {
  const res = await fetch(coinbaseRelayUrl(`/api/coinbase/price?currency=${encodeURIComponent(currency)}`), {
    credentials: typeof window !== 'undefined' ? 'include' : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/** List of supported crypto currency codes from Coinbase (for buy/sell). */
export async function getCoinbaseCurrencies() {
  const res = await fetch(coinbaseRelayUrl('/api/coinbase/currencies'), {
    credentials: typeof window !== 'undefined' ? 'include' : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data.currencies || [];
}

/** Currencies supported by both MoonPay (buy to wallet) and Coinbase — use for buy page only. */
export async function getBuyableCurrencies() {
  const res = await fetch(coinbaseRelayUrl('/api/coinbase/currencies/buy'), {
    credentials: typeof window !== 'undefined' ? 'include' : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  const list = data.currencies || [];
  return Array.isArray(list) ? list.map((c) => (typeof c === 'string' ? c : c?.code)).filter(Boolean) : [];
}

/** GET wallet info (includes delivery_address and effective_address). */
export async function getWallet(userId, accessToken) {
  return apiRequest('/api/coinbase/wallet', { userId }, accessToken);
}

/** Ensure user has a Coinbase CDP wallet (created on first call). Returns { wallet_id, network_id, default_address } or null. */
export async function ensureCoinbaseWallet(userId, accessToken) {
  return apiRequest('/api/coinbase/wallet', { method: 'POST', userId }, accessToken);
}

/** Set your own wallet address (e.g. Coinbase Wallet) so purchases go there and you see funds in Coinbase. Pass null/empty to clear. */
export async function setDeliveryAddress(userId, deliveryAddress, accessToken) {
  return apiRequest('/api/coinbase/wallet', {
    method: 'PATCH',
    userId,
    body: JSON.stringify({ delivery_address: deliveryAddress || null }),
  }, accessToken);
}

/** On-chain balances for the user's Coinbase CDP wallet. Returns { balances: [ { currency, balance }, ... ] }. */
export async function getCoinbaseBalances(userId, accessToken) {
  const path = `/api/coinbase/balances?_t=${Date.now()}`;
  const data = await apiRequest(path, { userId, cache: 'no-store' }, accessToken);
  return data.balances || [];
}

/** Card program: fetch user's virtual card and recent card events. */
export async function getCardAccount(userId, accessToken) {
  return apiRequest('/api/cards', { userId, cache: 'no-store' }, accessToken);
}

/** Card program: issue virtual Visa card for the current user. */
export async function issueVirtualCard(userId, accessToken) {
  return apiRequest(
    '/api/cards/issue',
    {
      method: 'POST',
      userId,
      body: JSON.stringify({}),
    },
    accessToken,
  );
}

/** Card program: fund card from a crypto wallet (auto-converted to USDT on server). */
export async function fundCardFromCrypto(userId, { amount, currency }, accessToken) {
  return apiRequest(
    '/api/cards/fund',
    {
      method: 'POST',
      userId,
      body: JSON.stringify({ amount, currency }),
    },
    accessToken,
  );
}

/** Card program: mark card as added to Apple Pay (system tokenization state). */
export async function addCardToApplePay(userId, accessToken) {
  return apiRequest(
    '/api/cards/apple-pay/add',
    {
      method: 'POST',
      userId,
      body: JSON.stringify({}),
    },
    accessToken,
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiRequest(path, options = {}, accessToken) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  if (options.userId) headers['X-User-Id'] = options.userId;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
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

/** Get current user's profile (role, referred_by_id). Uses app /api/profile with credentials. */
export async function getProfile() {
  const res = await fetch('/api/profile', { credentials: 'include', cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/** Super agent: agents under you. Agent: regular users you referred. */
export async function getProfileDownline() {
  const res = await fetch('/api/profile/downline', { credentials: 'include', cache: 'no-store' });
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
  const res = await fetch(`${API_URL}/api/payment-links/public/${encodeURIComponent(linkToken)}`, { cache: 'no-store' });
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

/** Admin: list agents and super agents (operator email only — see backend). */
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

/** Admin: users/agents with referred_by_id = referrerId */
export async function adminListInvites(userId, referrerId, accessToken) {
  return apiRequest(`/api/admin/invites/${encodeURIComponent(referrerId)}`, { userId, cache: 'no-store' }, accessToken);
}

/** Admin: all regular-role profiles */
export async function adminListRegularUsers(userId, accessToken) {
  return apiRequest('/api/admin/regular-users', { userId, cache: 'no-store' }, accessToken);
}

/** Get signed MoonPay widget URL. Pass baseCurrencyAmount (USD) to pre-fill amount so user goes straight to checkout. */
export async function getMoonPayUrl(userId, { currencyCode = 'eth', baseCurrencyCode = 'usd', baseCurrencyAmount } = {}, accessToken) {
  const q = new URLSearchParams();
  if (currencyCode) q.set('currencyCode', currencyCode);
  if (baseCurrencyCode) q.set('baseCurrencyCode', baseCurrencyCode);
  if (baseCurrencyAmount != null && Number(baseCurrencyAmount) > 0) q.set('baseCurrencyAmount', String(Number(baseCurrencyAmount)));
  return apiRequest(`/api/moonpay/url?${q.toString()}`, { userId }, accessToken);
}

export async function getCoinbaseBuyQuote(fiatAmount, currency = 'BTC', fiatCurrency = 'USD') {
  const res = await fetch(
    `${API_URL}/api/coinbase/quote/buy?fiatAmount=${encodeURIComponent(fiatAmount)}&currency=${encodeURIComponent(currency)}&fiatCurrency=${encodeURIComponent(fiatCurrency)}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export async function getCoinbaseSellQuote(cryptoAmount, currency = 'BTC', fiatCurrency = 'USD') {
  const res = await fetch(
    `${API_URL}/api/coinbase/quote/sell?cryptoAmount=${encodeURIComponent(cryptoAmount)}&currency=${encodeURIComponent(currency)}&fiatCurrency=${encodeURIComponent(fiatCurrency)}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/** Current USD spot price for an asset (Coinbase). */
export async function getCoinbasePrice(currency = 'BTC') {
  const res = await fetch(`${API_URL}/api/coinbase/price?currency=${encodeURIComponent(currency)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

/** List of supported crypto currency codes from Coinbase (for buy/sell). */
export async function getCoinbaseCurrencies() {
  const res = await fetch(`${API_URL}/api/coinbase/currencies`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data.currencies || [];
}

/** Currencies supported by both MoonPay (buy to wallet) and Coinbase — use for buy page only. */
export async function getBuyableCurrencies() {
  const res = await fetch(`${API_URL}/api/coinbase/currencies/buy`);
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

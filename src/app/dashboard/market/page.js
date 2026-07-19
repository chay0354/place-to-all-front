'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getMarketOverview, getProfile, getWalletsForDashboard } from '@/lib/api';
import { CoinIcon } from '@/components/CoinIcon';
import { openDepositPaymentSheet } from '@/components/DepositPaymentSheet';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { resolveUserCountryIso } from '@/lib/phone-country';

function normCurrency(currency) {
  const c = (currency || '').trim().toUpperCase();
  if (c === 'ETHEREUM') return 'ETH';
  return c || null;
}

function toNum(val) {
  if (val == null) return 0;
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  if (typeof val === 'object' && (val.value != null || val.amount != null)) return toNum(val.value ?? val.amount);
  return Number(val) || 0;
}

function maskEmail(email) {
  const e = String(email || '').trim();
  const [local] = e.split('@');
  if (!local) return '****@****';
  const shown = local.length <= 3 ? local.slice(0, 1) : local.slice(0, 3);
  return `${shown}***@****`;
}

function formatCryptoBalance(n) {
  if (n == null || !Number.isFinite(Number(n))) return '0';
  const x = Number(n);
  if (x === 0) return '0';
  if (Math.abs(x) >= 1) return x.toLocaleString('en-US', { maximumFractionDigits: 8 });
  return x.toPrecision(4);
}

function formatUsd(n, { hide = false } = {}) {
  if (hide) return '****';
  if (n == null || !Number.isFinite(Number(n))) return '0.00';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUsdLabel(n, { hide = false } = {}) {
  if (hide) return '**** USD';
  return `${formatUsd(n)} USD`;
}

function formatBtcApprox(usd, btcPrice, { hide = false } = {}) {
  if (hide) return '≈ **** BTC';
  if (!btcPrice || !Number.isFinite(btcPrice) || btcPrice <= 0 || !Number.isFinite(usd)) {
    return '≈ 0 BTC';
  }
  const btc = usd / btcPrice;
  if (btc === 0) return '≈ 0 BTC';
  return `≈ ${btc.toFixed(8)} BTC`;
}

export default function MarketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assets, setAssets] = useState([]);
  const [btcPriceUsd, setBtcPriceUsd] = useState(null);
  const [coinImages, setCoinImages] = useState({});
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [countryIso, setCountryIso] = useState(null);
  const [balanceHidden, setBalanceHidden] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email?.trim() || '');
    });
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    getProfile()
      .then((p) => {
        setAvatarUrl(p?.avatar_url || '');
        setCountryIso(resolveUserCountryIso(p, null));
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!assets.length) {
      setCoinImages({});
      return;
    }
    const symbols = [...new Set(assets.map((a) => String(a.code || '').toUpperCase()))].filter(Boolean);
    if (symbols.length === 0) {
      setCoinImages({});
      return;
    }
    const ac = new AbortController();
    const q = encodeURIComponent(symbols.join(','));
    fetch(`/api/coingecko/prices?symbols=${q}`, { signal: ac.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setCoinImages(d.images && typeof d.images === 'object' ? d.images : {}))
      .catch(() => setCoinImages({}));
    return () => ac.abort();
  }, [assets]);

  function load() {
    setLoading(true);
    setError('');
    Promise.all([getMarketOverview(), getWalletsForDashboard()])
      .then(([market, ledger]) => {
        const rows = Array.isArray(ledger) ? ledger : [];
        const byCurrency = new Map();
        for (const w of rows) {
          const c = normCurrency(w.currency);
          if (!c) continue;
          byCurrency.set(c, (byCurrency.get(c) || 0) + toNum(w.balance));
        }
        const marketAssets = Array.isArray(market.assets) ? market.assets : [];
        const priceByCode = new Map(
          marketAssets.map((a) => [String(a.code || '').toUpperCase(), a.priceUsd]),
        );
        const btc = priceByCode.get('BTC');
        setBtcPriceUsd(btc != null && Number.isFinite(Number(btc)) ? Number(btc) : null);

        const merged = [...byCurrency.entries()]
          .filter(([, bal]) => bal > 0)
          .map(([code, balance]) => {
            const priceUsd = priceByCode.get(code);
            const usdValue = priceUsd != null ? balance * Number(priceUsd) : null;
            return { code, balance, priceUsd, usdValue };
          })
          .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));
        setAssets(merged);
      })
      .catch((e) => setError(e?.message || 'Could not load assets'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const totalUsd = useMemo(
    () => assets.reduce((sum, a) => sum + (Number(a.usdValue) > 0 ? Number(a.usdValue) : 0), 0),
    [assets],
  );

  return (
    <div className="assets-page dash-screen">
      <div className="assets-page-top">
        <Link href="/dashboard/account" className="assets-page-profile">
          {userId && (
            <ProfileAvatar
              userId={userId}
              email={userEmail}
              avatarUrl={avatarUrl}
              size="sm"
              countryIso={countryIso}
              className="assets-page-avatar"
            />
          )}
          <span className="assets-page-email">{maskEmail(userEmail)}</span>
          <ChevronDownIcon />
        </Link>
      </div>

      <section className="assets-page-balance">
        <div className="assets-page-balance-label-row">
          <span className="assets-page-balance-label">Total Assets</span>
          <button
            type="button"
            className="assets-page-eye"
            aria-label={balanceHidden ? 'Show balance' : 'Hide balance'}
            aria-pressed={balanceHidden}
            onClick={() => setBalanceHidden((v) => !v)}
          >
            {balanceHidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        <div className="assets-page-balance-main">
          <span className="assets-page-balance-amount">
            {loading && assets.length === 0 ? '—' : formatUsd(totalUsd, { hide: balanceHidden })}
          </span>
          <span className="assets-page-balance-currency">USD</span>
        </div>

        <p className="assets-page-balance-btc">
          {formatBtcApprox(totalUsd, btcPriceUsd, { hide: balanceHidden })}
        </p>

        <p className="assets-page-pnl">
          Today&apos;s P&amp;L{' '}
          <span className="assets-page-pnl-value">
            +{formatUsd(0, { hide: balanceHidden })} USD(0%)
          </span>
        </p>

        <div className="assets-page-split">
          <div className="assets-page-split-col">
            <span className="assets-page-split-label">Available balance</span>
            <span className="assets-page-split-value">
              {formatUsdLabel(totalUsd, { hide: balanceHidden })}
            </span>
          </div>
          <div className="assets-page-split-col">
            <span className="assets-page-split-label">In Use</span>
            <span className="assets-page-split-value">
              {formatUsdLabel(0, { hide: balanceHidden })}
            </span>
          </div>
        </div>
      </section>

      <div className="assets-page-actions">
        <button type="button" className="assets-page-action" onClick={openDepositPaymentSheet}>
          <span className="assets-page-action-icon assets-page-action-icon--deposit">
            <DepositIcon />
          </span>
          <span>Deposit</span>
        </button>
        <Link href="/dashboard/sell" className="assets-page-action">
          <span className="assets-page-action-icon">
            <WithdrawIcon />
          </span>
          <span>Withdraw</span>
        </Link>
      </div>

      <section className="assets-page-list-section">
        <div className="assets-page-list-head">
          <span className="assets-page-list-tab assets-page-list-tab--active">Asset</span>
        </div>

        {error && <div className="alert alert-error assets-page-alert">{error}</div>}

        {loading && assets.length === 0 ? (
          <AppLoadingScreen fullScreen={false} className="app-loading-screen--inline" size={56} />
        ) : (
          <ul className="assets-page-list">
            {assets.map((a) => (
              <li key={a.code} className="assets-page-row">
                <div className="assets-page-row-left">
                  <CoinIcon
                    code={a.code}
                    imageUrl={coinImages[String(a.code || '').toUpperCase()]}
                    sizeClass="assets-page-row-icon"
                  />
                  <div className="assets-page-row-text">
                    <span className="assets-page-row-code">{a.code}</span>
                    <span className="assets-page-row-sub">0.00 (0.00%)</span>
                  </div>
                </div>
                <div className="assets-page-row-right">
                  <span className="assets-page-row-amount">
                    {balanceHidden ? '****' : formatCryptoBalance(a.balance)}
                  </span>
                  <span className="assets-page-row-usd">
                    {formatUsdLabel(a.usdValue, { hide: balanceHidden })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && assets.length === 0 && !error && (
          <p className="assets-page-empty">No crypto in your wallet yet. Deposit or buy to get started.</p>
        )}
      </section>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="assets-page-caret">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.8 21.8 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

function DepositIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

function WithdrawIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

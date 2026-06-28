'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTransactions, getWalletsForDashboard } from '@/lib/api';

const FALLBACK_PRICES = { BTC: 50000, ETH: 2000, USDT: 1, USDC: 1, BNB: 650, SOL: 150, XRP: 0.5 };

/** Normalize currency code (trim, uppercase, map aliases like ETHEREUM -> ETH). */
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

/** Dashboard uses app ledger only (GET /api/wallets / DB) — no Coinbase on-chain balances. */
function ledgerRowsToWallets(ledger) {
  const raw = Array.isArray(ledger) ? ledger : [];
  return raw
    .map((w) => {
      const c = normCurrency(w.currency);
      if (!c) return null;
      return { id: w.id || c, currency: c, balance: toNum(w.balance) };
    })
    .filter(Boolean);
}

/** USD per 1 unit; stablecoins pegged to 1; then CoinGecko live prices; else static fallbacks. */
function makeUsdUnitGetter(liveUsd) {
  return (currency) => {
    const c = currency || '';
    if (c === 'USDT' || c === 'USDC') return 1;
    const live = liveUsd && typeof liveUsd[c] === 'number' && liveUsd[c] > 0 ? liveUsd[c] : null;
    if (live != null) return live;
    return FALLBACK_PRICES[c] ?? 0;
  };
}

export function DashboardClient({ initialWallets, userId, refreshKey }) {
  const hasInitialWallets = Array.isArray(initialWallets);
  const [wallets, setWallets] = useState(() => ledgerRowsToWallets(initialWallets));
  const [walletError, setWalletError] = useState(null);
  const [walletReady, setWalletReady] = useState(hasInitialWallets);
  const [transactions, setTransactions] = useState([]);
  const [txReady, setTxReady] = useState(false);
  /** CoinGecko markets: USD prices + official image URLs (same request). */
  const [coinGecko, setCoinGecko] = useState(null);

  useEffect(() => {
    const symbols = [...new Set(wallets.map((w) => w.currency).filter(Boolean))];
    if (symbols.length === 0) {
      setCoinGecko({ prices: {}, images: {} });
      return;
    }
    const ac = new AbortController();
    fetch(`/api/coingecko/prices?symbols=${encodeURIComponent(symbols.join(','))}`, {
      signal: ac.signal,
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) =>
        setCoinGecko({
          prices: d.prices && typeof d.prices === 'object' ? d.prices : {},
          images: d.images && typeof d.images === 'object' ? d.images : {},
        }),
      )
      .catch(() => setCoinGecko({ prices: {}, images: {} }));
    return () => ac.abort();
  }, [wallets]);

  useEffect(() => {
    if (!userId) return;
    setWalletError(null);
    let cancelled = false;
    if (!hasInitialWallets) setWalletReady(false);
    getWalletsForDashboard()
      .then((data) => {
        const raw = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
        return ledgerRowsToWallets(raw);
      })
      .catch((e) => {
        console.warn('[dashboard] getWalletsForDashboard failed', e?.message || e);
        return [];
      })
      .then((list) => {
        if (cancelled) return;
        setWalletReady(true);
        if (!cancelled) setWallets(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setWalletReady(true);
          setWalletError(err?.message || 'Could not load balances. Please try again.');
        }
      });
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, refreshKey]);

  async function refresh() {
    if (!userId) return;
    try {
      const ledgerRaw = await getWalletsForDashboard().catch(() => []);
      const raw = Array.isArray(ledgerRaw) ? ledgerRaw : (ledgerRaw && Array.isArray(ledgerRaw.data) ? ledgerRaw.data : []);
      setWallets(ledgerRowsToWallets(raw));
    } catch (e) {
      console.warn('[dashboard] refresh failed', e?.message || e);
    }
  }

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setTxReady(false);
    getTransactions()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) {
          setTransactions(list);
          setTxReady(true);
        }
      })
      .catch((e) => {
        console.warn('[dashboard] getTransactions failed', e?.message || e);
        if (!cancelled) {
          setTransactions([]);
          setTxReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  const getUsdUnit = makeUsdUnitGetter(coinGecko?.prices ?? null);
  const totalUsd = wallets.reduce((sum, w) => sum + toNum(w.balance) * getUsdUnit(w.currency), 0);
  const balanceStr = totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const showPortfolioTotal = walletReady;
  const topTransactions = transactions.slice(0, 3);

  if (walletError) {
    return (
      <div className="empty-state" style={{ margin: '1.25rem', background: 'var(--dash-card)', border: '1px solid var(--dash-border)', color: 'var(--dash-muted)' }}>
        <p style={{ color: 'var(--dash-danger)' }}>{walletError}</p>
        <p style={{ fontSize: '0.875rem' }}>Try refreshing. If the problem continues, sign out and sign in again.</p>
        <button
          type="button"
          onClick={() => {
            setWalletError(null);
            refresh();
          }}
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!walletReady && !wallets.length) {
    return (
      <div style={{ padding: '3rem 1.25rem', textAlign: 'center', color: 'var(--dash-muted)' }}>
        Loading portfolio…
      </div>
    );
  }

  return (
    <>
      <section className="dash-home-balance">
        <div className="dash-home-estimate-row">
          <span className="dash-home-estimate-label">Est. total value</span>
          <button type="button" className="dash-home-eye" aria-label="Toggle balance visibility">
            <EyeIcon />
          </button>
        </div>
        <div className="dash-home-total" aria-busy={!showPortfolioTotal}>
          {showPortfolioTotal ? (
            <>
              <span className="dash-home-total-value">{balanceStr}</span>
              <span className="dash-home-total-currency">USD</span>
            </>
          ) : (
            <>
              <span className="dash-home-total-value dash-home-total-value--pending">—</span>
              <span className="dash-home-total-currency">USD</span>
            </>
          )}
        </div>
      </section>

      <div className="dash-home-quick-actions">
        <Link href="/dashboard/buy" className="dash-home-quick-action">
          <span className="dash-home-quick-action-icon dash-home-quick-action-icon--light">
            <PlusIcon />
          </span>
          <span>Deposit</span>
        </Link>
        <Link href="/dashboard/buy" className="dash-home-quick-action">
          <span className="dash-home-quick-action-icon">
            <CryptoIcon />
          </span>
          <span>Buy Crypto</span>
        </Link>
        <Link href="/dashboard/transfer" className="dash-home-quick-action">
          <span className="dash-home-quick-action-icon">
            <SwapIcon />
          </span>
          <span>Send</span>
        </Link>
        <Link href="/dashboard/card" className="dash-home-quick-action">
          <span className="dash-home-quick-action-icon">
            <CardIcon />
          </span>
          <span>Card</span>
        </Link>
      </div>

      <section className="dash-home-banner">
        <div>
          <p className="dash-home-banner-title">Invite friends</p>
          <p className="dash-home-banner-text">Earn up to 40% commission!</p>
        </div>
        <div className="dash-home-banner-badge" aria-hidden>
          <GiftIcon />
        </div>
      </section>

      <section className="dash-home-card dash-home-card--transactions">
        <div className="dash-home-card-head">
          <h2>Transactions</h2>
          <button type="button" className="dash-home-card-menu" aria-label="More transaction actions">
            <MoreIcon />
          </button>
        </div>
        {!txReady && <p className="dash-home-empty">Loading transactions...</p>}
        {txReady && topTransactions.length === 0 && <p className="dash-home-empty">No transactions yet.</p>}
        {txReady && topTransactions.length > 0 && (
          <div className="dash-home-transactions">
            {topTransactions.map((tx) => (
              <article key={tx.id} className="dash-home-transaction-row">
                <span className="dash-home-transaction-icon" aria-hidden>
                  <TxTypeIcon tx={tx} />
                </span>
                <div className="dash-home-transaction-meta">
                  <p className="dash-home-transaction-title">{tx.description || 'Transaction'}</p>
                  <p className="dash-home-transaction-date">{formatTxDate(tx.created_at)}</p>
                </div>
                <div className="dash-home-transaction-right">
                  <p className="dash-home-transaction-amount">{formatTxAmount(tx)}</p>
                  <p className="dash-home-transaction-status">{formatTxStatus(tx)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function formatTxAmount(tx) {
  const amount = Math.abs(Number(tx?.amount) || 0);
  const sign = tx?.direction === 'in' ? '+' : '-';
  const currency = (tx?.currency || '').toUpperCase() || 'USD';
  return `${sign}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatTxStatus(tx) {
  if (tx?.direction === 'in') return 'Successful';
  if (tx?.type === 'buy' || tx?.metadata?.source === 'moonpay') return 'Authorized';
  return 'Completed';
}

function TxTypeIcon({ tx }) {
  const type = tx?.type || '';
  if (type === 'buy' || tx?.metadata?.source === 'moonpay') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    );
  }
  if (type === 'sell') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 3v18M5 12h14" />
      </svg>
    );
  }
  if (type === 'transfer') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M7 8h12M7 8l3-3M7 8l3 3M17 16H5M17 16l-3 3M17 16l-3-3" />
      </svg>
    );
  }
  if (type === 'affiliate') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 2 15 8.5 22 9.5 17 14.5 18.5 22 12 18.5 5.5 22 7 14.5 2 9.5 9 8.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function formatTxDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  const h = `${d.getHours()}`.padStart(2, '0');
  const min = `${d.getMinutes()}`.padStart(2, '0');
  const s = `${d.getSeconds()}`.padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CryptoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      <circle cx="12" cy="12" r="4.5" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="-2 -2 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 8h12M7 8l3-3M7 8l3 3M17 16H5M17 16l-3-3M17 16l-3 3" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M2 10h20" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M12 8v13M3 13h18M7.5 8a2.5 2.5 0 1 1 0-5c2 0 4.5 3 4.5 5M16.5 8a2.5 2.5 0 1 0 0-5c-2 0-4.5 3-4.5 5" />
    </svg>
  );
}


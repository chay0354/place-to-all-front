'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AccountInviteCard } from '@/components/AccountInviteCard';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { computeLiveUsdTotal, walletPricesReady } from '@/lib/coingecko-prices';
import { getTransactionsForDashboard, getWalletsForDashboard } from '@/lib/api';
import {
  QUICK_DISPLAY_CURRENCIES,
  formatDisplayBalance,
  getDisplayCurrency,
  setDisplayCurrency,
} from '@/lib/display-currency';

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

export function DashboardClient({
  initialWallets,
  initialTransactions,
  initialCoinGecko = null,
  userId,
  refreshKey,
  canSeeAffiliation = false,
}) {
  const hasInitialWallets = Array.isArray(initialWallets);
  const hasInitialTransactions = Array.isArray(initialTransactions);
  const hasInitialPrices = Boolean(initialCoinGecko?.prices && walletPricesReady(ledgerRowsToWallets(initialWallets), initialCoinGecko.prices));
  const [wallets, setWallets] = useState(() => ledgerRowsToWallets(initialWallets));
  const [walletError, setWalletError] = useState(null);
  const [walletReady, setWalletReady] = useState(hasInitialWallets);
  const [transactions, setTransactions] = useState(() => (hasInitialTransactions ? initialTransactions : []));
  const [txReady, setTxReady] = useState(hasInitialTransactions);
  /** CoinGecko markets: USD prices + official image URLs (same request). */
  const [coinGecko, setCoinGecko] = useState(() =>
    hasInitialPrices ? { prices: initialCoinGecko.prices, images: initialCoinGecko.images || {} } : null,
  );
  const [pricesFetched, setPricesFetched] = useState(hasInitialPrices);
  const [balanceHidden, setBalanceHidden] = useState(true);
  const [displayCurrency, setDisplayCurrencyState] = useState('USD');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const currencyRef = useRef(null);

  useEffect(() => {
    setDisplayCurrencyState(getDisplayCurrency());
    const sync = () => setDisplayCurrencyState(getDisplayCurrency());
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', sync);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, []);

  useEffect(() => {
    if (!currencyOpen) return;
    function onPointerDown(e) {
      if (currencyRef.current && !currencyRef.current.contains(e.target)) {
        setCurrencyOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [currencyOpen]);

  useEffect(() => {
    const symbols = [...new Set(wallets.map((w) => w.currency).filter(Boolean))];
    if (symbols.length === 0) {
      setCoinGecko({ prices: {}, images: {} });
      setPricesFetched(true);
      return;
    }

    if (walletPricesReady(wallets, coinGecko?.prices)) {
      setPricesFetched(true);
      return;
    }

    let active = true;
    const ac = new AbortController();
    fetch(`/api/coingecko/prices?symbols=${encodeURIComponent(symbols.join(','))}`, {
      signal: ac.signal,
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (!active) return;
        setCoinGecko({
          prices: d.prices && typeof d.prices === 'object' ? d.prices : {},
          images: d.images && typeof d.images === 'object' ? d.images : {},
        });
      })
      .catch(() => {
        if (!active) return;
        setCoinGecko({ prices: {}, images: {} });
      })
      .finally(() => {
        if (active) setPricesFetched(true);
      });

    return () => {
      active = false;
      ac.abort();
    };
  }, [wallets, refreshKey]);

  useEffect(() => {
    if (!userId) return;
    setWalletError(null);
    let cancelled = false;

    const shouldFetchWallets = !hasInitialWallets || refreshKey;
    if (shouldFetchWallets) {
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
          setWallets(list);
        })
        .catch((err) => {
          if (!cancelled) {
            setWalletReady(true);
            setWalletError(err?.message || 'Could not load balances. Please try again.');
          }
        });
    }

    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, refreshKey, hasInitialWallets]);

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
    if (!userId) {
      setTransactions([]);
      setTxReady(true);
      return;
    }
    let active = true;
    if (!hasInitialTransactions) setTxReady(false);

    const load = getTransactionsForDashboard();
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Transactions request timed out')), 15000);
    });

    Promise.race([load, timeout])
      .then((data) => {
        if (!active) return;
        setTransactions(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.warn('[dashboard] getTransactionsForDashboard failed', e?.message || e);
        if (!active) return;
        setTransactions([]);
      })
      .finally(() => {
        if (active) setTxReady(true);
      });

    return () => {
      active = false;
    };
  }, [userId, refreshKey, hasInitialTransactions]);

  const livePrices = coinGecko?.prices ?? null;
  const totalUsd = computeLiveUsdTotal(wallets, livePrices);
  const balanceStr = formatDisplayBalance(totalUsd, displayCurrency);
  const pricesReady = pricesFetched && walletPricesReady(wallets, livePrices);
  const showPortfolioTotal = walletReady && pricesReady;
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
    return <AppLoadingScreen />;
  }

  return (
    <>
      <section className="dash-home-balance">
        <div className="dash-home-estimate-row">
          <span className="dash-home-estimate-label">Available balance</span>
          <button
            type="button"
            className="dash-home-eye"
            aria-label={balanceHidden ? 'Show balance' : 'Hide balance'}
            aria-pressed={balanceHidden}
            onClick={() => setBalanceHidden((v) => !v)}
          >
            {balanceHidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <div className="dash-home-total" aria-busy={!showPortfolioTotal}>
          {showPortfolioTotal ? (
            <span className="dash-home-total-value">
              {balanceHidden ? '****' : balanceStr}
            </span>
          ) : (
            <span className="dash-home-total-value dash-home-total-value--pending">—</span>
          )}
          <div className="dash-home-currency-picker" ref={currencyRef}>
            <button
              type="button"
              className="dash-home-currency-trigger"
              aria-haspopup="listbox"
              aria-expanded={currencyOpen}
              onClick={() => setCurrencyOpen((v) => !v)}
            >
              <span className="dash-home-total-currency">{displayCurrency}</span>
              <ChevronDownIcon className="dash-home-caret dash-home-caret--currency" />
            </button>
            {currencyOpen && (
              <ul className="dash-home-currency-menu" role="listbox" aria-label="Display currency">
                {QUICK_DISPLAY_CURRENCIES.map((code) => (
                  <li key={code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={displayCurrency === code}
                      className={`dash-home-currency-option${displayCurrency === code ? ' dash-home-currency-option--active' : ''}`}
                      onClick={() => {
                        setDisplayCurrency(code);
                        setDisplayCurrencyState(code);
                        setCurrencyOpen(false);
                      }}
                    >
                      {code}
                    </button>
                  </li>
                ))}
                <li>
                  <Link
                    href="/dashboard/currency"
                    className="dash-home-currency-more"
                    onClick={() => setCurrencyOpen(false)}
                  >
                    More
                  </Link>
                </li>
              </ul>
            )}
          </div>
        </div>
      </section>

      <div className="dash-home-quick-actions">
        <Link href="/dashboard/deposit" className="dash-home-quick-action">
          <span className="dash-home-quick-action-icon dash-home-quick-action-icon--light">
            <DepositIcon />
          </span>
          <span>Deposit</span>
        </Link>
        <Link href="/dashboard/sell" className="dash-home-quick-action">
          <span className="dash-home-quick-action-icon">
            <WithdrawIcon />
          </span>
          <span>Withdrawal</span>
        </Link>
        <Link href="/dashboard/affiliation" className="dash-home-quick-action">
          <span className="dash-home-quick-action-icon">
            <AffiliateIcon />
          </span>
          <span>Payment links</span>
        </Link>
        <Link href="/dashboard/more" className="dash-home-quick-action">
          <span className="dash-home-quick-action-icon">
            <MoreIcon />
          </span>
          <span>More</span>
        </Link>
      </div>

      {canSeeAffiliation && (
        <div className="dash-home-invite">
          <AccountInviteCard />
        </div>
      )}

      <section className="dash-home-card dash-home-card--transactions">
        <div className="dash-home-card-head">
          <h2>Transactions</h2>
          <button type="button" className="dash-home-card-menu" aria-label="More transaction actions">
            <MoreIcon />
          </button>
        </div>
        {!txReady && <AppLoadingScreen fullScreen={false} className="app-loading-screen--section" size={56} />}
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

function ChevronDownIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4 7 11 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function DepositIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 19h14" />
    </svg>
  );
}

function AffiliateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </svg>
  );
}

function WithdrawIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5M5 12l7-7 7 7" />
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


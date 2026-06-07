'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTransactions, getWalletsForDashboard } from '@/lib/api';
import { assetLabel } from '@/lib/asset-names';
import { CoinIcon } from '@/components/CoinIcon';

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
  const [wallets, setWallets] = useState(() => ledgerRowsToWallets(initialWallets));
  const [walletError, setWalletError] = useState(null);
  const [walletReady, setWalletReady] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [txReady, setTxReady] = useState(false);
  const [portfolioTab, setPortfolioTab] = useState('crypto');
  const [detailWallet, setDetailWallet] = useState(null);
  /** CoinGecko markets: USD prices + official image URLs (same request). */
  const [coinGecko, setCoinGecko] = useState(null);
  /** Avoid showing Est. total with static fallback prices, then jumping to live — wait for this fetch. */
  const [usdPricesReady, setUsdPricesReady] = useState(false);

  useEffect(() => {
    const symbols = [...new Set(wallets.map((w) => w.currency).filter(Boolean))];
    if (symbols.length === 0) {
      setCoinGecko({ prices: {}, images: {} });
      setUsdPricesReady(true);
      return;
    }
    setUsdPricesReady(false);
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
      .catch(() => setCoinGecko({ prices: {}, images: {} }))
      .finally(() => {
        if (!ac.signal.aborted) setUsdPricesReady(true);
      });
    return () => ac.abort();
  }, [wallets]);

  useEffect(() => {
    if (!userId) return;
    setWalletError(null);
    let cancelled = false;
    setWalletReady(false);
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
  const showPortfolioTotal = walletReady && usdPricesReady;
  const topTransactions = transactions.slice(0, 4);
  const txIncoming = topTransactions.filter((tx) => tx.direction === 'in');
  const txOutgoing = topTransactions.filter((tx) => tx.direction !== 'in');
  const incomingTotal = txIncoming.reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
  const outgoingTotal = txOutgoing.reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
  const latestTx = topTransactions[0] || null;

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

      <section className="dash-home-card">
        <div className="dash-home-card-head">
          <h2>Transactions</h2>
          <button type="button" className="dash-home-card-menu" aria-label="More transaction actions">
            <MoreIcon />
          </button>
        </div>
        {txReady && topTransactions.length > 0 && (
          <div className="dash-home-summary-grid">
            <div className="dash-home-summary-tile">
              <p className="dash-home-summary-label">Incoming</p>
              <p className="dash-home-summary-value positive">+{incomingTotal.toFixed(2)}</p>
            </div>
            <div className="dash-home-summary-tile">
              <p className="dash-home-summary-label">Outgoing</p>
              <p className="dash-home-summary-value negative">-{outgoingTotal.toFixed(2)}</p>
            </div>
            <div className="dash-home-summary-tile">
              <p className="dash-home-summary-label">Latest</p>
              <p className="dash-home-summary-value">{latestTx?.currency || '-'}</p>
            </div>
          </div>
        )}
        {!txReady && <p className="dash-home-empty">Loading transactions...</p>}
        {txReady && topTransactions.length === 0 && <p className="dash-home-empty">No transactions yet.</p>}
        {txReady && topTransactions.length > 0 && (
          <div className="dash-home-transactions">
            {topTransactions.map((tx) => (
              <article key={tx.id} className="dash-home-transaction-row">
                <div className="dash-home-transaction-left">
                  <span className="dash-home-transaction-icon">{tx.direction === 'in' ? '+' : '-'}</span>
                  <div>
                    <p className="dash-home-transaction-title">{tx.description || 'Transaction'}</p>
                    <p className="dash-home-transaction-date">{formatTxDate(tx.created_at)}</p>
                  </div>
                </div>
                <div className="dash-home-transaction-right">
                  <p className="dash-home-transaction-amount">{formatTxAmount(tx)}</p>
                  <p className={`dash-home-transaction-status ${tx.direction === 'in' ? 'ok' : ''}`}>
                    {tx.direction === 'in' ? 'Successful' : 'Completed'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dash-portfolio-card" aria-label="Portfolio">
        <div className="dash-portfolio-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={portfolioTab === 'crypto'}
            className={`dash-portfolio-tab ${portfolioTab === 'crypto' ? 'dash-portfolio-tab--active' : ''}`}
            onClick={() => setPortfolioTab('crypto')}
          >
            Crypto
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={portfolioTab === 'fiat'}
            className={`dash-portfolio-tab ${portfolioTab === 'fiat' ? 'dash-portfolio-tab--active' : ''}`}
            onClick={() => setPortfolioTab('fiat')}
          >
            Fiat
          </button>
        </div>

        {portfolioTab === 'fiat' && (
          <div className="dash-portfolio-fiat-empty">
            <p>No fiat balances yet.</p>
            <p className="dash-portfolio-fiat-hint">Fiat wallets can be linked here when available.</p>
          </div>
        )}

        {portfolioTab === 'crypto' && (
          <div className="dash-balances-table dash-balances-table--ref">
            <div className="dash-balances-table-rows dash-balances-table-rows--flush">
              {[...wallets]
                .filter((w) => (Number(w.balance) || 0) > 0)
                .sort((a, b) => {
                  const db = (Number(b.balance) || 0) - (Number(a.balance) || 0);
                  if (db !== 0) return db;
                  return String(a.currency).localeCompare(String(b.currency));
                })
                .map((w) => {
                  const bal = Number(w.balance) || 0;
                  const valueUsd = bal * getUsdUnit(w.currency);
                  const balStr =
                    bal >= 0.0001
                      ? bal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })
                      : String(bal);
                  const ticker = (w.currency || '').toUpperCase();
                  return (
                    <button
                      key={w.id}
                      type="button"
                      className="dash-asset-row dash-asset-row--list"
                      onClick={() => setDetailWallet(w)}
                    >
                      <div className="dash-asset-left dash-asset-left--stack">
                        <CoinIcon
                          currency={w.currency}
                          imageUrl={coinGecko?.images?.[(w.currency || '').toUpperCase()]}
                          sizeClass="market-row-icon"
                        />
                        <div className="dash-asset-names-col">
                          <span className="dash-asset-symbol">{ticker}</span>
                          <span className="dash-asset-fullname">{assetLabel(w.currency)}</span>
                        </div>
                      </div>
                      <div className="dash-asset-right dash-asset-right--stack">
                        <span className="dash-asset-qty-row">
                          {balStr} {ticker}
                        </span>
                        <span className="dash-asset-fiat-sub">
                          ≈{' '}
                          {valueUsd.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          USD
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </section>

      {portfolioTab === 'crypto' && wallets.filter((w) => (Number(w.balance) || 0) > 0).length === 0 && (
        <div className="dash-portfolio-empty-below">
          No balances yet.{' '}
          <Link href="/dashboard/buy" className="dash-portfolio-empty-link">
            Buy crypto
          </Link>{' '}
          to see your assets here.
        </div>
      )}

      {detailWallet && (
        <AssetDetailOverlay
          wallet={detailWallet}
          onClose={() => setDetailWallet(null)}
          getUsdUnitPrice={getUsdUnit}
          coinImages={coinGecko?.images}
        />
      )}
    </>
  );
}

function AssetDetailOverlay({ wallet, onClose, getUsdUnitPrice, coinImages }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const c = (wallet.currency || '').toUpperCase();
  const bal = Number(wallet.balance) || 0;
  const unit = getUsdUnitPrice(c);
  const valueUsd = bal * unit;
  const balStr =
    bal >= 0.0001
      ? bal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })
      : String(bal);

  return (
    <div className="dash-asset-overlay" role="dialog" aria-modal="true" aria-labelledby="dash-asset-overlay-title">
      <button type="button" className="dash-asset-overlay-backdrop" aria-label="Close" onClick={onClose} />
      <div className="dash-asset-overlay-panel">
        <header className="dash-asset-overlay-top">
          <button type="button" className="dash-asset-overlay-close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        <div className="dash-asset-overlay-hero">
          <div className="dash-asset-overlay-icon-wrap">
            <CoinIcon
              currency={wallet.currency}
              imageUrl={coinImages?.[(wallet.currency || '').toUpperCase()]}
            />
          </div>
          <h2 id="dash-asset-overlay-title" className="dash-asset-overlay-title">
            {assetLabel(wallet.currency)}
          </h2>
          <p className="dash-asset-overlay-ticker">{c}</p>
        </div>
        <div className="dash-asset-overlay-balances">
          <p className="dash-asset-overlay-amount">
            {balStr} <span className="dash-asset-overlay-unit">{c}</span>
          </p>
          <p className="dash-asset-overlay-usd">
            ≈{' '}
            {valueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </p>
          <p className="dash-asset-overlay-ledger">App ledger balance · USD estimate from CoinGecko when available</p>
        </div>
        <div className="dash-asset-overlay-actions">
          <Link href="/dashboard/buy" className="dash-asset-overlay-btn dash-asset-overlay-btn--primary" onClick={onClose}>
            Buy / Deposit
          </Link>
          <Link href="/dashboard/transfer" className="dash-asset-overlay-btn dash-asset-overlay-btn--ghost" onClick={onClose}>
            Send
          </Link>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function formatTxAmount(tx) {
  const amount = Math.abs(Number(tx?.amount) || 0);
  const sign = tx?.direction === 'in' ? '+' : '-';
  const currency = (tx?.currency || '').toUpperCase() || 'USD';
  return `${sign}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${currency}`;
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
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

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

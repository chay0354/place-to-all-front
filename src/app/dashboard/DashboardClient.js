'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTransactions, getWalletsForDashboard } from '@/lib/api';
import { assetLabel } from '@/lib/asset-names';

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

function walletIconClass(currency) {
  const c = (currency || '').toLowerCase();
  if (c === 'btc') return 'btc';
  if (c === 'eth') return 'eth';
  if (c === 'usdt' || c === 'usdc') return 'usdt';
  return 'other';
}

/** USD estimate for portfolio header (static — avoids live price API changing the total on every refresh). */
function usdUnitPrice(currency) {
  const c = currency || '';
  if (c === 'USDT' || c === 'USDC') return 1;
  return FALLBACK_PRICES[c] ?? 0;
}

export function DashboardClient({ initialWallets, userId, refreshKey }) {
  const [wallets, setWallets] = useState(() => ledgerRowsToWallets(initialWallets));
  const [walletError, setWalletError] = useState(null);
  const [walletReady, setWalletReady] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [txReady, setTxReady] = useState(false);

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

  const totalUsd = wallets.reduce((sum, w) => sum + toNum(w.balance) * usdUnitPrice(w.currency), 0);
  const balanceStr = totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        <div className="dash-home-total">
          <span className="dash-home-total-value">{balanceStr}</span>
          <span className="dash-home-total-currency">USD</span>
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

      <section className="dash-assets-header">
        <h2 className="dash-assets-title">Assets</h2>
      </section>
      <div className="dash-balances-table" style={{ margin: '0 1rem', background: 'var(--dash-card)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--dash-border)' }}>
        <div className="dash-balances-table-header" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 0, fontSize: '0.75rem', color: 'var(--dash-muted)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--dash-border)' }}>
          <span>Asset</span>
          <span>Balance</span>
        </div>
        <div className="dash-balances-table-rows">
        {[...wallets]
          .filter((w) => (Number(w.balance) || 0) > 0)
          .sort((a, b) => {
            const db = (Number(b.balance) || 0) - (Number(a.balance) || 0);
            if (db !== 0) return db;
            return String(a.currency).localeCompare(String(b.currency));
          })
          .map((w) => {
          const bal = Number(w.balance) || 0;
          const valueUsd = bal * usdUnitPrice(w.currency);
          const balStr = bal >= 0.0001
            ? bal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 })
            : String(bal);
          const subtitle = w.currency === 'ETH' ? 'ETH · App ledger' : w.currency === 'BTC' ? 'Bitcoin · App ledger' : w.currency === 'USDT' || w.currency === 'USDC' ? 'Stablecoin · App ledger' : `${w.currency} · App ledger`;
          return (
            <div key={w.id} className="dash-asset-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem 1rem', alignItems: 'center', padding: '1.25rem 1rem' }}>
              <div className="dash-asset-left" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className={`dash-asset-icon ${walletIconClass(w.currency)}`}>
                  {w.currency === 'BTC' ? 'B' : w.currency === 'ETH' ? 'Ξ' : w.currency === 'USDT' || w.currency === 'USDC' ? '₮' : (w.currency || '?').slice(0, 1)}
                </div>
                <div>
                  <div className="dash-asset-name" style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{assetLabel(w.currency)}</div>
                  <div className="dash-asset-chain" style={{ fontSize: '0.75rem', color: 'var(--dash-muted)', marginTop: 2 }}>{subtitle}</div>
                </div>
              </div>
              <div className="dash-asset-right" style={{ textAlign: 'right' }}>
                <div className="dash-asset-qty" style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                  {balStr} {w.currency}
                </div>
                <div className="dash-asset-value" style={{ fontSize: '0.75rem', color: 'var(--dash-muted)', marginTop: 2 }}>
                  ${valueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
      {wallets.filter((w) => (Number(w.balance) || 0) > 0).length === 0 && (
        <div style={{ margin: '1rem 1.25rem', padding: '1.5rem', textAlign: 'center', color: 'var(--dash-muted)', fontSize: '0.875rem' }}>
          No balances yet. <Link href="/dashboard/buy" style={{ color: 'var(--dash-primary)' }}>Buy crypto</Link> to see your assets here.
        </div>
      )}
    </>
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
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

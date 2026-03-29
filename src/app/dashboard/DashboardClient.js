'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getWalletsForDashboard } from '@/lib/api';

const ASSET_NAMES = { BTC: 'Bitcoin', ETH: 'Ethereum', USDT: 'Tether', USDC: 'USD Coin', BNB: 'BNB', SOL: 'Solana', XRP: 'XRP', ADA: 'Cardano', DOGE: 'Dogecoin', DOT: 'Polkadot', MATIC: 'Polygon', LINK: 'Chainlink', UNI: 'Uniswap', AVAX: 'Avalanche', LTC: 'Litecoin', ATOM: 'Cosmos', XLM: 'Stellar', ALGO: 'Algorand', FIL: 'Filecoin', VET: 'VeChain', TRX: 'TRON', NEAR: 'NEAR', APT: 'Aptos', ARB: 'Arbitrum', OP: 'Optimism', INJ: 'Injective', IMX: 'Immutable X', SHIB: 'Shiba Inu', PEPE: 'Pepe', FLOKI: 'FLOKI' };
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

function assetLabel(currency) {
  return ASSET_NAMES[currency] || currency || 'Crypto';
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
  const [balanceChangePercent, setBalanceChangePercent] = useState(null);

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

  const totalUsd = wallets.reduce((sum, w) => sum + toNum(w.balance) * usdUnitPrice(w.currency), 0);
  const changePercent = balanceChangePercent ?? 0;
  const isPositiveChange = changePercent >= 0;
  const balanceStr = totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const balanceParts = balanceStr.split('.');
  const balanceWhole = balanceParts[0];
  const balanceCents = balanceParts[1] ? `.${balanceParts[1]}` : '';

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

  if (!wallets.length) {
    return (
      <div className="empty-state" style={{ margin: '1.25rem', background: 'var(--dash-card)', border: '1px solid var(--dash-border)', color: 'var(--dash-muted)' }}>
        <p>Your wallet is ready. Buy crypto to add funds.</p>
        <Link href="/dashboard/buy" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Buy crypto
        </Link>
        <button type="button" onClick={refresh} className="btn btn-ghost refresh-btn">
          Refresh
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="dash-balance-card">
        <button type="button" className="dash-balance-settings" aria-label="Settings">
          <SettingsIcon />
        </button>
        <div className="dash-balance-label">
          <span>Current balance</span>
          <span>USD</span>
        </div>
        <div className="dash-balance-amount">
          $<span className="dash-balance-whole">{balanceWhole}</span>
          {balanceCents && <span className="dash-balance-cents">{balanceCents}</span>}
        </div>
        <div className={`dash-balance-change ${isPositiveChange ? '' : 'negative'}`}>
          <span>{isPositiveChange ? '↑' : '▼'}</span>
          <span>${Math.abs(changePercent).toFixed(2)} ({isPositiveChange ? '+' : ''}{changePercent.toFixed(1)}%)</span>
        </div>
      </div>

      <div className="dash-action-buttons">
        <Link href="/dashboard/transfer" className="dash-action-btn">
          <SendIcon />
          Send
        </Link>
        <Link href="/dashboard/buy" className="dash-action-btn">
          <ReceiveIcon />
          Buy
        </Link>
        <span
          className="dash-action-btn dash-action-btn--static"
          role="button"
          aria-disabled="true"
          tabIndex={-1}
        >
          <SwapIcon />
          Swap
        </span>
        <Link href="/dashboard" className="dash-action-btn">
          <MoreIcon />
          More
        </Link>
      </div>

      <div className="dash-assets-header">
        <h2 className="dash-assets-title">Balances</h2>
        <button type="button" className="dash-assets-filter">
          All Chains
          <ChevronDownIcon />
        </button>
      </div>
      <div className="dash-balances-table" style={{ margin: '0 1.25rem', background: 'var(--dash-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--dash-border)' }}>
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

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function ReceiveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" />
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

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

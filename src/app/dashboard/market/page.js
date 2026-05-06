'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getMarketOverview, getWalletsForDashboard } from '@/lib/api';
import { assetLabel } from '@/lib/asset-names';

/** Match dashboard wallet normalization so tickers align with market overview codes. */
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

function formatCryptoBalance(n) {
  if (n == null || !Number.isFinite(Number(n))) return '0';
  const x = Number(n);
  if (x === 0) return '0';
  if (Math.abs(x) >= 1) return x.toLocaleString('en-US', { maximumFractionDigits: 8 });
  return x.toPrecision(4);
}

function formatUsd(price) {
  if (price == null || !Number.isFinite(Number(price))) return '—';
  const n = Number(price);
  if (n >= 1) {
    return n.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: n >= 100 ? 2 : 4,
    });
  }
  if (n >= 0.0001) {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
  }
  return `$${n.toPrecision(4)}`;
}

/** Defined in this file so webpack does not split a separate chunk (reduces missing-chunk errors on Windows dev). */
function iconClassForCode(code) {
  const c = String(code || '').toLowerCase();
  if (c === 'btc') return 'btc';
  if (c === 'eth') return 'eth';
  if (c === 'usdt' || c === 'usdc') return 'usdt';
  if (c === 'sol') return 'sol';
  if (c === 'bnb') return 'bnb';
  return 'other';
}

function initialForCode(code) {
  const u = String(code || '').toUpperCase();
  if (u === 'BTC') return 'B';
  if (u === 'ETH') return 'Ξ';
  if (u === 'USDT' || u === 'USDC') return '₮';
  return u.slice(0, 1) || '?';
}

function MarketCoinIcon({ code, imageUrl, sizeClass = 'market-row-icon' }) {
  const [failed, setFailed] = useState(false);

  if (imageUrl && String(imageUrl).startsWith('http') && !failed) {
    return (
      <div
        className={`dash-asset-icon dash-asset-icon--rich dash-asset-icon--photo coin-icon ${sizeClass}`}
        aria-hidden
      >
        <img
          src={imageUrl}
          alt=""
          className="dash-asset-icon-img"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`dash-asset-icon ${sizeClass} ${iconClassForCode(code)}`} aria-hidden>
      {initialForCode(code)}
    </div>
  );
}

export default function MarketPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assets, setAssets] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [coinImages, setCoinImages] = useState({});

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

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login');
    });
  }, [router]);

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
        const priceByCode = new Map(
          (Array.isArray(market.assets) ? market.assets : []).map((a) => [
            String(a.code || '').toUpperCase(),
            a.priceUsd,
          ]),
        );
        const merged = [...byCurrency.entries()]
          .filter(([, bal]) => bal > 0)
          .map(([code, balance]) => ({
            code,
            balance,
            priceUsd: priceByCode.get(code),
          }))
          .sort((a, b) => assetLabel(a.code).localeCompare(assetLabel(b.code)));
        setAssets(merged);
        setUpdatedAt(market.updatedAt || null);
      })
      .catch((e) => setError(e?.message || 'Could not load market data'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => {
      const code = (a.code || '').toLowerCase();
      const name = assetLabel(a.code).toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [assets, query]);

  return (
    <div className="page market-page">
      <header className="market-header">
        <Link href="/dashboard" className="market-back">
          <span aria-hidden>←</span> Portfolio
        </Link>
        <h1 className="sr-only">Market</h1>
        <div className="market-stats">
          <div className="market-stat">
            <span className="market-stat-label">Assets</span>
            <span className="market-stat-value">{loading && assets.length === 0 ? '—' : assets.length}</span>
          </div>
        </div>
      </header>

      <div className="market-toolbar">
        <div className="market-search-wrap">
          <span className="market-search-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            type="search"
            className="market-search-input"
            placeholder="Search name or ticker…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search assets"
          />
        </div>
        <button type="button" className="btn btn-primary market-refresh" onClick={load} disabled={loading}>
          {loading ? 'Updating…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="alert alert-error market-alert">{error}</div>}

      <div className="market-table-card">
        <div className="market-table-head">
          <span>Asset</span>
          <span className="market-col-price">Price (USD)</span>
        </div>
        <div className={`market-table-body u-scroll-dark ${loading && assets.length === 0 ? 'market-table-body--empty' : ''}`}>
          {loading && assets.length === 0 ? (
            <div className="market-skeleton-wrap" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="market-skeleton-row">
                  <div className="market-skeleton market-skeleton--icon" />
                  <div className="market-skeleton market-skeleton--text" />
                  <div className="market-skeleton market-skeleton--price" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="market-rows">
              {filtered.map((a) => (
                <li key={a.code} className="market-row">
                  <div className="market-row-left">
                    <MarketCoinIcon
                      code={a.code}
                      imageUrl={coinImages[String(a.code || '').toUpperCase()]}
                    />
                    <div>
                      <div className="market-row-name">{assetLabel(a.code)}</div>
                      <div className="market-row-code">{a.code}</div>
                      <div className="market-row-holding">
                        {formatCryptoBalance(a.balance)} {a.code}
                      </div>
                    </div>
                  </div>
                  <div className="market-row-price">{formatUsd(a.priceUsd)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!loading && filtered.length === 0 && (
          <p className="market-empty">
            {assets.length === 0
              ? 'No crypto in your wallet yet. Buy or receive funds to see assets here.'
              : 'No matches for that search.'}
          </p>
        )}
      </div>

      {updatedAt && (
        <p className="market-updated">Updated {new Date(updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
      )}
    </div>
  );
}

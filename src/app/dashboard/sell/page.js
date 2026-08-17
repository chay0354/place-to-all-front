'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getWallets, sellCrypto, getCoinbaseSellQuote } from '@/lib/api';
import { DashScreenHeader } from '@/components/DashScreenHeader';
import { CoinIcon } from '@/components/CoinIcon';
import { assetLabel, assetNetwork } from '@/lib/asset-names';

function normCurrency(currency) {
  return String(currency || '').trim().toUpperCase();
}

export default function SellPage() {
  const [wallets, setWallets] = useState([]);
  const [walletId, setWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [coinImages, setCoinImages] = useState({});
  const [assetOpen, setAssetOpen] = useState(false);
  const assetRef = useRef(null);
  const router = useRouter();

  const selectedWallet = wallets.find((w) => w.id === walletId);
  const selectedCode = normCurrency(selectedWallet?.currency);
  const balance = selectedWallet != null ? Number(selectedWallet.balance) : 0;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      supabase.auth.getSession().then(({ data: { session } }) => setToken(session?.access_token));
    });
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    getWallets(userId, token)
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        const withBalance = list.filter((w) => Number(w.balance) > 0);
        setWallets(withBalance);
        setWalletId((prev) => {
          if (prev && withBalance.some((w) => w.id === prev)) return prev;
          return withBalance[0]?.id || '';
        });
      })
      .catch(() => setWallets([]));
  }, [userId, token]);

  useEffect(() => {
    const symbols = [...new Set(wallets.map((w) => normCurrency(w.currency)).filter(Boolean))];
    if (!symbols.length) {
      setCoinImages({});
      return;
    }
    const ac = new AbortController();
    fetch(`/api/coingecko/prices?symbols=${encodeURIComponent(symbols.join(','))}`, {
      signal: ac.signal,
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setCoinImages(d.images && typeof d.images === 'object' ? d.images : {}))
      .catch(() => setCoinImages({}));
    return () => ac.abort();
  }, [wallets]);

  useEffect(() => {
    if (!assetOpen) return;
    function onPointerDown(e) {
      if (assetRef.current && !assetRef.current.contains(e.target)) {
        setAssetOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [assetOpen]);

  useEffect(() => {
    const num = Number(amount);
    if (num > 0 && selectedWallet) {
      getCoinbaseSellQuote(num, selectedWallet.currency, 'USD').then(setQuote).catch(() => setQuote(null));
    } else setQuote(null);
  }, [amount, selectedWallet?.id, selectedWallet?.currency]);

  const fiatEstimate = useMemo(() => {
    if (!quote) return null;
    const v = quote.estimated_fiat ?? quote.fiat_amount;
    return v != null ? v : null;
  }, [quote]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!userId) return;
    setLoading(true);
    try {
      await sellCrypto(userId, { walletId, amount: Number(amount) }, token);
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Sell failed');
    } finally {
      setLoading(false);
    }
  }

  if (!userId) return null;

  return (
    <div className="page sell-page dash-screen">
      <DashScreenHeader title="Withdrawal" backHref="/dashboard/more" />
      <p className="page-desc">Convert your crypto to fiat. Test environment: balance returns to treasury.</p>

      <div className="card card-lg sell-card">
        <form className="sell-form" onSubmit={handleSubmit}>
          <div className="sell-field">
            <span className="sell-field-label">Coin</span>
            <div className="sell-asset-wrap" ref={assetRef}>
              <button
                type="button"
                className="sell-asset-selector"
                aria-haspopup="listbox"
                aria-expanded={assetOpen}
                disabled={!wallets.length}
                onClick={() => wallets.length && setAssetOpen((v) => !v)}
              >
                {selectedWallet ? (
                  <>
                    <span className="sell-asset-icon">
                      <CoinIcon
                        code={selectedCode}
                        imageUrl={coinImages[selectedCode]}
                        sizeClass="sell-coin-icon"
                      />
                    </span>
                    <span className="sell-asset-text">
                      <span className="sell-asset-name">
                        {assetLabel(selectedCode)}
                        <span className="sell-asset-code">{selectedCode}</span>
                      </span>
                      <span className="sell-asset-balance">
                        Balance: {balance.toFixed(6)} {selectedCode}
                      </span>
                    </span>
                    <span className="sell-asset-meta">
                      <span className="sell-asset-network">{assetNetwork(selectedCode)}</span>
                      <ChevronDownIcon />
                    </span>
                  </>
                ) : (
                  <span className="sell-asset-empty">No wallets with balance</span>
                )}
              </button>

              {assetOpen && wallets.length > 0 && (
                <ul className="sell-asset-menu" role="listbox" aria-label="Select coin">
                  {wallets.map((w) => {
                    const code = normCurrency(w.currency);
                    const active = w.id === walletId;
                    return (
                      <li key={w.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={`sell-asset-option${active ? ' sell-asset-option--active' : ''}`}
                          onClick={() => {
                            setWalletId(w.id);
                            setAssetOpen(false);
                            setAmount('');
                          }}
                        >
                          <CoinIcon
                            code={code}
                            imageUrl={coinImages[code]}
                            sizeClass="sell-coin-icon-sm"
                          />
                          <span className="sell-asset-option-text">
                            <span className="sell-asset-option-row">
                              <span className="sell-asset-option-name">{assetLabel(code)}</span>
                              <span className="sell-asset-option-code">{code}</span>
                            </span>
                            <span className="sell-asset-option-meta">
                              <span>{assetNetwork(code)}</span>
                              <span>
                                {Number(w.balance).toFixed(6)} {code}
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="sell-field">
            <span className="sell-field-label">Network</span>
            <div className="sell-network-box">
              <span className="sell-network-dot" aria-hidden />
              <span className="sell-network-value">
                {selectedWallet ? assetNetwork(selectedCode) : '—'}
              </span>
            </div>
          </div>

          {!wallets.length && (
            <p className="sell-empty-hint">
              No wallets with balance. <Link href="/dashboard/buy">Buy</Link> first.
            </p>
          )}

          <div className="sell-field">
            <div className="sell-field-label-row">
              <span className="sell-field-label">Amount</span>
              {selectedWallet && (
                <button
                  type="button"
                  className="sell-max-btn"
                  onClick={() => setAmount(String(balance))}
                >
                  Max
                </button>
              )}
            </div>
            <div className="sell-amount-row">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="sell-amount-input"
                disabled={!wallets.length}
              />
              <span className="sell-amount-suffix">{selectedCode || '—'}</span>
            </div>
            {fiatEstimate != null && (
              <p className="sell-fiat-hint">
                ≈ <strong>{fiatEstimate}</strong> USD
              </p>
            )}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button type="submit" disabled={loading || !wallets.length} className="sell-submit-btn">
            {loading ? 'Selling…' : 'Sell'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="sell-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { addCardToApplePay, fundCardFromCrypto, getCardAccount, getWalletsForDashboard, issueVirtualCard } from '@/lib/api';

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatAmt(v, max = 6) {
  return toNum(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: max });
}

function eventTitle(t) {
  if (t === 'issue') return 'Card issued';
  if (t === 'fund') return 'Card funded';
  if (t === 'spend') return 'Card payment';
  if (t === 'refund') return 'Refund';
  return 'Card update';
}

function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

function openAppleWallet(deeplink) {
  if (typeof window === 'undefined') return;
  const url = deeplink || 'shoebox://';
  window.location.href = url;
}

export default function CardPage() {
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cardData, setCardData] = useState({ card: null, recentEvents: [] });
  const [wallets, setWallets] = useState([]);
  const [currency, setCurrency] = useState('USDT');
  const [amount, setAmount] = useState('');
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login?next=%2Fdashboard%2Fcard');
        return;
      }
      setUserId(user.id);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setToken(session?.access_token || null));
  }, [router]);

  async function loadData(uid = userId, tkn = token) {
    if (!uid) return;
    const [cardRes, walletRes] = await Promise.all([
      getCardAccount(uid, tkn).catch(() => ({ card: null, recentEvents: [] })),
      getWalletsForDashboard().catch(() => []),
    ]);
    const walletList = Array.isArray(walletRes) ? walletRes : Array.isArray(walletRes?.data) ? walletRes.data : [];
    setCardData({
      card: cardRes?.card || null,
      recentEvents: Array.isArray(cardRes?.recentEvents) ? cardRes.recentEvents : [],
    });
    setWallets(walletList);
  }

  useEffect(() => {
    if (!userId) return;
    loadData().catch(() => {});
  }, [userId, token]);

  const fundingOptions = useMemo(
    () =>
      wallets
        .filter((w) => toNum(w.balance) > 0)
        .map((w) => ({ currency: String(w.currency || '').toUpperCase(), balance: toNum(w.balance) })),
    [wallets],
  );

  useEffect(() => {
    if (fundingOptions.length === 0) return;
    if (!fundingOptions.some((w) => w.currency === currency)) {
      setCurrency(fundingOptions[0].currency);
    }
  }, [fundingOptions, currency]);

  async function handleIssue() {
    if (!userId) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await issueVirtualCard(userId, token);
      setMessage('Virtual Visa card issued.');
      await loadData(userId, token);
    } catch (e) {
      setError(e?.message || 'Could not issue card.');
    } finally {
      setBusy(false);
    }
  }

  async function handleFund(e) {
    e.preventDefault();
    if (!userId) return;
    const amt = toNum(amount);
    if (!(amt > 0)) {
      setError('Enter an amount greater than 0.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fundCardFromCrypto(userId, { amount: amt, currency }, token);
      setMessage(`Funded ${formatAmt(res?.funding?.credited_usdt || 0, 4)} USDT from ${currency}.`);
      setAmount('');
      await loadData(userId, token);
    } catch (e) {
      setError(e?.message || 'Funding failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddApplePay() {
    if (!userId) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await addCardToApplePay(userId, token);
      const walletUrl = res?.applePay?.wallet_deeplink_url || 'shoebox://';
      if (isIosDevice()) {
        setMessage(cardData?.card?.apple_pay_provisioned ? 'Opening Apple Wallet...' : 'Card added. Opening Apple Wallet...');
        openAppleWallet(walletUrl);
      } else {
        setMessage('Card added in system. Open this on iPhone to add it to Apple Wallet.');
      }
      await loadData(userId, token);
    } catch (e) {
      setError(e?.message || 'Could not add card to Apple Pay.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  const card = cardData.card;
  return (
    <div className="page">
      <Link href="/dashboard" className="back-link">← Back to portfolio</Link>
      <h1 className="page-title">Card</h1>
      <p className="page-desc">Issue a Place to All virtual Visa card and fund it directly from your crypto wallets.</p>

      {!card && (
        <div className="card card-lg">
          <p style={{ marginTop: 0, color: 'var(--dash-muted)' }}>
            Create your virtual card, then add it to Apple Pay / Google Pay and pay anywhere Visa is accepted.
          </p>
          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}
          <button type="button" className="btn btn-primary" onClick={handleIssue} disabled={busy}>
            {busy ? 'Issuing…' : 'Issue my virtual card'}
          </button>
        </div>
      )}

      {card && (
        <>
          <div className="card card-lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--dash-muted)', fontSize: '0.8rem' }}>Virtual {card.card_network}</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '1.25rem', fontWeight: 700 }}>{card.card_masked}</p>
              </div>
              <span className="btn btn-ghost" style={{ pointerEvents: 'none', minHeight: 'auto', padding: '0.35rem 0.65rem' }}>
                {card.status}
              </span>
            </div>
            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="quote-box">
                <strong>{formatAmt(card.available_balance_usdt, 4)} USDT</strong>
                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>Card balance</div>
              </div>
              <div className="quote-box">
                <strong>{formatAmt(card.lifetime_funded_usdt, 4)} USDT</strong>
                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>Lifetime funded</div>
              </div>
            </div>
            <div className="action-row" style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={!card.apple_pay_enabled || busy}
                onClick={handleAddApplePay}
              >
                {card.apple_pay_provisioned ? (isIosDevice() ? 'Open Apple Wallet' : 'Apple Pay connected') : 'Add to Apple Pay'}
              </button>
              <button type="button" className="btn btn-ghost" disabled={!card.google_pay_enabled}>Add to Google Pay</button>
            </div>
            {card.apple_pay_provisioned && (
              <p className="form-hint" style={{ marginTop: '0.75rem' }}>
                Apple Pay status: connected
              </p>
            )}
          </div>

          <div className="card card-lg" style={{ marginTop: '1rem' }}>
            <h2 className="page-title" style={{ marginTop: 0, fontSize: '1.1rem' }}>Fund card from crypto</h2>
            {fundingOptions.length === 0 ? (
              <p style={{ color: 'var(--dash-muted)', marginBottom: 0 }}>
                No funded wallets yet. Buy or receive crypto first, then fund this card.
              </p>
            ) : (
              <form onSubmit={handleFund}>
                <div className="form-group">
                  <label className="form-label">Wallet currency</label>
                  <select className="form-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    {fundingOptions.map((w) => (
                      <option key={w.currency} value={w.currency}>
                        {w.currency} (balance: {formatAmt(w.balance, 8)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-input"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="form-hint">Non-USDT assets are auto-converted to USDT at current spot pricing.</p>
                </div>
                {error && <div className="alert alert-error">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Funding…' : 'Fund card'}
                </button>
              </form>
            )}
          </div>

          <div className="card card-lg" style={{ marginTop: '1rem' }}>
            <h2 className="page-title" style={{ marginTop: 0, fontSize: '1.1rem' }}>Recent card activity</h2>
            {cardData.recentEvents.length === 0 ? (
              <p style={{ color: 'var(--dash-muted)', marginBottom: 0 }}>No card events yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {cardData.recentEvents.slice(0, 8).map((ev) => (
                  <div key={ev.id} className="quote-box" style={{ marginTop: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                      <strong>{eventTitle(ev.event_type)}</strong>
                      <strong>{formatAmt(ev.amount_usdt, 6)} USDT</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--dash-muted)', marginTop: '0.25rem' }}>
                      {new Date(ev.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


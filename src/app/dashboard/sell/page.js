'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getWallets, sellCrypto, getCoinbaseSellQuote } from '@/lib/api';

export default function SellPage() {
  const [wallets, setWallets] = useState([]);
  const [walletId, setWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const router = useRouter();
  const selectedWallet = wallets.find((w) => w.id === walletId);

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
    getWallets(userId, token).then((data) => {
      const list = Array.isArray(data) ? data : data.data || [];
      setWallets(list.filter((w) => Number(w.balance) > 0));
      if (list.length && !walletId) setWalletId(list[0]?.id || '');
    }).catch(() => setWallets([]));
  }, [userId, token]);

  useEffect(() => {
    const num = Number(amount);
    if (num > 0 && selectedWallet) {
      getCoinbaseSellQuote(num, selectedWallet.currency, 'USD').then(setQuote).catch(() => setQuote(null));
    } else setQuote(null);
  }, [amount, selectedWallet?.id, selectedWallet?.currency]);

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
    <div className="page">
        <Link href="/dashboard" className="back-link">← Back to portfolio</Link>
        <h1 className="page-title">Sell crypto</h1>
        <p className="page-desc">
          Convert your crypto to fiat. Test environment: balance returns to treasury.
        </p>

        {quote && (
          <div className="quote-box" style={{ marginBottom: '1rem' }}>
            Live quote: {amount} {selectedWallet?.currency} ≈ <strong>{quote.estimated_fiat ?? quote.fiat_amount ?? '—'} USD</strong>
          </div>
        )}

        <div className="card card-lg">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Wallet</label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                required
                className="form-select"
              >
                <option value="">Select wallet</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.currency} – {Number(w.balance).toFixed(4)}</option>
                ))}
              </select>
            </div>
            {!wallets.length && (
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
                No wallets with balance. <Link href="/dashboard/buy">Buy</Link> first.
              </p>
            )}
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="form-input"
              />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button type="submit" disabled={loading || !wallets.length} className="btn btn-danger">
              {loading ? 'Selling…' : 'Sell'}
            </button>
          </form>
        </div>
    </div>
  );
}

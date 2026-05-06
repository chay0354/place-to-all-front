'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getWallets, transfer } from '@/lib/api';

export default function TransferPage() {
  const [wallets, setWallets] = useState([]);
  const [fromWalletId, setFromWalletId] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const router = useRouter();

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
        const sorted = [...list].sort((a, b) => String(a.currency).localeCompare(String(b.currency)));
        setWallets(sorted);
        setFromWalletId((prev) => {
          if (prev && sorted.some((w) => w.id === prev)) return prev;
          return sorted[0]?.id || '';
        });
      })
      .catch(() => {
        setWallets([]);
        setFromWalletId('');
      });
  }, [userId, token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!userId) return;
    if (!fromWalletId) {
      setError('Add a balance or pick an asset first.');
      return;
    }
    const emailTrim = toEmail.trim();
    if (!emailTrim) {
      setError('Enter the recipient’s email.');
      return;
    }
    setLoading(true);
    try {
      await transfer(
        userId,
        { fromWalletId, toEmail: emailTrim, amount: Number(amount) },
        token,
      );
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  }

  if (!userId) return null;

  const selectedWallet = wallets.find((w) => w.id === fromWalletId);

  return (
    <div className="page">
      <Link href="/dashboard" className="back-link">← Back to portfolio</Link>
      <h1 className="page-title">Transfer crypto</h1>

      <div className="card card-lg">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Recipient email</label>
            <input
              type="email"
              placeholder="their@email.com"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              required
              autoComplete="email"
              className="form-input"
            />
            <span className="form-hint">Must match the email on their Place to All account.</span>
          </div>
          <div className="form-group">
            <label className="form-label">Coin</label>
            {wallets.length === 0 ? (
              <p className="form-hint" style={{ margin: 0 }}>
                No wallets yet. Buy or receive crypto first, then transfer.
              </p>
            ) : (
              <select
                value={fromWalletId}
                onChange={(e) => setFromWalletId(e.target.value)}
                required
                className="form-select"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.currency} — balance {Number(w.balance).toFixed(4)}
                  </option>
                ))}
              </select>
            )}
            <span className="form-hint">Transfer sends this asset only; amount cannot exceed your balance.</span>
          </div>
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder={selectedWallet ? `0.00 ${selectedWallet.currency}` : '0.00'}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="form-input"
            />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" disabled={loading || !wallets.length} className="btn btn-primary">
            {loading ? 'Transferring…' : 'Transfer'}
          </button>
        </form>
      </div>
    </div>
  );
}

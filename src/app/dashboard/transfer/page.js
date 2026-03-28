'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getWallets, transfer } from '@/lib/api';

export default function TransferPage() {
  const [wallets, setWallets] = useState([]);
  const [fromWalletId, setFromWalletId] = useState('');
  const [toUsername, setToUsername] = useState('');
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
    getWallets(userId, token).then((data) => {
      const list = Array.isArray(data) ? data : data.data || [];
      setWallets(list);
      if (list.length && !fromWalletId) setFromWalletId(list[0].id);
    }).catch(() => setWallets([]));
  }, [userId, token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!userId) return;
    setLoading(true);
    try {
      await transfer(userId, { fromWalletId, toWalletId, amount: Number(amount) }, token);
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  }

  if (!userId) return null;

  return (
    <div className="page">
        <Link href="/dashboard" className="back-link">← Back to portfolio</Link>
        <h1 className="page-title">Transfer crypto</h1>
        <p className="page-desc">
          Send crypto to another user. Enter their profile username (same currency as the wallet you send from).
        </p>

        <div className="card card-lg">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">From wallet</label>
              <select
                value={fromWalletId}
                onChange={(e) => setFromWalletId(e.target.value)}
                required
                className="form-select"
              >
                <option value="">Select wallet</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.currency} – {Number(w.balance).toFixed(4)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Recipient username</label>
              <input
                type="text"
                placeholder="Their profile username"
                value={toUsername}
                onChange={(e) => setToUsername(e.target.value)}
                required
                autoComplete="off"
                className="form-input"
              />
              <span className="form-hint">The recipient must have a username on their profile. Matching ignores upper/lowercase.</span>
            </div>
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
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Transferring…' : 'Transfer'}
            </button>
          </form>
        </div>
    </div>
  );
}

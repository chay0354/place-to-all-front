'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getWallets, transfer } from '@/lib/api';

function maskEmail(email) {
  const e = String(email || '').trim();
  const [local, domain] = e.split('@');
  if (!domain) return e;
  const shown = local.length <= 2 ? local : `${local.slice(0, 2)}…`;
  return `${shown}@${domain}`;
}

export default function TransferPage() {
  const [wallets, setWallets] = useState([]);
  const [fromWalletId, setFromWalletId] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      if (user.email) setAccountEmail(user.email);
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

  function resetOtpStep() {
    setOtpSent(false);
    setOtp('');
  }

  function validateTransferFields() {
    if (!fromWalletId) {
      setError('Add a balance or pick an asset first.');
      return false;
    }
    const emailTrim = toEmail.trim();
    if (!emailTrim) {
      setError('Enter the recipient’s email.');
      return false;
    }
    const n = Number(amount);
    if (!amount.trim() || Number.isNaN(n) || n <= 0) {
      setError('Enter a valid amount greater than zero.');
      return false;
    }
    return true;
  }

  /** Email OTP (no magic-link redirect). Template must include {{ .Token }} in Supabase. */
  async function sendVerificationCode() {
    setError('');
    if (!validateTransferFields()) return;
    if (!accountEmail) {
      setError('Your account has no email address; add one in Supabase or contact support.');
      return;
    }

    setSendingCode(true);
    try {
      const supabase = createClient();
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: accountEmail,
        options: { shouldCreateUser: false },
      });
      if (otpErr) throw otpErr;
      setOtpSent(true);
      setOtp('');
    } catch (err) {
      setError(err?.message || 'Could not send verification email. Try again in a minute.');
    } finally {
      setSendingCode(false);
    }
  }

  async function verifyAndTransfer(e) {
    e.preventDefault();
    setError('');
    if (!validateTransferFields()) return;
    const code = otp.replace(/\s/g, '').trim();
    if (!otpSent || code.length < 6) {
      setError('Enter the verification code from your email.');
      return;
    }
    if (!accountEmail) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: vErr } = await supabase.auth.verifyOtp({
        email: accountEmail,
        token: code,
        type: 'email',
      });
      if (vErr) throw vErr;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token || token;

      await transfer(
        userId,
        { fromWalletId, toEmail: toEmail.trim(), amount: Number(amount) },
        accessToken,
      );
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err?.message || 'Verification or transfer failed.');
    } finally {
      setLoading(false);
    }
  }

  if (!userId) return null;

  const selectedWallet = wallets.find((w) => w.id === fromWalletId);

  return (
    <div className="page">
      <Link href="/dashboard" className="back-link">
        ← Back to portfolio
      </Link>
      <h1 className="page-title">Transfer crypto</h1>

      <div className="card card-lg">
        <form onSubmit={otpSent ? verifyAndTransfer : (e) => e.preventDefault()} className="transfer-form">
          <div className="form-group">
            <label className="form-label">Recipient email</label>
            <input
              type="email"
              placeholder="their@email.com"
              value={toEmail}
              onChange={(e) => {
                setToEmail(e.target.value);
                resetOtpStep();
              }}
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
                onChange={(e) => {
                  setFromWalletId(e.target.value);
                  resetOtpStep();
                }}
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
              onChange={(e) => {
                setAmount(e.target.value);
                resetOtpStep();
              }}
              required
              className="form-input"
            />
          </div>

          {otpSent && (
            <div className="form-group">
              <div className="alert alert-info" style={{ marginBottom: '0.75rem' }} role="status">
                Enter the code sent to <strong>{maskEmail(accountEmail)}</strong> (check spam). Use the digits from the
                email, not a link.
              </div>
              <label className="form-label" htmlFor="transfer-otp">
                Verification code
              </label>
              <input
                id="transfer-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6–8 digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, '').slice(0, 8))}
                className="form-input"
                aria-label="Email verification code"
              />
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {!otpSent ? (
            <button
              type="button"
              disabled={sendingCode || !wallets.length}
              className="btn btn-primary"
              onClick={sendVerificationCode}
            >
              {sendingCode ? 'Sending…' : 'Send verification code'}
            </button>
          ) : (
            <div className="transfer-verify-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button type="submit" disabled={loading || !wallets.length} className="btn btn-primary">
                {loading ? 'Transferring…' : 'Verify & transfer'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={sendingCode}
                onClick={() => sendVerificationCode()}
              >
                {sendingCode ? 'Sending…' : 'Resend code'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

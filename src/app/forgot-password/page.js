'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useQueryParam } from '@/lib/use-query-param';
import { AuthScreen } from '@/components/AuthScreen';
import '../register/register.css';

export default function ForgotPasswordPage() {
  const nextPath = useQueryParam('next') || '';
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const next = nextPath.startsWith('/') ? nextPath : '/dashboard';
      const redirectTo = `${window.location.origin}/reset-password?next=${encodeURIComponent(next)}`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      const msg = err?.message || 'Could not send the reset email.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login';

  return (
    <AuthScreen
      kicker="Account"
      title="Reset your password."
      lede="We’ll email you a link to choose a new one."
    >
      <main className="auth-panel">
        <h2 className="auth-panel-title">Forgot password</h2>
        <p className="auth-panel-sub">
          {sent ? 'Check your inbox for the reset link.' : 'Enter the email on your account.'}
        </p>
        {sent ? (
          <div className="alert alert-success">
            If an account exists for {email.trim().toLowerCase()}, a reset link is on its way. The link expires after a
            short time.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="form-input"
              />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button type="submit" disabled={loading} className="btn btn-primary auth-submit">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <p className="auth-footer">
          <Link href={loginHref}>Back to log in</Link>
        </p>
      </main>
    </AuthScreen>
  );
}

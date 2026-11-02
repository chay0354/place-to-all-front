'use client';

import { useState } from 'react';

/** Maps Supabase Auth errors (often HTTP 400 on /token) to actionable copy. */
function formatLoginError(err) {
  const raw = (err && (err.message || err.error_description)) || '';
  const lower = String(raw).toLowerCase();
  const code = err && (err.code || err.name);
  if (
    lower.includes('email not confirmed') ||
    code === 'email_not_confirmed'
  ) {
    return (
      'This email is not confirmed. After signing up, registration must call your backend POST /api/auth/confirm-email ' +
      '(with the backend running), or in Supabase Dashboard → Authentication → Users, confirm the user manually. ' +
      'Alternatively turn off “Confirm email” under Authentication → Providers → Email.'
    );
  }
  if (
    lower.includes('invalid login') ||
    lower.includes('invalid credentials') ||
    code === 'invalid_credentials'
  ) {
    return 'Invalid email or password. Check spelling and caps lock, or reset your password in Supabase if needed.';
  }
  return raw || 'Login failed. Check your email and password.';
}
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { clearPinUnlocked } from '@/lib/quick-pin-session';
import { useQueryParam } from '@/lib/use-query-param';
import appIcon from '../icon.png';
import './login.css';

function LoginPageContent() {
  const nextPath = useQueryParam('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const emailNorm = (email || '').trim().toLowerCase();
    if (!emailNorm) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: emailNorm,
        password,
      });
      if (err) throw err;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) clearPinUnlocked(user.id);
      const dest = nextPath && nextPath.startsWith('/') ? nextPath : '/dashboard';
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(formatLoginError(err));
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;
  const forgotHref = nextPath ? `/forgot-password?next=${encodeURIComponent(nextPath)}` : '/forgot-password';
  const registerHref = nextPath ? `/register?next=${encodeURIComponent(nextPath)}` : '/register';

  return (
    <div className="login-screen">
      <section className="login-stage" aria-label="Place to All">
        <div className="login-stage-bg" aria-hidden />
        <div className="login-stage-inner">
          <Link href="/" className="login-brand" aria-label="Place to All home">
            <img src={appIcon.src} alt="" width={48} height={48} draggable={false} />
            <span>
              Place to <em>All</em>
            </span>
          </Link>
          <p className="login-kicker">Wallet</p>
          <h1>Your money, one place.</h1>
          <p className="login-lede">Sign in to buy, send, and manage everything in your wallet.</p>
          <ul className="login-points">
            <li>Live USD rates</li>
            <li>Cards and transfers</li>
            <li>Agent earnings</li>
          </ul>
        </div>
      </section>
      <main className="login-panel">
        <h2>Log in</h2>
        <p className="login-panel-sub">Welcome back. Use the email on your account.</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-field-label" htmlFor="login-email">
              Email<span className="login-req">*</span>
            </label>
            <div className="login-control">
              <span className="login-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
              </span>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>
          <div className="login-field">
            <label className="login-field-label" htmlFor="login-password">
              Password<span className="login-req">*</span>
            </label>
            <div className="login-control">
              <span className="login-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-eye"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.8 10.8 0 0 1 12 5c5 0 9.3 3.1 11 7a11.8 11.8 0 0 1-2.6 3.7M6.1 6.1C4.2 7.4 2.7 9.1 1 12c1.7 3.9 6 7 11 7 1.6 0 3.1-.3 4.5-.9" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <Link href={forgotHref} className="login-forgot">
            Forgot your password?
          </Link>
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" className="login-submit" disabled={!canSubmit}>
            {loading ? 'Signing in…' : 'Log in'}
          </button>
          <p className="login-alt">
            No account?
            <Link href={registerHref}>Create account</Link>
          </p>
        </form>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}

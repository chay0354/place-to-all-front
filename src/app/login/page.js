'use client';

import { Suspense, useState } from 'react';

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
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { clearPinUnlocked } from '@/lib/quick-pin-session';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="app-dark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem' }}>
      <main className="auth-card" style={{ width: '100%', maxWidth: 400 }}>
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-sub">Sign in to your account to continue</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="form-input"
          />
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="auth-footer">
        Don&apos;t have an account?{' '}
        <Link href={nextPath ? `/register?next=${encodeURIComponent(nextPath)}` : '/register'}>Create account</Link>
      </p>
      </main>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="app-dark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem' }}>
      <p className="auth-sub">Loading…</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

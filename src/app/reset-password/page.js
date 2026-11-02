'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { clearPinUnlocked } from '@/lib/quick-pin-session';
import { useQueryParam } from '@/lib/use-query-param';
import { AuthScreen } from '@/components/AuthScreen';
import '../register/register.css';

export default function ResetPasswordPage() {
  const nextPath = useQueryParam('next') || '';
  const router = useRouter();
  const [phase, setPhase] = useState('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let recovered = false;
    const supabase = createClient();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY') {
        recovered = true;
        setPhase('ready');
      }
    });

    async function boot() {
      const params = new URLSearchParams(window.location.search);
      const linkError = params.get('error_description') || params.get('error');
      if (linkError) {
        setPhase('invalid');
        return;
      }
      const code = params.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeError) {
          setPhase('invalid');
          return;
        }
        const next = params.get('next');
        const clean = next ? `/reset-password?next=${encodeURIComponent(next)}` : '/reset-password';
        window.history.replaceState({}, '', clean);
        recovered = true;
        setPhase('ready');
        return;
      }
      window.setTimeout(() => {
        if (!cancelled && !recovered) setPhase('invalid');
      }, 800);
    }

    boot();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords don’t match.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) clearPinUnlocked(user.id);
      const dest = nextPath.startsWith('/') ? nextPath : '/dashboard';
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err?.message || 'Could not update the password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen kicker="Account" title="Choose a new password." lede="Use it the next time you sign in.">
      <main className="auth-panel">
        <h2 className="auth-panel-title">New password</h2>
        {phase === 'checking' && <p className="auth-panel-sub">Confirming your reset link…</p>}
        {phase === 'invalid' && (
          <>
            <p className="auth-panel-sub">This reset link is invalid or has expired.</p>
            <p className="auth-footer">
              <Link href="/forgot-password">Request a new link</Link>
            </p>
          </>
        )}
        {phase === 'ready' && (
          <>
            <p className="auth-panel-sub">At least 6 characters.</p>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label" htmlFor="reset-password">
                  New password
                </label>
                <div className="auth-password">
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="auth-eye"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-confirm">
                  Confirm password
                </label>
                <input
                  id="reset-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="form-input"
                />
              </div>
              {error && <div className="alert alert-error">{error}</div>}
              <button type="submit" disabled={loading} className="btn btn-primary auth-submit">
                {loading ? 'Saving…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </main>
    </AuthScreen>
  );
}

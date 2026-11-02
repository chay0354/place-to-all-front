'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toRelayUrl } from '@/lib/relay-url';
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY_CODE } from '@/lib/countries';
import { countryFlagUrl } from '@/lib/phone-country';
import { useQueryParam } from '@/lib/use-query-param';
import { AuthScreen } from '@/components/AuthScreen';
import './register.css';

function RegisterPageContent() {
  const refParam = useQueryParam('ref') || '';
  const nextPath = useQueryParam('next') || '';
  const typeParam = useQueryParam('type') || '';
  const hasRefParam = Boolean(refParam.trim());

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState(() => (typeParam === 'agent' ? 'agent' : 'regular'));
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [recruiterRole, setRecruiterRole] = useState(null);
  const [refStatus, setRefStatus] = useState('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const ref = refParam.trim();
    if (!ref) {
      setRecruiterRole(null);
      setRefStatus('idle');
      return;
    }
    setRefStatus('checking');
    fetch(toRelayUrl(`/api/auth/referral-preview?ref=${encodeURIComponent(ref)}`), { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setRecruiterRole(d.valid ? d.recruiterRole : null);
        setRefStatus(d.valid ? 'valid' : 'invalid');
      })
      .catch(() => {
        setRecruiterRole(null);
        setRefStatus('invalid');
      });
  }, [refParam]);

  const isFromAffiliateLink = hasRefParam && refStatus === 'valid';
  const inviteBroken = hasRefParam && refStatus === 'invalid';

  useEffect(() => {
    if (isFromAffiliateLink) return;
    if (typeParam === 'agent') setUserType('agent');
  }, [typeParam, isFromAffiliateLink]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const trimmedEmail = (email || '').trim().toLowerCase();
    const pwd = password || '';
    if (!trimmedEmail) {
      setError('Please enter an email address.');
      return;
    }
    if (pwd.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (hasRefParam && refStatus === 'checking') {
      setError('Still checking your invite link — try again in a second.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({ email: trimmedEmail, password: pwd });
      if (err) {
        const msg = err.message || err.error_description || err.msg || err.status;
        throw new Error(typeof msg === 'string' ? msg : 'Sign up failed. Try a different email or password.');
      }
      if (data?.user?.id) {
        const confirmBody = { userId: data.user.id, countryCode };
        if (isFromAffiliateLink) {
          confirmBody.referredBy = refParam.trim();
        } else {
          confirmBody.role = userType;
        }
        const confirmRes = await fetch(toRelayUrl('/api/auth/confirm-email'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(confirmBody),
          credentials: 'include',
        });
        const confirmData = await confirmRes.json().catch(() => ({}));
        if (!confirmRes.ok) {
          throw new Error(confirmData.error || 'Could not complete registration.');
        }
      }
      const dest = nextPath && nextPath.startsWith('/') ? nextPath : '/dashboard';
      router.push(dest);
      router.refresh();
    } catch (err) {
      const msg = err.message || 'Registration failed';
      setError(msg);
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        setError(`${msg} Try logging in instead.`);
      }
    } finally {
      setLoading(false);
    }
  }

  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login';
  const forgotHref = nextPath ? `/forgot-password?next=${encodeURIComponent(nextPath)}` : '/forgot-password';
  const subtitle =
    hasRefParam && refStatus === 'checking'
      ? 'Checking invite link…'
      : isFromAffiliateLink
        ? 'This invite sets your account type. You can’t change it here.'
        : 'A few details, then you’re in.';

  return (
    <AuthScreen
      kicker="Create account"
      title="Your money, one place."
      lede="Buy, send, and hold crypto from a single wallet."
      showPoints
    >
      <main className="auth-panel">
        <h2 className="auth-panel-title">Create account</h2>
        <p className="auth-panel-sub">{subtitle}</p>
        {inviteBroken && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            This invite link is invalid or expired, so no one will be credited for your signup. You can still create a
            regular account below.
          </div>
        )}
        {isFromAffiliateLink && (
          <p className="auth-note">
            {recruiterRole === 'super_super_agent'
              ? 'You were invited by a super super agent. You will join as a super agent under them (account type is set by this link — you cannot choose). They earn network fees including an extra tier when the commission rules apply (fees are paid by the buyer).'
              : recruiterRole === 'super_agent'
                ? 'You were invited by a super agent. You will join as an agent under them (account type is set by this link — you cannot choose). They earn an extra 4% on qualifying buys you and your referrals make (fees are paid by the buyer).'
                : 'You were referred by an agent. You will join as a regular user (account type is set by this link — you cannot choose). They earn 4% on your crypto buys (along with other tiers and admin; fees come from your purchase).'}
          </p>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
          {!isFromAffiliateLink && !(hasRefParam && refStatus === 'checking') && (
            <div className="form-group">
              <span className="form-label" id="reg-type-label">
                Account type
              </span>
              <div className="auth-types" role="radiogroup" aria-labelledby="reg-type-label">
                <button
                  type="button"
                  role="radio"
                  aria-checked={userType === 'regular'}
                  className={userType === 'regular' ? 'auth-type is-selected' : 'auth-type'}
                  onClick={() => setUserType('regular')}
                >
                  <span className="auth-type-name">Regular</span>
                  <span className="auth-type-desc">Buy, send, and create payment links.</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={userType === 'agent'}
                  className={userType === 'agent' ? 'auth-type is-selected' : 'auth-type'}
                  onClick={() => setUserType('agent')}
                >
                  <span className="auth-type-name">Agent</span>
                  <span className="auth-type-desc">Referral link and 4% on referred buys.</span>
                </button>
              </div>
              <p className="auth-type-hint">
                {userType === 'agent'
                  ? 'Super agent isn’t a signup option. Register as an agent, then an admin can promote you.'
                  : 'Payers can use your payment links without creating an account.'}
              </p>
            </div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-country">
              Country
            </label>
            <div className="auth-country-row">
              {countryFlagUrl(countryCode, 40) && (
                <img src={countryFlagUrl(countryCode, 40)} alt="" className="auth-country-flag" aria-hidden />
              )}
              <select
                id="reg-country"
                className="form-select auth-country-select"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                required
                autoComplete="country"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <div className="auth-label-row">
              <label className="form-label" htmlFor="reg-password">
                Password
              </label>
              <Link href={forgotHref} className="auth-forgot">
                Forgot password?
              </Link>
            </div>
            <div className="auth-password">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
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
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.8 10.8 0 0 1 12 5c5 0 9.3 3.1 11 7-0.6 1.4-1.5 2.7-2.6 3.7M6.1 6.1C4.2 7.4 2.7 9.1 1 12c1.7 3.9 6 7 11 7 1.6 0 3.1-.3 4.5-.9" />
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
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" disabled={loading} className="btn btn-primary auth-submit">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        {!isFromAffiliateLink && (
          <p className="auth-footer">
            Already have an account? <Link href={loginHref}>Log in</Link>
          </p>
        )}
      </main>
    </AuthScreen>
  );
}

export default function RegisterPage() {
  return <RegisterPageContent />;
}

'use client';

import { Suspense, useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { joinBackendUrl } from '@/lib/api-base';

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const refParam = useMemo(() => searchParams.get('ref') || '', [searchParams]);
  const nextPath = useMemo(() => searchParams.get('next') || '', [searchParams]);
  const isFromAffiliateLink = Boolean(refParam.trim());

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('regular');
  const [recruiterRole, setRecruiterRole] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const ref = refParam.trim();
    if (!ref) {
      setRecruiterRole(null);
      return;
    }
    fetch(joinBackendUrl(`/api/auth/referral-preview?ref=${encodeURIComponent(ref)}`))
      .then((r) => r.json())
      .then((d) => setRecruiterRole(d.valid ? d.recruiterRole : null))
      .catch(() => setRecruiterRole(null));
  }, [refParam]);

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
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({ email: trimmedEmail, password: pwd });
      if (err) {
        const msg = err.message || err.error_description || err.msg || err.status;
        throw new Error(typeof msg === 'string' ? msg : 'Sign up failed. Try a different email or password.');
      }
      if (data?.user?.id) {
        const confirmBody = { userId: data.user.id };
        if (isFromAffiliateLink) {
          confirmBody.referredBy = refParam.trim();
        } else {
          confirmBody.role = userType;
        }
        const confirmRes = await fetch(joinBackendUrl('/api/auth/confirm-email'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(confirmBody),
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

  return (
    <div className="app-dark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem' }}>
      <main className="auth-card" style={{ width: '100%', maxWidth: 400 }}>
      <h1 className="auth-title">Create account</h1>
      <p className="auth-sub">
        {isFromAffiliateLink
          ? recruiterRole === 'super_super_agent'
            ? 'You were invited by a super super agent. You will join as a super agent under them (account type is set by this link — you cannot choose). They earn network fees including an extra tier when the commission rules apply (fees are paid by the buyer).'
            : recruiterRole === 'super_agent'
            ? 'You were invited by a super agent. You will join as an agent under them (account type is set by this link — you cannot choose). They earn an extra 4% on qualifying buys you and your referrals make (fees are paid by the buyer).'
            : recruiterRole === 'agent'
              ? 'You were referred by an agent. You will join as a regular user (account type is set by this link — you cannot choose). They earn 4% on your crypto buys (along with other tiers and admin; fees come from your purchase).'
              : 'Checking invite link…'
          : 'Get started with your crypto wallet'}
      </p>
      {!isFromAffiliateLink && (
        <div className="form-group">
          <label className="form-label">Account type</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.35rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="userType"
                value="regular"
                checked={userType === 'regular'}
                onChange={() => setUserType('regular')}
              />
              <span>Regular user</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="userType"
                value="agent"
                checked={userType === 'agent'}
                onChange={() => setUserType('agent')}
              />
              <span>Agent</span>
            </label>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--dash-muted)', marginTop: '0.35rem' }}>
            Regular accounts can create <strong>payment links</strong> from Account (payers don’t need an account). Agents also get a referral link for regular signups and earn 4% on those users’ buys (plus upline tiers when applicable). <strong>Super agent</strong> is not a signup option — register as an agent first; an app admin promotes you from the admin menu.
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="form-input"
          />
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      {!isFromAffiliateLink && (
        <p className="auth-footer">
          Already have an account?{' '}
          <Link href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'}>Log in</Link>
        </p>
      )}
      </main>
    </div>
  );
}

function RegisterFallback() {
  return (
    <div className="app-dark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem' }}>
      <p className="auth-sub">Loading…</p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterPageContent />
    </Suspense>
  );
}

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

function CountryField({ id, countryCode, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        Country
      </label>
      <div className="auth-country-row">
        {countryFlagUrl(countryCode, 40) && (
          <img src={countryFlagUrl(countryCode, 40)} alt="" className="auth-country-flag" aria-hidden />
        )}
        <select
          id={id}
          className="form-select auth-country-select"
          value={countryCode}
          onChange={(e) => onChange(e.target.value)}
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
  );
}

function RegisterPageContent() {
  const refParam = useQueryParam('ref') || '';
  const nextPath = useQueryParam('next') || '';
  const typeParam = useQueryParam('type') || '';
  const hasRefParam = Boolean(refParam.trim());

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyNumber, setCompanyNumber] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [pendingAgent, setPendingAgent] = useState(null);
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
  const agentInvite =
    isFromAffiliateLink && (recruiterRole === 'super_agent' || recruiterRole === 'super_super_agent');
  const isAgentApplication = agentInvite || (!isFromAffiliateLink && userType === 'agent');

  useEffect(() => {
    if (isFromAffiliateLink) return;
    if (typeParam === 'agent') setUserType('agent');
  }, [typeParam, isFromAffiliateLink]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (hasRefParam && refStatus === 'checking') {
      setError('Still checking your invite link — try again in a second.');
      return;
    }
    if (isAgentApplication) {
      if (!agreed) {
        setError('A company agreement and our approval are required before an account is opened.');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(toRelayUrl('/api/auth/agent-application'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            companyName,
            companyNumber,
            countryCode,
            address: companyAddress,
            city: companyCity,
            contactName,
            phone: contactPhone,
            email: contactEmail,
            agreed: true,
            referredBy: agentInvite ? refParam.trim() : '',
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not submit the request.');
        setPendingAgent({
          companyName: data.companyName || companyName.trim(),
          email: data.email || contactEmail.trim().toLowerCase(),
          emailed: Boolean(data.emailed),
        });
      } catch (err) {
        setError(err.message || 'Could not submit the request.');
      } finally {
        setLoading(false);
      }
      return;
    }
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
    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter your first and last name.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 7) {
      setError('Enter a valid phone number.');
      return;
    }
    if (!dateOfBirth) {
      setError('Enter your date of birth.');
      return;
    }
    const born = new Date(`${dateOfBirth}T00:00:00`);
    const adult = new Date();
    adult.setFullYear(adult.getFullYear() - 18);
    if (Number.isNaN(born.getTime()) || born > adult) {
      setError('You must be at least 18.');
      return;
    }
    if (idNumber.trim().length < 5) {
      setError('Enter your ID or passport number.');
      return;
    }
    if (city.trim().length < 2 || address.trim().length < 4) {
      setError('Enter your city and street address.');
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
        const confirmBody = {
          userId: data.user.id,
          countryCode,
          profile: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            dateOfBirth,
            idNumber: idNumber.trim(),
            city: city.trim(),
            address: address.trim(),
          },
        };
        if (isFromAffiliateLink) {
          confirmBody.referredBy = refParam.trim();
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
  const subtitle = pendingAgent
    ? 'Nothing is opened until we approve it.'
    : hasRefParam && refStatus === 'checking'
      ? 'Checking invite link…'
      : isAgentApplication
        ? 'Limited companies only. We review the details before an account exists.'
        : isFromAffiliateLink
          ? 'This invite sets your account type. You can’t change it here.'
          : 'We need a few identity details before the account is opened.';

  return (
    <AuthScreen
      kicker="Create account"
      title="Your money, one place."
      lede="Buy, send, and hold crypto from a single wallet."
      showPoints
    >
      <main className="auth-panel">
        <h2 className="auth-panel-title">{pendingAgent ? 'Request pending' : isAgentApplication ? 'Apply as an agent' : 'Create account'}</h2>
        <p className="auth-panel-sub">{subtitle}</p>
        {pendingAgent ? (
          <div className="auth-pending">
            <p>
              Your request for <strong>{pendingAgent.companyName}</strong> is pending.
            </p>
            <p>
              This does not create an account. An agent account is opened only after we approve the request and a
              company agreement is in place.
              {pendingAgent.emailed
                ? ` We emailed the company details for approval and will contact ${pendingAgent.email}.`
                : ` The company details are saved for review. We’ll contact ${pendingAgent.email}.`}
            </p>
          </div>
        ) : (
          <>
        {inviteBroken && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            This invite link is invalid or expired, so no one will be credited for your signup. You can still create a
            regular account below.
          </div>
        )}
        {isFromAffiliateLink && !agentInvite && (
          <p className="auth-note">
            You were referred by an agent. You will join as a regular user (account type is set by this link — you
            cannot choose). They earn 4% on your crypto buys (along with other tiers and admin; fees come from your
            purchase).
          </p>
        )}
        {agentInvite && (
          <p className="auth-note">
            This invite is for an agent account. Send your limited-company details. The request stays pending until we
            approve it and a company agreement is signed. No account is opened now.
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
                  <span className="auth-type-desc">Personal wallet. Identity details required.</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={userType === 'agent'}
                  className={userType === 'agent' ? 'auth-type is-selected' : 'auth-type'}
                  onClick={() => setUserType('agent')}
                >
                  <span className="auth-type-name">Agent</span>
                  <span className="auth-type-desc">Limited company. Approval required.</span>
                </button>
              </div>
              <p className="auth-type-hint">
                {userType === 'agent'
                  ? 'An agent is a limited company. We email the details for approval. You are not registered until we approve the request and a company agreement is in place.'
                  : 'Payers can use your payment links without creating an account.'}
              </p>
            </div>
          )}
          {isAgentApplication ? (
            <>
              <div className="auth-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-company">
                    Company legal name
                  </label>
                  <input id="reg-company" className="form-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required autoComplete="organization" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-company-no">
                    Company number
                  </label>
                  <input id="reg-company-no" className="form-input" value={companyNumber} onChange={(e) => setCompanyNumber(e.target.value)} required placeholder="Registration number" />
                </div>
              </div>
              <CountryField id="reg-country" countryCode={countryCode} onChange={setCountryCode} />
              <div className="form-group">
                <label className="form-label" htmlFor="reg-co-address">
                  Registered address
                </label>
                <input id="reg-co-address" className="form-input" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} required autoComplete="street-address" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-co-city">
                  City
                </label>
                <input id="reg-co-city" className="form-input" value={companyCity} onChange={(e) => setCompanyCity(e.target.value)} required autoComplete="address-level2" />
              </div>
              <div className="auth-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-contact">
                    Contact person
                  </label>
                  <input id="reg-contact" className="form-input" value={contactName} onChange={(e) => setContactName(e.target.value)} required autoComplete="name" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-contact-phone">
                    Phone
                  </label>
                  <input id="reg-contact-phone" className="form-input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required autoComplete="tel" inputMode="tel" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-contact-email">
                  Contact email
                </label>
                <input id="reg-contact-email" type="email" className="form-input" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required autoComplete="email" placeholder="company@example.com" />
              </div>
              <label className="auth-agree">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
                <span>I understand this does not open an account. A company agreement and approval from Place to All are required.</span>
              </label>
            </>
          ) : (
            <>
              <div className="auth-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-first">
                    First name
                  </label>
                  <input id="reg-first" className="form-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoComplete="given-name" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-last">
                    Last name
                  </label>
                  <input id="reg-last" className="form-input" value={lastName} onChange={(e) => setLastName(e.target.value)} required autoComplete="family-name" />
                </div>
              </div>
              <div className="auth-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-phone">
                    Phone
                  </label>
                  <input id="reg-phone" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" inputMode="tel" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-dob">
                    Date of birth
                  </label>
                  <input id="reg-dob" type="date" className="form-input" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required autoComplete="bday" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-id">
                  ID or passport number
                </label>
                <input id="reg-id" className="form-input" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required autoComplete="off" />
              </div>
              <CountryField id="reg-country" countryCode={countryCode} onChange={setCountryCode} />
              <div className="auth-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-city">
                    City
                  </label>
                  <input id="reg-city" className="form-input" value={city} onChange={(e) => setCity(e.target.value)} required autoComplete="address-level2" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-address">
                    Street address
                  </label>
                  <input id="reg-address" className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} required autoComplete="street-address" />
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
            </>
          )}
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" disabled={loading} className="btn btn-primary auth-submit">
            {loading ? 'Sending…' : isAgentApplication ? 'Submit request' : 'Create account'}
          </button>
        </form>
        {!isFromAffiliateLink && (
          <p className="auth-footer">
            Already have an account? <Link href={loginHref}>Log in</Link>
          </p>
        )}
          </>
        )}
      </main>
    </AuthScreen>
  );
}

export default function RegisterPage() {
  return <RegisterPageContent />;
}

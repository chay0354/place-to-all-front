'use client';

import { useMemo, useState } from 'react';
import { clearQuickPin, hasQuickPin, setQuickPin } from '@/lib/quick-pin';
import { clearPinUnlocked } from '@/lib/quick-pin-session';
import {
  maskPhone,
  removeVerifiedPhone,
  sendPhoneVerificationCode,
  verifyPhoneCode,
} from '@/lib/phone-verification';

function securityStatus(profile, email, phone, quickPinEnabled) {
  const hasId = Boolean(profile?.id_document_path && profile?.id_document_back_path);
  const hasEmail = Boolean(email);
  const hasPhone = Boolean(phone);

  if ((quickPinEnabled && hasEmail) || (hasId && hasEmail)) {
    return {
      level: 'High',
      levelClass: 'high',
      description: quickPinEnabled
        ? 'Your account is protected with a passkey and email authentication.'
        : 'Your account is protected with identity verification and email authentication.',
    };
  }
  if (hasEmail || hasPhone || quickPinEnabled) {
    return {
      level: 'Medium',
      levelClass: 'medium',
      description: quickPinEnabled
        ? 'Add identity verification to strengthen your account security.'
        : 'Add a passkey or identity verification to strengthen your account security.',
    };
  }
  return {
    level: 'Low',
    levelClass: 'low',
    description: 'Complete verification to protect your account.',
  };
}

function formatPinDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return null;
  }
}

function SecuritySheet({ title, onClose, children, footer }) {
  return (
    <div className="idv-overlay" role="dialog" aria-modal="true" aria-labelledby="security-sheet-title">
      <button type="button" className="idv-backdrop" aria-label="Close" onClick={onClose} />
      <div className="idv-panel account-security-sheet">
        <header className="idv-header">
          <h2 id="security-sheet-title" className="idv-title">
            {title}
          </h2>
          <button type="button" className="idv-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="account-security-sheet-body">{children}</div>
        {footer ?? (
          <button type="button" className="account-security-sheet-done" onClick={onClose}>
            Done
          </button>
        )}
      </div>
    </div>
  );
}

function SecurityRow({ icon, label, enabled, trailing, onClick }) {
  return (
    <button type="button" className="account-security-row" onClick={onClick}>
      <span className="account-security-row-icon" aria-hidden>
        {icon}
      </span>
      <span className="account-security-row-label">{label}</span>
      <span className="account-security-row-trailing">
        {trailing && <span className="account-security-row-status">{trailing}</span>}
        {enabled && (
          <span className="account-security-check" aria-label="Enabled">
            <CheckIcon />
          </span>
        )}
        <ChevronRightIcon />
      </span>
    </button>
  );
}

function PinField({ id, label, value, onChange, autoComplete }) {
  return (
    <div className="account-security-pin-field">
      <label className="account-security-pin-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="account-security-pin-input"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="••••••"
      />
    </div>
  );
}

function PhoneVerificationSheet({ phone, onClose, onVerified }) {
  const [step, setStep] = useState(() => (phone ? 'verified' : 'phone'));
  const displayPhone = phone || '';
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneInput, setPhoneInput] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingPhone, setPendingPhone] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState(phone || '');

  async function handleSendCode() {
    setError('');
    setSuccess('');
    setSending(true);
    try {
      const result = await sendPhoneVerificationCode({ phone: phoneInput, countryCode });
      setPendingPhone(result.phone || phoneInput);
      setStep('code');
      setSuccess('Verification code sent.');
      setCode('');
    } catch (err) {
      setError(err?.message || 'Could not send code.');
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    setError('');
    setSuccess('');
    if (!code.trim()) {
      setError('Enter the code from your SMS.');
      return;
    }
    setVerifying(true);
    try {
      const result = await verifyPhoneCode({
        phone: pendingPhone || phoneInput,
        code,
        countryCode,
      });
      setVerifiedPhone(result.phone);
      setSuccess('Phone number verified.');
      onVerified?.(result.phone);
      setStep('verified');
    } catch (err) {
      setError(err?.message || 'Could not verify code.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleRemove() {
    setError('');
    setSuccess('');
    setRemoving(true);
    try {
      await removeVerifiedPhone();
      setVerifiedPhone('');
      setSuccess('Phone number removed.');
      onVerified?.(null);
      setStep('phone');
      setPhoneInput('');
      setCode('');
      setPendingPhone('');
    } catch (err) {
      setError(err?.message || 'Could not remove phone.');
    } finally {
      setRemoving(false);
    }
  }

  function startChange() {
    setStep('phone');
    setPhoneInput('');
    setCode('');
    setPendingPhone('');
    setError('');
    setSuccess('');
  }

  return (
    <SecuritySheet
      title="Phone number"
      onClose={onClose}
      footer={
        <button type="button" className="account-security-sheet-done" onClick={onClose}>
          Done
        </button>
      }
    >
      <p className="account-security-sheet-lead">
        Verify your mobile number with a one-time SMS code for account recovery and security alerts.
      </p>

      {step === 'verified' && (displayPhone || verifiedPhone) && (
        <>
          <p className="account-security-sheet-text">
            Verified: <strong>{maskPhone(displayPhone || verifiedPhone)}</strong>
          </p>
          {success && <p className="account-security-sheet-success">{success}</p>}
          {error && <p className="account-security-sheet-error">{error}</p>}
          <button type="button" className="account-security-passkey-add" onClick={startChange}>
            Change number
          </button>
          <button
            type="button"
            className="account-security-pin-remove"
            disabled={removing}
            onClick={handleRemove}
          >
            {removing ? 'Removing…' : 'Remove number'}
          </button>
        </>
      )}

      {step === 'phone' && (
        <>
          <div className="account-security-phone-row">
            <label className="account-security-pin-label" htmlFor="phone-country-code">
              Country
            </label>
            <label className="account-security-pin-label" htmlFor="phone-number">
              Mobile number
            </label>
            <input
              id="phone-country-code"
              className="account-security-pin-input account-security-phone-input"
              type="tel"
              inputMode="tel"
              autoComplete="tel-country-code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              placeholder="+1"
            />
            <input
              id="phone-number"
              className="account-security-pin-input account-security-phone-input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="555 123 4567"
            />
          </div>
          {error && <p className="account-security-sheet-error">{error}</p>}
          {success && <p className="account-security-sheet-success">{success}</p>}
          <button
            type="button"
            className="account-security-passkey-add"
            disabled={sending || !phoneInput.trim()}
            onClick={handleSendCode}
          >
            {sending ? 'Sending…' : 'Send code'}
          </button>
        </>
      )}

      {step === 'code' && (
        <>
          <p className="account-security-sheet-text">
            Enter the code sent to <strong>{maskPhone(pendingPhone || phoneInput)}</strong>.
          </p>
          <div className="account-security-pin-field">
            <label className="account-security-pin-label" htmlFor="phone-verify-code">
              Verification code
            </label>
            <input
              id="phone-verify-code"
              className="account-security-pin-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="123456"
            />
          </div>
          {error && <p className="account-security-sheet-error">{error}</p>}
          {success && <p className="account-security-sheet-success">{success}</p>}
          <button
            type="button"
            className="account-security-passkey-add"
            disabled={verifying || code.length < 4}
            onClick={handleVerify}
          >
            {verifying ? 'Verifying…' : 'Verify number'}
          </button>
          <button
            type="button"
            className="account-security-pin-remove"
            disabled={sending || verifying}
            onClick={handleSendCode}
          >
            {sending ? 'Sending…' : 'Resend code'}
          </button>
        </>
      )}
    </SecuritySheet>
  );
}

function QuickPinSheet({ pinSetAt, onClose, onSaved }) {
  const hasPin = Boolean(pinSetAt);
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSave() {
    setError('');
    setSuccess('');
    if (pin.length !== 6 || confirm.length !== 6) {
      setError('Enter a 6-digit passkey and confirm it.');
      return;
    }
    if (pin !== confirm) {
      setError('Passkey and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      const result = await setQuickPin({
        pin,
        ...(hasPin ? { currentPin } : {}),
      });
      const setAt = result?.security_pin_set_at || new Date().toISOString();
      setSuccess(hasPin ? 'Passkey updated.' : 'Passkey saved.');
      onSaved?.(setAt);
      setCurrentPin('');
      setPin('');
      setConfirm('');
    } catch (err) {
      setError(err?.message || 'Could not save passkey.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setError('');
    setSuccess('');
    setRemoving(true);
    try {
      await clearQuickPin(currentPin);
      setSuccess('Passkey removed.');
      onSaved?.(null);
      setCurrentPin('');
      setPin('');
      setConfirm('');
    } catch (err) {
      setError(err?.message || 'Could not remove passkey.');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <SecuritySheet
      title="Passkey"
      onClose={onClose}
      footer={
        <button type="button" className="account-security-sheet-done" onClick={onClose}>
          Done
        </button>
      }
    >
      <p className="account-security-sheet-lead">
        Set a 6-digit passkey for quick extra protection on this account. Works on any device with no extra setup.
      </p>

      {hasPin && (
        <p className="account-security-sheet-text">
          Passkey active{formatPinDate(pinSetAt) ? ` · set ${formatPinDate(pinSetAt)}` : ''}.
        </p>
      )}

      {hasPin && (
        <PinField
          id="quick-pin-current"
          label="Current passkey"
          value={currentPin}
          onChange={setCurrentPin}
          autoComplete="current-password"
        />
      )}

      <PinField
        id="quick-pin-new"
        label={hasPin ? 'New passkey' : 'Passkey'}
        value={pin}
        onChange={setPin}
        autoComplete="new-password"
      />
      <PinField
        id="quick-pin-confirm"
        label="Confirm passkey"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
      />

      {error && <p className="account-security-sheet-error">{error}</p>}
      {success && <p className="account-security-sheet-success">{success}</p>}

      <button
        type="button"
        className="account-security-passkey-add"
        disabled={saving || removing}
        onClick={handleSave}
      >
        {saving ? 'Saving…' : hasPin ? 'Update passkey' : 'Save passkey'}
      </button>

      {hasPin && (
        <button
          type="button"
          className="account-security-pin-remove"
          disabled={saving || removing}
          onClick={handleRemove}
        >
          {removing ? 'Removing…' : 'Remove passkey'}
        </button>
      )}
    </SecuritySheet>
  );
}

export function AccountSecurity({ email, phone, profile, onOpenIdentity, onQuickPinSaved, onPhoneVerified }) {
  const [sheet, setSheet] = useState(null);
  const quickPinEnabled = hasQuickPin(profile);
  const status = useMemo(
    () => securityStatus(profile, email, phone, quickPinEnabled),
    [profile, email, phone, quickPinEnabled],
  );
  const idVerified = Boolean(profile?.id_document_path && profile?.id_document_back_path);
  const idPartial = Boolean(profile?.id_document_path || profile?.id_document_back_path) && !idVerified;

  function openSoon(label) {
    setSheet(label);
  }

  function openIdentityCheck() {
    onOpenIdentity?.();
  }

  return (
    <div className="account-subview account-security">
      <h1 className="account-security-title">Security</h1>

      <div className={`account-security-status account-security-status--${status.levelClass}`}>
        <div className="account-security-status-copy">
          <p className="account-security-status-level">
            Security level: <strong>{status.level}</strong>
          </p>
          <p className="account-security-status-desc">{status.description}</p>
        </div>
        <SecurityShieldArt level={status.levelClass} />
      </div>

      <p className="account-security-section-label">Authentication methods</p>
      <div className="account-security-group">
        <SecurityRow
          icon={<PasskeyIcon />}
          label="Passkey"
          enabled={quickPinEnabled}
          onClick={() => setSheet('quick-pin')}
        />
        <SecurityRow
          icon={<IdCardIcon />}
          label="Identity verification"
          enabled={idVerified}
          trailing={idPartial ? 'Incomplete' : !idVerified ? 'Required' : null}
          onClick={openIdentityCheck}
        />
        <SecurityRow icon={<AuthenticatorIcon />} label="Google Authenticator" onClick={() => openSoon('Google Authenticator')} />
        <SecurityRow icon={<EmailIcon />} label="Email address" enabled={Boolean(email)} onClick={() => openSoon('Email address')} />
        <SecurityRow icon={<PhoneIcon />} label="Phone number" enabled={Boolean(phone)} onClick={() => setSheet('phone')} />
      </div>

      <p className="account-security-section-label">Advanced security</p>
      <div className="account-security-group">
        <SecurityRow icon={<AntiPhishIcon />} label="Anti-phishing code" onClick={() => openSoon('Anti-phishing code')} />
        <SecurityRow icon={<LinkIcon />} label="Third-party account linking" onClick={() => openSoon('Third-party account linking')} />
        <SecurityRow icon={<DevicesIcon />} label="Devices" onClick={() => openSoon('Devices')} />
        <SecurityRow icon={<KeyIcon />} label="Change password" onClick={() => openSoon('Change password')} />
        <SecurityRow icon={<AppLockIcon />} label="App lock" onClick={() => openSoon('App lock')} />
      </div>

      {sheet === 'phone' && (
        <PhoneVerificationSheet
          phone={phone}
          onClose={() => setSheet(null)}
          onVerified={(verifiedPhone) => onPhoneVerified?.(verifiedPhone)}
        />
      )}

      {sheet === 'quick-pin' && (
        <QuickPinSheet
          pinSetAt={profile?.security_pin_set_at}
          onClose={() => setSheet(null)}
          onSaved={(setAt) => onQuickPinSaved?.(setAt)}
        />
      )}

      {sheet && sheet !== 'quick-pin' && sheet !== 'phone' && (
        <SecuritySheet title={sheet} onClose={() => setSheet(null)}>
          <p className="account-security-sheet-text">This feature is coming soon.</p>
        </SecuritySheet>
      )}
    </div>
  );
}

function SecurityShieldArt({ level }) {
  const accent = level === 'high' ? '#2ecc71' : level === 'medium' ? '#f5c518' : '#ff8b7b';
  return (
    <svg className="account-security-shield-art" viewBox="0 0 88 88" aria-hidden>
      <circle cx="44" cy="44" r="38" fill="none" stroke={accent} strokeWidth="3" strokeDasharray="18 10" opacity="0.85" />
      <circle cx="44" cy="44" r="30" fill="none" stroke={accent} strokeWidth="2" strokeDasharray="12 8" opacity="0.5" />
      <path
        d="M44 18l18 7v14c0 12-8 22-18 26C34 61 26 51 26 39V25l18-7z"
        fill="url(#shieldGrad)"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1"
      />
      <path d="M38 42l4 4 8-9" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="shieldGrad" x1="26" y1="18" x2="62" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8e9aaf" />
          <stop offset="1" stopColor="#4a5568" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="account-security-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PasskeyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8.5" cy="7.5" r="2.75" />
      <path d="M4.5 19.5v-1a4 4 0 0 1 4-4" />
      <circle cx="17.25" cy="10.75" r="2.25" />
      <path d="M19 12.5l3.5 3.5" />
      <path d="M21 15l1.75 1.75" />
    </svg>
  );
}

function AuthenticatorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 2l2.2 4.5L19 7l-3.5 3.4L16.5 16 12 13.8 7.5 16l1-5.6L5 7l4.8-.5L12 2z" strokeLinejoin="round" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" strokeLinecap="round" />
    </svg>
  );
}

function IdCardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="12" r="2" />
      <path d="M14 10h5M14 14h5M14 18h3" strokeLinecap="round" />
    </svg>
  );
}

function AntiPhishIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 12c0-2 1.5-4 4-4s4 2 4 4-1.5 4-4 4" strokeLinecap="round" />
      <path d="M8 12c0 2-1.5 4-4 4M16 12c0 2 1.5 4 4 4" strokeLinecap="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" strokeLinecap="round" />
      <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" strokeLinecap="round" />
    </svg>
  );
}

function DevicesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="6" width="14" height="10" rx="1.5" />
      <rect x="16" y="8" width="6" height="12" rx="1.5" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="8" cy="8" r="4" />
      <path d="M12 12l8 8M16 16l4 4" strokeLinecap="round" />
    </svg>
  );
}

function AppLockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

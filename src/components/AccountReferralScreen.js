'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAffiliationFees, patchAffiliationFees } from '@/lib/api';
import { siteUrl } from '@/lib/site-url';
import { DashScreenHeader } from '@/components/DashScreenHeader';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

export function AccountReferralScreen({ userId, role }) {
  const [copied, setCopied] = useState(false);
  const [feeSettings, setFeeSettings] = useState(null);
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeError, setFeeError] = useState('');
  const debounceTimers = useRef({});
  const inviteUrl = siteUrl(`/register?ref=${userId}`);
  const copy = referralProgramCopy(role);

  useEffect(() => {
    setFeeLoading(true);
    setFeeError('');
    getAffiliationFees()
      .then((data) => setFeeSettings(data))
      .catch((e) => setFeeError(e?.message || 'Could not load fee settings'))
      .finally(() => setFeeLoading(false));
  }, []);

  const schedulePatch = useCallback((key, fn, delay = 420) => {
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(fn, delay);
  }, []);

  const patchAffiliateTake = useCallback(
    (percent) => {
      schedulePatch('take', async () => {
        try {
          await patchAffiliationFees({ affiliateTakePercent: percent });
        } catch (e) {
          setFeeError(e?.message || 'Save failed');
        }
      });
    },
    [schedulePatch],
  );

  const hierarchyNote = feeSettings?.hierarchyNote || '';
  const maxTake = feeSettings?.maxAffiliateTakePercent ?? 6;
  const affiliateTakeEffective =
    feeSettings?.affiliateTakePercent != null && !Number.isNaN(Number(feeSettings.affiliateTakePercent))
      ? Number(feeSettings.affiliateTakePercent)
      : 4;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="account-subview account-referral">
      <div className="account-referral-hero">
        <span className="account-referral-hero-icon" aria-hidden>
          <ReferralIcon />
        </span>
        <p className="account-referral-hero-title">Earn up to 40% commission</p>
        <p className="account-referral-hero-sub">{copy.intro}</p>
      </div>

      <section className="account-panel account-referral-section" aria-labelledby="referral-how-title">
        <h2 id="referral-how-title" className="account-referral-section-title">
          How it works
        </h2>
        <ol className="account-referral-steps">
          {copy.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="account-referral-note">{copy.signupNote}</p>
      </section>

      <section className="account-panel account-referral-section" aria-labelledby="referral-link-title">
        <h2 id="referral-link-title" className="account-referral-section-title">
          Your invite link
        </h2>
        <p className="account-referral-link-hint">
          Share this link — anyone who registers through it is linked to your account.
        </p>
        <div className="account-referral-link-row">
          <input
            readOnly
            className="account-referral-url"
            value={inviteUrl}
            aria-label="Your invite link"
            onFocus={(e) => e.target.select()}
          />
          <button type="button" className="account-referral-copy-btn" onClick={onCopy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </section>

      <details className="aff-details aff-info-details">
        <summary>How fees work in your role</summary>
        <p className="aff-details-body">{hierarchyNote}</p>
        <ul className="aff-tier-list">
          <li>
            <span className="aff-tier-badge">Platform</span> 4% on qualifying buys (fixed).
          </li>
          <li>
            <span className="aff-tier-badge">Your tier</span> One setting (0–{maxTake}%) applies to the affiliate
            commission your account earns — direct recruiter, super-agent, or super-super tier, depending on role and
            chain.
          </li>
          <li>
            <span className="aff-tier-badge">Default</span> 4% if you do not change the slider.
          </li>
        </ul>
      </details>

      <section className="aff-fee-panel" aria-busy={feeLoading}>
        <div className="aff-fee-panel-head">
          <h2 className="aff-section-title">Your commission take</h2>
        </div>
        {feeError && <p className="aff-message aff-error">{feeError}</p>}
        {feeLoading && <AppLoadingScreen fullScreen={false} className="app-loading-screen--section" size={48} />}

        {!feeLoading && (
          <div className="aff-fee-stack">
            <div className="aff-fee-row aff-fee-row--single">
              <div className="aff-fee-row-text">
                <strong>Take from qualifying buys</strong>
                <span className="aff-fee-pct">{Number(affiliateTakeEffective).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                className="aff-range"
                min={0}
                max={maxTake}
                step={0.1}
                value={affiliateTakeEffective}
                aria-label="Affiliate commission percent"
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setFeeSettings((prev) => ({ ...prev, affiliateTakePercent: v }));
                  patchAffiliateTake(v);
                }}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function AccountReferralToolbar() {
  return <DashScreenHeader title="Referral" />;
}

function referralProgramCopy(role) {
  if (role === 'super_super_agent') {
    return {
      intro: 'Invite people with your link. They join as super agents under you and build your network.',
      steps: [
        'Copy your personal invite link below.',
        'Send it to people you want on your team — they sign up through that URL.',
        'You earn network fees on qualifying crypto buys across your referral tree. Fees are paid by the buyer, not deducted from their balance.',
      ],
      signupNote: 'Super agent signups only — the account type is set automatically by your link.',
    };
  }
  if (role === 'super_agent') {
    return {
      intro: 'Invite agents with your link. You earn on their activity and the users they bring in.',
      steps: [
        'Copy your personal invite link below.',
        'Share it with people who should join as agents under you.',
        'You earn an extra commission tier on qualifying buys they and their referrals make (fees paid by the buyer).',
      ],
      signupNote: 'Agent signups only — the account type is set automatically by your link.',
    };
  }
  return {
    intro: 'Invite friends with your link. They join as regular users and you earn when they trade.',
    steps: [
      'Copy your personal invite link below.',
      'Share it by message, email, or social — friends create an account through that URL.',
      'You earn affiliate commission on their qualifying crypto buys, plus upline tiers when the rules apply.',
    ],
    signupNote: 'Regular user signups — friends do not need to pick an account type when using your link.',
  };
}

function ReferralIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="9" cy="7" r="3.5" />
      <path d="M2 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" strokeLinecap="round" />
      <path d="M16 3.5a3 3 0 1 1 0 6" strokeLinecap="round" />
      <path d="M22 20v-1a4 4 0 0 0-2.5-3.7" strokeLinecap="round" />
    </svg>
  );
}

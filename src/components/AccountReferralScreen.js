'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { siteUrl } from '@/lib/site-url';

export function AccountReferralScreen({ userId, role }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const inviteUrl = siteUrl(`/register?ref=${userId}`);
  const copy = referralProgramCopy(role);

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

      <button type="button" className="account-referral-dashboard-link" onClick={() => router.push('/dashboard/affiliation')}>
        Open affiliation dashboard
        <ChevronRightIcon />
      </button>
    </div>
  );
}

export function AccountReferralToolbar() {
  return (
    <header className="account-hub-toolbar">
      <Link href="/dashboard/account" className="account-hub-icon-btn" aria-label="Back to account">
        <BackIcon />
      </Link>
      <span className="account-hub-toolbar-title">Referral</span>
      <div className="account-hub-toolbar-spacer" aria-hidden />
    </header>
  );
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

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

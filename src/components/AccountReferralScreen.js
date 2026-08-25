'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getAffiliationFees, getProfileDownline } from '@/lib/api';
import { siteUrl } from '@/lib/site-url';
import { DashScreenHeader } from '@/components/DashScreenHeader';
import {
  REFERRAL_INVITE_TIERS,
  formatPct,
  getReferralInviteProgress,
} from '@/lib/referral-invite-tiers';

export function AccountReferralScreen({ userId, role }) {
  const [copied, setCopied] = useState(false);
  const [feeSettings, setFeeSettings] = useState(null);
  const [invitedCount, setInvitedCount] = useState(0);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [activeTierIndex, setActiveTierIndex] = useState(0);
  const carouselRef = useRef(null);
  const inviteUrl = siteUrl(`/register?ref=${userId}`);
  const copy = referralProgramCopy(role);

  useEffect(() => {
    getAffiliationFees()
      .then((data) => setFeeSettings(data))
      .catch(() => setFeeSettings(null));
  }, []);

  useEffect(() => {
    setInviteLoading(true);
    getProfileDownline()
      .then((data) => {
        const members = Array.isArray(data?.members) ? data.members : [];
        setInvitedCount(members.length);
      })
      .catch(() => setInvitedCount(0))
      .finally(() => setInviteLoading(false));
  }, []);

  const progress = useMemo(() => getReferralInviteProgress(invitedCount), [invitedCount]);

  useEffect(() => {
    const idx = Math.max(
      0,
      REFERRAL_INVITE_TIERS.findIndex((t) => t.id === progress.current.id),
    );
    setActiveTierIndex(idx >= 0 ? idx : 0);
  }, [progress.current.id]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const card = el.querySelector(`[data-tier-index="${activeTierIndex}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeTierIndex]);

  const hierarchyNote = feeSettings?.hierarchyNote || '';
  const maxTake = feeSettings?.maxAffiliateTakePercent ?? 6;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function onCarouselScroll() {
    const el = carouselRef.current;
    if (!el) return;
    const cards = [...el.querySelectorAll('[data-tier-index]')];
    if (!cards.length) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((card, i) => {
      const center = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActiveTierIndex(best);
  }

  return (
    <div className="account-subview account-referral">
      <div className="account-referral-hero">
        <span className="account-referral-hero-icon" aria-hidden>
          <ReferralIcon />
        </span>
        <p className="account-referral-hero-title">
          Refer &amp; earn up to <span className="account-referral-hero-accent">40%</span> commission
        </p>
        <p className="account-referral-hero-sub">
          The more friends you invite, the higher your rewards on their card activation and card spending.
        </p>
      </div>

      <section className="ref-tier-block" aria-label="Invite reward levels">
        <div className="ref-tier-stats">
          <div className="ref-tier-stat">
            <span className="ref-tier-stat-label">Invited friends</span>
            <strong className="ref-tier-stat-value">
              {inviteLoading ? '…' : invitedCount}
            </strong>
          </div>
          <div className="ref-tier-stat">
            <span className="ref-tier-stat-label">Your level</span>
            <strong className="ref-tier-stat-value">{progress.current.label}</strong>
          </div>
          <div className="ref-tier-stat">
            <span className="ref-tier-stat-label">Next unlock</span>
            <strong className="ref-tier-stat-value">
              {progress.isMax ? 'Max' : `${progress.remaining} left`}
            </strong>
          </div>
        </div>

        <div
          className="ref-tier-carousel"
          ref={carouselRef}
          onScroll={onCarouselScroll}
          role="list"
          aria-label="Commission levels"
        >
          {REFERRAL_INVITE_TIERS.map((tier, index) => {
            const isCurrent = tier.id === progress.current.id;
            const unlocked = invitedCount >= tier.friendsRequired;
            const barRatio =
              isCurrent && !progress.isMax
                ? progress.progressRatio
                : unlocked
                  ? 1
                  : 0;
            const barLabel = progress.next && isCurrent
              ? `${progress.progressCurrent}/${progress.progressTarget}`
              : unlocked
                ? `${tier.friendsRequired}+`
                : `0/${tier.friendsRequired}`;

            return (
              <article
                key={tier.id}
                data-tier-index={index}
                role="listitem"
                className={`ref-tier-card${isCurrent ? ' ref-tier-card--current' : ''}${unlocked ? ' ref-tier-card--unlocked' : ''}`}
              >
                <header className="ref-tier-card-head">
                  <span className="ref-tier-level">
                    <DiamondIcon />
                    {tier.label}
                  </span>
                  {isCurrent && <span className="ref-tier-pill">Current</span>}
                  {!unlocked && <span className="ref-tier-pill ref-tier-pill--locked">Locked</span>}
                </header>

                <div className="ref-tier-progress">
                  <div className="ref-tier-progress-track" aria-hidden>
                    <span className="ref-tier-progress-fill" style={{ width: `${Math.round(barRatio * 100)}%` }} />
                  </div>
                  <div className="ref-tier-progress-meta">
                    <span>{barLabel} friends</span>
                    <span>{tier.friendsRequired === 0 ? 'Starter' : `${tier.friendsRequired} to unlock`}</span>
                  </div>
                </div>

                <div className="ref-tier-rates">
                  <div className="ref-tier-rate">
                    <span className="ref-tier-rate-label">Card activation</span>
                    <strong className="ref-tier-rate-value">{formatPct(tier.cardActivationPct)}</strong>
                  </div>
                  <div className="ref-tier-rate">
                    <span className="ref-tier-rate-label">Card spend</span>
                    <strong className="ref-tier-rate-value">{formatPct(tier.cardTransactionPct)}</strong>
                  </div>
                  <div className="ref-tier-rate">
                    <span className="ref-tier-rate-label">
                      Tier 2
                      <span className="ref-tier-info" title="Commission from friends your invites bring in">
                        i
                      </span>
                    </span>
                    <strong className="ref-tier-rate-value">{formatPct(tier.tier2Pct)}</strong>
                  </div>
                </div>

                <p className="ref-tier-blurb">{tier.blurb}</p>
              </article>
            );
          })}
        </div>

        <div className="ref-tier-dots" role="tablist" aria-label="Select level">
          {REFERRAL_INVITE_TIERS.map((tier, index) => (
            <button
              key={tier.id}
              type="button"
              role="tab"
              aria-selected={activeTierIndex === index}
              aria-label={`Show ${tier.label}`}
              className={`ref-tier-dot${activeTierIndex === index ? ' ref-tier-dot--on' : ''}`}
              onClick={() => setActiveTierIndex(index)}
            />
          ))}
        </div>
      </section>

      <section className="account-panel account-referral-section" aria-labelledby="referral-how-title">
        <h2 id="referral-how-title" className="account-referral-section-title">
          How it works
        </h2>
        <ol className="account-referral-steps">
          <li>Share your invite link with friends.</li>
          <li>When they join and activate a card, you earn an activation commission based on your level.</li>
          <li>When they spend on the card, you earn a % of those transactions — higher levels pay more.</li>
          <li>Invite more friends to climb LV1 → LV4 and unlock up to 40% on card activation.</li>
        </ol>
        <p className="account-referral-note">{copy.signupNote}</p>
      </section>

      <section className="account-panel account-referral-section" aria-labelledby="referral-link-title">
        <h2 id="referral-link-title" className="account-referral-section-title">
          Invitation method
        </h2>
        <p className="account-referral-link-hint">
          Share this link — anyone who registers through it counts toward your invite level.
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
        <button type="button" className="ref-invite-now" onClick={onCopy}>
          {copied ? 'Link copied' : 'Invite now'}
        </button>
      </section>

      <details className="aff-details aff-info-details">
        <summary>How fees work in your role</summary>
        <p className="aff-details-body">{hierarchyNote}</p>
        <ul className="aff-tier-list">
          <li>
            <span className="aff-tier-badge">Card rewards</span> Activation and card-spend rates rise with how many
            friends you invite (see levels above).
          </li>
          <li>
            <span className="aff-tier-badge">Crypto buys</span> Affiliate commission (up to {maxTake}%) still applies
            based on your role — direct recruiter, super-agent, or super-super tier.
          </li>
          <li>
            <span className="aff-tier-badge">Default</span> 4% affiliate take on qualifying crypto buys when no custom
            rate is set.
          </li>
        </ul>
      </details>
    </div>
  );
}

export function AccountReferralToolbar() {
  return <DashScreenHeader title="Referral" />;
}

function referralProgramCopy(role) {
  if (role === 'super_super_agent') {
    return {
      signupNote: 'Super agent signups only — the account type is set automatically by your link.',
    };
  }
  if (role === 'super_agent') {
    return {
      signupNote: 'Agent signups only — the account type is set automatically by your link.',
    };
  }
  return {
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

function DiamondIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.5L3.5 9.5 12 21.5l8.5-12L12 2.5zm0 2.8l5.6 4.6L12 18.2 6.4 9.9 12 5.3z" />
    </svg>
  );
}

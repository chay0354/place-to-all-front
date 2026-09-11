/** Invite-count tiers for card-spend referral commissions (UI + progress). */

export const REFERRAL_INVITE_TIERS = [
  {
    id: 'lv1',
    level: 1,
    label: 'LV1',
    friendsRequired: 0,
    cardActivationPct: 10,
    cardTransactionPct: 0.05,
    tier2Pct: 3,
    blurb: 'Start inviting friends to unlock higher card rewards.',
  },
  {
    id: 'lv2',
    level: 2,
    label: 'LV2',
    friendsRequired: 5,
    cardActivationPct: 20,
    cardTransactionPct: 0.1,
    tier2Pct: 5,
    blurb: 'More invites unlock stronger activation and spend rewards.',
  },
  {
    id: 'lv3',
    level: 3,
    label: 'LV3',
    friendsRequired: 15,
    cardActivationPct: 30,
    cardTransactionPct: 0.2,
    tier2Pct: 10,
    blurb: 'Mid tier — earn more when referrals activate and spend on card.',
  },
  {
    id: 'lv4',
    level: 4,
    label: 'LV4',
    friendsRequired: 30,
    cardActivationPct: 40,
    cardTransactionPct: 0.3,
    tier2Pct: 15,
    blurb: 'Top tier — up to 40% on card activation from your invites.',
  },
];

/**
 * Resolve current / next tier from invited-friends count.
 * Progress bar uses friends toward the next tier threshold.
 */
export function getReferralInviteProgress(invitedCount) {
  const n = Math.max(0, Number(invitedCount) || 0);
  let current = REFERRAL_INVITE_TIERS[0];
  let next = REFERRAL_INVITE_TIERS[1] || null;

  for (let i = 0; i < REFERRAL_INVITE_TIERS.length; i += 1) {
    const tier = REFERRAL_INVITE_TIERS[i];
    if (n >= tier.friendsRequired) {
      current = tier;
      next = REFERRAL_INVITE_TIERS[i + 1] || null;
    }
  }

  if (!next) {
    return {
      current,
      next: null,
      invited: n,
      progressCurrent: current.friendsRequired,
      progressTarget: current.friendsRequired,
      progressRatio: 1,
      remaining: 0,
      isMax: true,
    };
  }

  const start = current.friendsRequired;
  const target = next.friendsRequired;
  const span = Math.max(1, target - start);
  const gained = Math.min(span, Math.max(0, n - start));
  const ratio = Math.min(1, gained / span);

  return {
    current,
    next,
    invited: n,
    progressCurrent: n,
    progressTarget: target,
    progressRatio: ratio,
    remaining: Math.max(0, target - n),
    isMax: false,
  };
}

export function formatPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (Number.isInteger(n)) return `${n}%`;
  return `${Number(n.toFixed(2))}%`;
}

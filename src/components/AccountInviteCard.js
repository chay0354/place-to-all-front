import Link from 'next/link';

export function AccountInviteCard() {
  return (
    <div className="account-invite-card">
      <span className="account-invite-icon" aria-hidden>
        <ReferralIcon />
      </span>
      <div className="account-invite-copy">
        <p className="account-invite-title">Referral</p>
        <p className="account-invite-sub">Invite friends, earn up to 40%</p>
      </div>
      <Link href="/dashboard/account/referral" className="account-invite-cta">
        Invite now
      </Link>
    </div>
  );
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

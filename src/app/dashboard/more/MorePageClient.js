'use client';

import Link from 'next/link';
import { DashScreenHeader } from '@/components/DashScreenHeader';

export function MorePageClient({ canSeeAffiliation = false, isAdmin = false }) {
  const sections = buildSections({ canSeeAffiliation, isAdmin });

  return (
    <div className="more-screen dash-screen">
      <DashScreenHeader title="More" />

      {sections.map((section) => (
        <section key={section.title} className="more-section">
          <p className="more-section-title">{section.title}</p>
          <div className="more-grid">
            {section.items.map((item) => (
              <Link key={item.label} href={item.href} className="more-item">
                <span className={`more-item-icon${item.accent ? ' more-item-icon--accent' : ''}`}>
                  {item.icon}
                </span>
                <span className="more-item-label">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function buildSections({ canSeeAffiliation, isAdmin }) {
  const finance = {
    title: 'Finance',
    items: [
      { label: 'Deposit', href: '/dashboard/buy', icon: <BuyIcon /> },
      { label: 'Withdrawal', href: '/dashboard/sell', icon: <SellIcon /> },
      { label: 'Assets', href: '/dashboard/market', icon: <AssetsIcon /> },
    ],
  };

  const card = {
    title: 'Card',
    items: [
      { label: 'My card', href: '/dashboard/card', icon: <CardIcon /> },
      { label: 'Freeze', href: '/dashboard/card/freeze', icon: <FreezeIcon /> },
      { label: 'Limit', href: '/dashboard/card/limit', icon: <LimitIcon /> },
      { label: 'Settings', href: '/dashboard/card/settings', icon: <SettingsIcon /> },
    ],
  };

  const rewardsItems = [
    { label: 'Referral', href: '/dashboard/account/referral', icon: <ReferralIcon /> },
  ];
  if (canSeeAffiliation) {
    rewardsItems.push({
      label: 'Affiliate',
      href: '/dashboard/affiliation',
      icon: <AffiliateIcon />,
    });
  } else {
    rewardsItems.push({
      label: 'Be an admin',
      href: '/register?type=agent',
      icon: <AdminBadgeIcon />,
      accent: true,
    });
  }

  const rewards = { title: 'Rewards', items: rewardsItems };

  const accountItems = [
    { label: 'Profile', href: '/dashboard/account', icon: <ProfileIcon /> },
  ];
  if (isAdmin) {
    accountItems.push({ label: 'Admin', href: '/dashboard/admin', icon: <ShieldIcon /> });
  }
  const account = { title: 'Account', items: accountItems };

  return [finance, card, rewards, account];
}

function BuyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M8 12h8" />
    </svg>
  );
}

function SellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </svg>
  );
}

function AssetsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M2 10h20" />
    </svg>
  );
}

function FreezeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" />
    </svg>
  );
}

function LimitIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3" />
      <path d="M2 14h4M10 12h4M18 16h4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function ReferralIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

function AffiliateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </svg>
  );
}

function AdminBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4z" />
    </svg>
  );
}

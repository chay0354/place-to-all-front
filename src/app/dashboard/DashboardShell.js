'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function DashboardShell({ children }) {
  const pathname = usePathname() || '';
  const isHome = pathname === '/dashboard' || pathname === '/dashboard/';
  const isBuy = pathname.startsWith('/dashboard/buy');
  const isSend = pathname.startsWith('/dashboard/transfer');
  const isCard = pathname.startsWith('/dashboard/card');
  const isAccount = pathname.startsWith('/dashboard/account');

  return (
    <div className="dashboard-wallet-ui">
      <header className="dash-header">
        <div className="dash-header-row">
          <Link href="/dashboard/account" className="dash-profile dash-profile--avatar" aria-label="Account" aria-hidden={isAccount}>
            <span role="img" aria-hidden>
              🦊
            </span>
          </Link>
          <h1 className="dash-brand">place to all</h1>
          <div className="dash-header-actions">
            <button type="button" className="dash-header-icon" aria-label="Scan">
              <ScanIcon />
            </button>
            <button type="button" className="dash-header-icon" aria-label="Notifications">
              <BellIcon />
            </button>
            <button type="button" className="dash-header-icon" aria-label="Support">
              <HeadsetIcon />
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <nav className="dash-bottom-nav" aria-label="Main">
        <Link href="/dashboard" className={isHome ? 'active' : ''}>
          <HomeIcon />
          Home
        </Link>
        <Link href="/dashboard/buy" className={isBuy ? 'active' : ''}>
          <CardIcon />
          Buy
        </Link>
        <Link href="/dashboard/transfer" className={isSend ? 'active' : ''}>
          <SendIcon />
          Send
        </Link>
        <Link href="/dashboard/card" className={isCard ? 'active' : ''}>
          <CardIcon />
          Card
        </Link>
      </nav>
    </div>
  );
}

function ScanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M21 7V5a2 2 0 0 0-2-2h-2M3 17v2a2 2 0 0 0 2 2h2M21 17v2a2 2 0 0 1-2 2h-2M7 3h10M7 21h10M3 12h18" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <rect x="2" y="12" width="4" height="7" rx="2" />
      <rect x="18" y="12" width="4" height="7" rx="2" />
      <path d="M6 19a6 6 0 0 0 6 3h2" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M2 10h20" />
    </svg>
  );
}


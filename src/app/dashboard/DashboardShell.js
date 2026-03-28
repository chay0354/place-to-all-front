'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function DashboardShell({ children }) {
  const pathname = usePathname() || '';
  const isHome = pathname === '/dashboard' || pathname === '/dashboard/';
  const isTransfer = pathname.startsWith('/dashboard/transfer');
  const isBuy = pathname.startsWith('/dashboard/buy');
  const isSell = pathname.startsWith('/dashboard/sell');
  const isAccount = pathname.startsWith('/dashboard/account');

  return (
    <div className="dashboard-wallet-ui">
      <header className="dash-header">
        <div className="dash-header-row">
          <Link href="/dashboard/account" className="dash-profile" aria-label="Account" aria-hidden={isAccount} />
          <div className="dash-header-actions">
            <button type="button" className="dash-header-icon" aria-label="Scan">
              <ScanIcon />
            </button>
            <button type="button" className="dash-header-icon" aria-label="Notifications">
              <BellIcon />
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
        <Link href="/dashboard/transfer" className={isTransfer ? 'active' : ''}>
          <SendIcon />
          Transfer
        </Link>
        <Link href="/dashboard/buy" className={isBuy ? 'active' : ''}>
          <ReceiveIcon />
          Buy
        </Link>
        <Link href="/dashboard/sell" className={isSell ? 'active' : ''}>
          <SwapIcon />
          Sell
        </Link>
      </nav>
    </div>
  );
}

function ScanIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M21 7V5a2 2 0 0 0-2-2h-2M3 17v2a2 2 0 0 0 2 2h2M21 17v2a2 2 0 0 1-2 2h-2M7 3h10M7 21h10M3 12h18" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

function ReceiveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" />
    </svg>
  );
}

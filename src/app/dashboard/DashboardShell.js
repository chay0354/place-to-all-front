'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getProfile } from '@/lib/api';
import { PROFILE_AVATAR_EVENT } from '@/lib/profile-avatar';
import { PinUnlockGate } from '@/components/PinUnlockGate';

function emailInitial(email) {
  const e = String(email || '').trim();
  if (!e) return 'P';
  return e.charAt(0).toUpperCase();
}

export function DashboardShell({ children, initialUser = null, initialProfile = null }) {
  const pathname = usePathname() || '';
  const [userEmail, setUserEmail] = useState(initialUser?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url || '');
  const isHome = pathname === '/dashboard' || pathname === '/dashboard/';
  const isSend = pathname.startsWith('/dashboard/transfer');
  const isCard = pathname.startsWith('/dashboard/card');
  const isAssets = pathname.startsWith('/dashboard/market');
  const isAccount = pathname.startsWith('/dashboard/account');

  useEffect(() => {
    if (initialUser?.email) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email?.trim() || '');
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email?.trim() || '');
    });
    return () => subscription.unsubscribe();
  }, [initialUser?.email]);

  useEffect(() => {
    const onAvatar = (e) => setAvatarUrl(e.detail?.url || '');
    window.addEventListener(PROFILE_AVATAR_EVENT, onAvatar);
    if (initialProfile?.avatar_url) {
      return () => window.removeEventListener(PROFILE_AVATAR_EVENT, onAvatar);
    }
    getProfile()
      .then((p) => setAvatarUrl(p?.avatar_url || ''))
      .catch(() => setAvatarUrl(''));
    return () => window.removeEventListener(PROFILE_AVATAR_EVENT, onAvatar);
  }, [initialProfile?.avatar_url]);

  return (
    <PinUnlockGate
      initialUserId={initialUser?.id || null}
      initialPinSetAt={initialProfile?.security_pin_set_at || null}
    >
      <div className="dashboard-wallet-ui">
      {!isAccount && (
      <header className="dash-header">
        <div className="dash-header-row">
          <Link href="/dashboard/account" className="dash-profile dash-profile--avatar" aria-label="Account" aria-hidden={isAccount}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="dash-profile-img"
                draggable={false}
                fetchPriority="high"
                decoding="async"
              />
            ) : (
              emailInitial(userEmail)
            )}
          </Link>
          <div className="dash-header-brand-block">
            <h1 className="dash-brand">place to all</h1>
            {!isHome && (
              userEmail ? (
                <Link href="/dashboard/account" className="dash-header-email" title={userEmail}>
                  {userEmail}
                </Link>
              ) : (
                <span className="dash-header-email dash-header-email--placeholder" aria-hidden="true">
                  &nbsp;
                </span>
              )
            )}
          </div>
          <div className="dash-header-actions">
            <button type="button" className="dash-header-icon" aria-label="Scan">
              <ScanIcon />
            </button>
            <button type="button" className="dash-header-icon" aria-label="Notifications">
              <BellIcon />
            </button>
            <form action="/auth/signout" method="POST" className="dash-header-signout-form">
              <button type="submit" className="dash-header-icon" aria-label="Sign out">
                <SignOutIcon />
              </button>
            </form>
          </div>
        </div>
      </header>
      )}

      <main>{children}</main>

      <nav className="dash-bottom-nav" aria-label="Main">
        <Link href="/dashboard" className={isHome ? 'active' : ''}>
          <HomeIcon />
          Home
        </Link>
        <Link href="/dashboard/market" className={isAssets ? 'active' : ''}>
          <AssetsIcon />
          Assets
        </Link>
        <Link href="/dashboard/transfer" className={isSend ? 'active' : ''}>
          <SendIcon />
          Send
        </Link>
        <Link href="/dashboard/card" className={isCard ? 'active' : ''}>
          <MoreIcon />
          More
        </Link>
      </nav>
      </div>
    </PinUnlockGate>
  );
}

function ScanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M21 7V5a2 2 0 0 0-2-2h-2M3 17v2a2 2 0 0 0 2 2h2M21 17v2a2 2 0 0 1-2 2h-2M7 3h10M7 21h10M3 12h18" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
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

function BuyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M8 11h8" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

function AssetsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}


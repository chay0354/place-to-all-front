'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAdminOperatorEmail } from '@/lib/admin-config';
import { AccountReferralScreen, AccountReferralToolbar } from '@/components/AccountReferralScreen';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

export function AccountReferralPageClient({ userId, userEmail, profile }) {
  const router = useRouter();
  const role = profile?.role || 'regular';
  const isAgentLike = role === 'agent' || role === 'super_agent' || role === 'super_super_agent';
  const isAdmin = role === 'admin' || isAdminOperatorEmail(userEmail);
  const canSeeAffiliation = isAgentLike || isAdmin;

  useEffect(() => {
    if (!canSeeAffiliation) {
      router.replace('/dashboard/account');
    }
  }, [canSeeAffiliation, router]);

  if (!canSeeAffiliation) {
    return <AppLoadingScreen fullScreen={false} className="app-loading-screen--inline" size={56} />;
  }

  return (
    <div className="account-hub">
      <AccountReferralToolbar />
      <AccountReferralScreen userId={userId} role={role} />
    </div>
  );
}

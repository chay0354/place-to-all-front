import { createClient } from '@/lib/supabase/server';
import { getProfileFromSupabaseServer } from '@/lib/profile-server';
import { ClientRedirect } from '@/components/ClientRedirect';
import { AccountReferralPageClient } from './AccountReferralPageClient';

export default async function AccountReferralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <ClientRedirect path="/login?next=/dashboard/account/referral" />;

  let profile = null;
  try {
    profile = await getProfileFromSupabaseServer(supabase, user.id);
  } catch {
    profile = { id: user.id, role: 'regular' };
  }

  return (
    <AccountReferralPageClient
      userId={user.id}
      userEmail={user.email?.trim() || ''}
      profile={profile}
    />
  );
}

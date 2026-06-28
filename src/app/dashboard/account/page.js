import { createClient } from '@/lib/supabase/server';
import { getProfileFromSupabaseServer } from '@/lib/profile-server';
import { ClientRedirect } from '@/components/ClientRedirect';
import { AccountPageClient } from './AccountPageClient';

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <ClientRedirect path="/login" />;

  let profile = null;
  try {
    profile = await getProfileFromSupabaseServer(supabase, user.id);
  } catch {
    profile = { id: user.id, role: 'regular' };
  }

  const initialUser = {
    id: user.id,
    email: user.email?.trim() || '',
    phone: user.phone ?? null,
  };

  return <AccountPageClient initialUser={initialUser} initialProfile={profile} />;
}

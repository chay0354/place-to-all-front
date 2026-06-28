import { createClient } from '@/lib/supabase/server';
import { getProfileFromSupabaseServer } from '@/lib/profile-server';
import { DashboardShell } from './DashboardShell';
import { ClientRedirect } from '@/components/ClientRedirect';

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <ClientRedirect path="/login" />;

  let profile = null;
  try {
    profile = await getProfileFromSupabaseServer(supabase, user.id);
  } catch {
    profile = { id: user.id, role: 'regular', security_pin_set_at: null, avatar_url: '' };
  }

  const initialUser = {
    id: user.id,
    email: user.email?.trim() || '',
  };
  const initialProfile = {
    avatar_url: profile?.avatar_url || '',
    security_pin_set_at: profile?.security_pin_set_at || null,
  };

  return (
    <DashboardShell initialUser={initialUser} initialProfile={initialProfile}>
      {children}
    </DashboardShell>
  );
}

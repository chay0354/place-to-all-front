import { createClient } from '@/lib/supabase/server';
import { getProfileFromSupabaseServer } from '@/lib/profile-server';
import { isAdminOperatorEmail } from '@/lib/admin-config';
import { ClientRedirect } from '@/components/ClientRedirect';
import { MorePageClient } from './MorePageClient';

export default async function MorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <ClientRedirect path="/login" />;

  let canSeeAffiliation = false;
  let isAdmin = false;
  try {
    const profile = await getProfileFromSupabaseServer(supabase, user.id).catch(() => null);
    const role = profile?.role || 'regular';
    const isAgentLike = role === 'agent' || role === 'super_agent' || role === 'super_super_agent';
    isAdmin = role === 'admin' || isAdminOperatorEmail(user.email);
    canSeeAffiliation = isAgentLike || isAdmin;
  } catch {
    canSeeAffiliation = false;
    isAdmin = false;
  }

  return <MorePageClient canSeeAffiliation={canSeeAffiliation} isAdmin={isAdmin} />;
}

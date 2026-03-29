import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getApiOrigin } from '@/lib/api-base';

/** GET /api/profile/downline — proxy to backend (agents / referred users). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${getApiOrigin()}/api/profile/downline`, {
    headers: { 'X-User-Id': user.id },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}

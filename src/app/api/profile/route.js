import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { joinBackendUrl } from '@/lib/api-base';

/** GET /api/profile — proxy to backend for the authenticated user. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(joinBackendUrl('/api/profile'), {
    headers: { 'X-User-Id': user.id },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}

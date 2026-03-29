import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { joinBackendUrl } from '@/lib/api-base';

/**
 * GET /api/wallets — server-side proxy so the backend always gets the authenticated user.
 * Proxies to the configured backend /api/wallets for the current user.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = joinBackendUrl(`/api/wallets?_t=${Date.now()}`);
  const res = await fetch(url, {
    headers: { 'X-User-Id': user.id },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { proxyBackendGet } from '@/lib/backend-proxy';

/**
 * GET /api/wallets — server-side proxy so the backend always gets the authenticated user.
 * Proxies to the configured backend /api/wallets for the current user.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return proxyBackendGet(`/api/wallets?_t=${Date.now()}`, user.id);
  } catch (e) {
    return NextResponse.json({ error: 'Wallet proxy failed', message: e?.message || String(e) }, { status: 500 });
  }
}

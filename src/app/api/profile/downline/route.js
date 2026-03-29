import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { proxyBackendGet } from '@/lib/backend-proxy';

/** GET /api/profile/downline — proxy to backend (agents / referred users). */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return proxyBackendGet('/api/profile/downline', user.id);
  } catch (e) {
    return NextResponse.json({ error: 'Downline proxy failed', message: e?.message || String(e) }, { status: 500 });
  }
}

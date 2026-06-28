import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { proxyBackendGet } from '@/lib/backend-proxy';

/** GET /api/transactions — authenticated proxy to backend transaction history. */
export async function GET() {
  try {
    let supabase;
    try {
      supabase = await createClient();
    } catch (e) {
      return NextResponse.json(
        { error: 'Auth configuration', message: e?.message || 'Check NEXT_PUBLIC_SUPABASE_* env on Vercel' },
        { status: 500 },
      );
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return proxyBackendGet('/api/transactions', user.id);
  } catch (e) {
    return NextResponse.json({ error: 'Transactions proxy failed', message: e?.message || String(e) }, { status: 500 });
  }
}

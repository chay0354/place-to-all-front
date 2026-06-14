import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { verifyPinWithFallback } from '@/lib/profile-server';

async function getAuthedSupabase() {
  let supabase;
  try {
    supabase = await createClient();
  } catch (e) {
    return {
      error: NextResponse.json(
        {
          error: 'Auth configuration',
          message: e?.message || 'Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
        },
        { status: 500 },
      ),
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { supabase, user };
}

/** POST /api/profile/verify-pin — verify quick PIN for dashboard unlock. */
export async function POST(request) {
  try {
    const auth = await getAuthedSupabase();
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const pin = body?.pin;
    const data = await verifyPinWithFallback(auth.supabase, auth.user.id, pin);
    return NextResponse.json(data);
  } catch (e) {
    const status = e?.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    return NextResponse.json({ error: e?.message || 'PIN verification failed' }, { status });
  }
}

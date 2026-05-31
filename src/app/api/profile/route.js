import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { fetchProfileWithFallback, patchProfileWithFallback } from '@/lib/profile-server';

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

/** GET /api/profile — backend with Supabase fallback for the authenticated user. */
export async function GET() {
  try {
    const auth = await getAuthedSupabase();
    if (auth.error) return auth.error;

    const { data } = await fetchProfileWithFallback(auth.supabase, auth.user.id);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Profile failed', message: e?.message || String(e) }, { status: 500 });
  }
}

/** PATCH /api/profile — update profile (avatar_url, id_document_path). */
export async function PATCH(request) {
  try {
    const auth = await getAuthedSupabase();
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const { data } = await patchProfileWithFallback(auth.supabase, auth.user.id, body);
    return NextResponse.json(data);
  } catch (e) {
    const status = e?.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    return NextResponse.json({ error: 'Profile update failed', message: e?.message || String(e) }, { status });
  }
}

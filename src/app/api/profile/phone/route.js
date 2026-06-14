import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { joinBackendUrl } from '@/lib/api-base';

async function getAuthedUser() {
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

  return { user };
}

/** DELETE /api/profile/phone */
export async function DELETE() {
  try {
    const auth = await getAuthedUser();
    if (auth.error) return auth.error;

    const res = await fetch(joinBackendUrl('/api/profile/phone'), {
      method: 'DELETE',
      headers: { 'X-User-Id': auth.user.id },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: data.error || data.message || res.statusText }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Could not remove phone' }, { status: 500 });
  }
}

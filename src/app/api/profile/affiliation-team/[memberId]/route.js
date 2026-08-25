import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { proxyBackendPatch } from '@/lib/backend-proxy';

/** PATCH /api/profile/affiliation-team/:memberId */
export async function PATCH(request, { params }) {
  try {
    let supabase;
    try {
      supabase = await createClient();
    } catch (e) {
      return NextResponse.json(
        { error: 'Auth configuration', message: e?.message || 'Check NEXT_PUBLIC_SUPABASE_* env' },
        { status: 500 },
      );
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const memberId = params?.memberId;
    if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 });

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    return proxyBackendPatch(`/api/profile/affiliation-team/${encodeURIComponent(memberId)}`, user.id, body);
  } catch (e) {
    return NextResponse.json(
      { error: 'Affiliation team PATCH proxy failed', message: e?.message || String(e) },
      { status: 500 },
    );
  }
}

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { proxyBackendGet, proxyBackendPatch } from '@/lib/backend-proxy';

/** GET /api/profile/affiliation-fees — configurable commission takes (agent+). */
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

    return proxyBackendGet('/api/profile/affiliation-fees', user.id);
  } catch (e) {
    return NextResponse.json(
      { error: 'Affiliation fees proxy failed', message: e?.message || String(e) },
      { status: 500 },
    );
  }
}

/** PATCH /api/profile/affiliation-fees */
export async function PATCH(request) {
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

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    return proxyBackendPatch('/api/profile/affiliation-fees', user.id, body);
  } catch (e) {
    return NextResponse.json(
      { error: 'Affiliation fees PATCH proxy failed', message: e?.message || String(e) },
      { status: 500 },
    );
  }
}

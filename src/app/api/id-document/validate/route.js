import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { validateIdDocumentWithOpenAI } from '@/lib/id-document-validate';

/** POST /api/id-document/validate — OpenAI vision check before upload (server-only key). */
export async function POST(request) {
  try {
    let supabase;
    try {
      supabase = await createClient();
    } catch (e) {
      return NextResponse.json(
        { error: 'Auth configuration', message: e?.message || 'Supabase not configured' },
        { status: 500 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file');
    const side = form.get('side');

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
    }
    if (side !== 'front' && side !== 'back') {
      return NextResponse.json({ error: 'side must be front or back' }, { status: 400 });
    }

    const result = await validateIdDocumentWithOpenAI(file, side);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: 'Verification failed', message: e?.message || String(e), valid: false },
      { status: 500 },
    );
  }
}

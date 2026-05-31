import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { IdValidateError, validateIdDocumentWithOpenAI } from '@/lib/id-document-validate';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

function isUploadFile(value) {
  return value && typeof value === 'object' && typeof value.arrayBuffer === 'function';
}

/** POST /api/id-document/validate — OpenAI vision check before upload (server-only key). */
export async function POST(request) {
  try {
    let supabase;
    try {
      supabase = await createClient();
    } catch (e) {
      return NextResponse.json(
        { error: 'Auth configuration', message: e?.message || 'Supabase not configured', code: 'auth_config' },
        { status: 500 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file');
    const side = form.get('side');

    if (!isUploadFile(file)) {
      return NextResponse.json({ error: 'Missing image file', code: 'bad_request' }, { status: 400 });
    }
    if (side !== 'front' && side !== 'back') {
      return NextResponse.json({ error: 'side must be front or back', code: 'bad_request' }, { status: 400 });
    }

    const result = await validateIdDocumentWithOpenAI(file, side);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof IdValidateError) {
      return NextResponse.json(
        { error: 'Verification failed', message: e.message, code: e.code, valid: false },
        { status: e.status },
      );
    }
    return NextResponse.json(
      { error: 'Verification failed', message: e?.message || String(e), code: 'error', valid: false },
      { status: 500 },
    );
  }
}

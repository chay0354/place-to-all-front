import { createClient } from '@/lib/supabase/client';
import { updateProfile } from '@/lib/api';

const BUCKET = 'id-documents';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

function extForType(type) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

function assertFile(file) {
  if (!file || !ALLOWED.has(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP photo of your ID.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('ID image must be 5 MB or smaller.');
  }
}

/** Server-side OpenAI vision check (front or back). */
export async function validateIdDocumentSide(file, side) {
  assertFile(file);
  const form = new FormData();
  form.append('file', file);
  form.append('side', side);

  const res = await fetch('/api/id-document/validate', {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Verification failed');
  }
  if (!data.valid) {
    throw new Error(data.reason || 'This photo was not accepted. Please upload a clear image of your ID.');
  }
  return data;
}

async function uploadSide(supabase, userId, file, suffix) {
  const ext = extForType(file.type);
  const path = `${userId}/id-${suffix}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '3600',
  });
  if (error) throw new Error(error.message || `Could not upload ID ${suffix}`);
  return path;
}

/** Upload verified front + back images to private storage and save paths on profile. */
export async function uploadVerifiedIdDocuments(userId, frontFile, backFile) {
  if (!userId) throw new Error('Not signed in');
  assertFile(frontFile);
  assertFile(backFile);

  const supabase = createClient();
  const frontPath = await uploadSide(supabase, userId, frontFile, 'front');
  const backPath = await uploadSide(supabase, userId, backFile, 'back');

  const result = await updateProfile({
    id_document_path: frontPath,
    id_document_back_path: backPath,
  });

  return {
    path: frontPath,
    backPath,
    uploadedAt: result.id_document_uploaded_at || new Date().toISOString(),
  };
}

/** Signed URL for the current user to preview their own ID document (private bucket). */
export async function getIdDocumentPreviewUrl(path, expiresIn = 3600) {
  if (!path) return null;
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw new Error(error.message || 'Could not load ID preview');
  return data?.signedUrl || null;
}

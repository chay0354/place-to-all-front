import { createClient } from '@/lib/supabase/client';
import { updateProfile } from '@/lib/api';
import { compressImageFile, normalizeImageMimeType } from '@/lib/image-compress';

const BUCKET = 'id-documents';
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 3 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

function extForType(type) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

function assertFileInput(file) {
  const mime = normalizeImageMimeType(file);
  if (!file || !ALLOWED.has(mime)) {
    throw new Error('Use a JPG, PNG, or WebP photo of your ID.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('ID photo must be 25 MB or smaller.');
  }
}

/** Compress phone camera photos before validate/upload (no upfront 5 MB cap). */
async function prepareIdFile(file, side) {
  assertFileInput(file);
  return compressImageFile(file, {
    maxDimension: 1600,
    maxBytes: MAX_OUTPUT_BYTES,
    basename: `id-${side}`,
    forceJpeg: true,
  });
}

/** Server-side OpenAI vision check (front or back). */
export async function validateIdDocumentSide(file, side) {
  const prepared = await prepareIdFile(file, side);
  const form = new FormData();
  form.append('file', prepared);
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
  const mime = normalizeImageMimeType(file);
  const ext = extForType(mime);
  const path = `${userId}/id-${suffix}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: mime,
    cacheControl: '3600',
  });
  if (error) throw new Error(error.message || `Could not upload ID ${suffix}`);
  return path;
}

/** Upload verified front + back images to private storage and save paths on profile. */
export async function uploadVerifiedIdDocuments(userId, frontFile, backFile) {
  if (!userId) throw new Error('Not signed in');
  const front = await prepareIdFile(frontFile, 'front');
  const back = await prepareIdFile(backFile, 'back');

  const supabase = createClient();
  const frontPath = await uploadSide(supabase, userId, front, 'front');
  const backPath = await uploadSide(supabase, userId, back, 'back');

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

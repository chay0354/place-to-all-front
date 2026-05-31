import { createClient } from '@/lib/supabase/client';
import { updateProfile } from '@/lib/api';
import { getAvatarPublicUrl } from '@/lib/profile-client';

const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_DIMENSION = 1024;

export const PROFILE_AVATAR_EVENT = 'pta-profile-avatar';

export function notifyProfileAvatar(url) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROFILE_AVATAR_EVENT, { detail: { url: url || null } }));
  }
}

function extForType(type) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this image.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/** Resize and compress large phone photos before upload. */
async function prepareAvatarFile(file) {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Image must be 12 MB or smaller.');
  }

  const img = await loadImageFromFile(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const needsResize = scale < 1;
  const needsCompress = file.size > MAX_UPLOAD_BYTES;

  if (!needsResize && !needsCompress) return file;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  let quality = outputType === 'image/png' ? undefined : 0.88;
  let blob = await canvasToBlob(canvas, outputType, quality);

  if (outputType === 'image/jpeg' && blob && blob.size > MAX_UPLOAD_BYTES) {
    for (const q of [0.82, 0.72, 0.62, 0.52]) {
      blob = await canvasToBlob(canvas, 'image/jpeg', q);
      if (blob && blob.size <= MAX_UPLOAD_BYTES) break;
    }
  }

  if (!blob) throw new Error('Could not process this image.');
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error('Image is still too large after compression. Try a smaller photo.');
  }

  const ext = extForType(outputType);
  return new File([blob], `avatar.${ext}`, { type: outputType, lastModified: Date.now() });
}

/** Upload image to Supabase Storage and persist public URL on the user profile. */
export async function uploadProfileAvatar(userId, file) {
  if (!userId) throw new Error('Not signed in');
  if (!file || !ALLOWED.has(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP image.');
  }

  const prepared = await prepareAvatarFile(file);

  const supabase = createClient();
  const ext = extForType(prepared.type);
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, prepared, {
    upsert: true,
    contentType: prepared.type,
    cacheControl: '3600',
  });
  if (uploadErr) throw new Error(uploadErr.message || 'Could not upload image');

  const base = getAvatarPublicUrl(path);
  if (!base) throw new Error('Could not get image URL');

  const avatarUrl = `${base}?v=${Date.now()}`;
  await updateProfile({ avatar_url: avatarUrl });
  notifyProfileAvatar(avatarUrl);
  return avatarUrl;
}

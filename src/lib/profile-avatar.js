import { createClient } from '@/lib/supabase/client';
import { updateProfile } from '@/lib/api';
import { getAvatarPublicUrl } from '@/lib/profile-client';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

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

/** Upload image to Supabase Storage and persist public URL on the user profile. */
export async function uploadProfileAvatar(userId, file) {
  if (!userId) throw new Error('Not signed in');
  if (!file || !ALLOWED.has(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP image.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be 2 MB or smaller.');
  }

  const supabase = createClient();
  const ext = extForType(file.type);
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: true,
    contentType: file.type,
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

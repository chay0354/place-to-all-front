import { createClient } from '@/lib/supabase/client';
import { hashSecurityPin, verifySecurityPin } from '@/lib/security-pin';

const PROFILE_BASE_FIELDS =
  'id, role, referred_by_id, username, display_name, avatar_url, id_document_path, id_document_back_path, id_document_uploaded_at, nps_score, nps_submitted_at, security_pin_set_at';
const PROFILE_FIELDS = `${PROFILE_BASE_FIELDS}, country_code`;

function isMissingCountryColumn(error) {
  const msg = error?.message || '';
  return /country_code/i.test(msg) && /(column|does not exist|schema cache)/i.test(msg);
}

/** Read the signed-in user's profile row directly from Supabase (RLS). */
export async function getProfileFromSupabase() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  let { data, error } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', user.id).maybeSingle();
  if (error && isMissingCountryColumn(error)) {
    ({ data, error } = await supabase.from('profiles').select(PROFILE_BASE_FIELDS).eq('id', user.id).maybeSingle());
  }
  if (error) throw error;
  const base = data || { id: user.id, role: 'regular', referred_by_id: null, country_code: 'IL' };
  if (!base.country_code) base.country_code = 'IL';
  return hydrateAvatarFromStorage(supabase, user.id, base);
}

async function hydrateAvatarFromStorage(supabase, userId, profile) {
  if (profile?.avatar_url) return profile;
  try {
    const { data: files } = await supabase.storage.from('avatars').list(userId, { limit: 20 });
    const avatarFile = (files || []).find((f) => f.name && f.name.startsWith('avatar.'));
    if (!avatarFile) return profile;
    const publicUrl = getAvatarPublicUrl(`${userId}/${avatarFile.name}`);
    if (!publicUrl) return profile;
    return { ...profile, avatar_url: publicUrl };
  } catch {
    return profile;
  }
}

/** Update profile fields for the signed-in user (RLS). */
export async function updateProfileViaSupabase(body) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const updates = { updated_at: new Date().toISOString() };

  if (body.avatar_url !== undefined) {
    updates.avatar_url = body.avatar_url;
  }
  if (body.country_code !== undefined) {
    const code = String(body.country_code || '')
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) throw new Error('Invalid country code');
    updates.country_code = code;
  }
  if (body.id_document_path !== undefined) {
    updates.id_document_path = body.id_document_path;
    if (!body.id_document_path) {
      updates.id_document_back_path = null;
      updates.id_document_uploaded_at = null;
    } else {
      updates.id_document_uploaded_at = new Date().toISOString();
    }
  }
  if (body.id_document_back_path !== undefined) {
    updates.id_document_back_path = body.id_document_back_path;
    if (body.id_document_back_path && !updates.id_document_uploaded_at) {
      updates.id_document_uploaded_at = new Date().toISOString();
    }
  }
  const { data: existing, error: readErr } = await supabase
    .from('profiles')
    .select('id, nps_score')
    .eq('id', user.id)
    .maybeSingle();
  if (readErr) throw readErr;

  if (body.nps_score !== undefined) {
    const n = body.nps_score;
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      throw new Error('Score must be between 1 and 10');
    }
    if (existing?.nps_score != null) {
      throw new Error('Feedback already submitted');
    }
    updates.nps_score = n;
    updates.nps_submitted_at = new Date().toISOString();
  }

  if (body.security_pin !== undefined || body.clear_security_pin === true) {
    const { data: pinRow, error: pinReadErr } = await supabase
      .from('profiles')
      .select('security_pin_hash')
      .eq('id', user.id)
      .maybeSingle();
    if (pinReadErr) throw pinReadErr;
    const hasPin = Boolean(pinRow?.security_pin_hash);

    if (body.clear_security_pin === true || body.security_pin === null) {
      if (hasPin) {
        if (!body.current_pin) throw new Error('Enter your current PIN to remove it');
        if (!verifySecurityPin(body.current_pin, user.id, pinRow.security_pin_hash)) {
          throw new Error('Current PIN is incorrect');
        }
      }
      updates.security_pin_hash = null;
      updates.security_pin_set_at = null;
    } else if (typeof body.security_pin === 'string') {
      if (hasPin) {
        if (!body.current_pin) throw new Error('Enter your current PIN to change it');
        if (!verifySecurityPin(body.current_pin, user.id, pinRow.security_pin_hash)) {
          throw new Error('Current PIN is incorrect');
        }
      }
      updates.security_pin_hash = hashSecurityPin(body.security_pin, user.id);
      updates.security_pin_set_at = new Date().toISOString();
    } else {
      throw new Error('Invalid PIN');
    }
  }

  if (Object.keys(updates).length <= 1) {
    throw new Error('No fields to update');
  }

  if (existing) {
    let { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error && isMissingCountryColumn(error) && 'country_code' in updates) {
      const { country_code, ...safe } = updates;
      ({ error } = await supabase.from('profiles').update(safe).eq('id', user.id));
    }
    if (error) throw error;
  } else {
    let { error } = await supabase.from('profiles').insert({ id: user.id, role: 'regular', ...updates });
    if (error && isMissingCountryColumn(error) && 'country_code' in updates) {
      const { country_code, ...safe } = updates;
      ({ error } = await supabase.from('profiles').insert({ id: user.id, role: 'regular', ...safe }));
    }
    if (error) throw error;
  }

  return { ok: true, ...updates };
}

/** Public URL for an avatar object path (must include /object/public/ segment). */
export function getAvatarPublicUrl(path) {
  const supabase = createClient();
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data?.publicUrl || null;
}

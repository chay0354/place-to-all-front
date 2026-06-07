import { joinBackendUrl } from '@/lib/api-base';

const PROFILE_FIELDS =
  'id, role, referred_by_id, username, display_name, avatar_url, id_document_path, id_document_back_path, id_document_uploaded_at, nps_score, nps_submitted_at';

function avatarPublicUrl(supabase, path) {
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data?.publicUrl || null;
}

async function hydrateAvatarFromStorage(supabase, userId, profile) {
  if (profile?.avatar_url) return profile;
  try {
    const { data: files } = await supabase.storage.from('avatars').list(userId, { limit: 20 });
    const avatarFile = (files || []).find((f) => f.name && f.name.startsWith('avatar.'));
    if (!avatarFile) return profile;
    const publicUrl = avatarPublicUrl(supabase, `${userId}/${avatarFile.name}`);
    if (!publicUrl) return profile;
    return { ...profile, avatar_url: publicUrl };
  } catch {
    return profile;
  }
}

/** Read profile from Supabase (server client + RLS). */
export async function getProfileFromSupabaseServer(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  const base = data || { id: userId, role: 'regular', referred_by_id: null };
  return hydrateAvatarFromStorage(supabase, userId, base);
}

/** Update profile via Supabase (server client + RLS). */
export async function updateProfileViaSupabaseServer(supabase, userId, body) {
  const updates = { updated_at: new Date().toISOString() };

  if (body.avatar_url !== undefined) {
    updates.avatar_url = body.avatar_url;
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
    .eq('id', userId)
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

  if (Object.keys(updates).length <= 1) {
    throw new Error('No fields to update');
  }

  if (existing) {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      role: 'regular',
      ...updates,
    });
    if (error) throw error;
  }

  return { ok: true, ...updates };
}

/** Try Express API first; fall back to Supabase when backend is down or misconfigured. */
export async function fetchProfileWithFallback(supabase, userId) {
  try {
    const res = await fetch(joinBackendUrl('/api/profile'), {
      headers: { 'X-User-Id': userId },
      cache: 'no-store',
    });
    if (res.ok) return { data: await res.json(), source: 'backend' };
  } catch {
    /* backend unreachable */
  }
  const data = await getProfileFromSupabaseServer(supabase, userId);
  return { data, source: 'supabase' };
}

/** Try Express PATCH first; fall back to Supabase when backend is down. */
export async function patchProfileWithFallback(supabase, userId, body) {
  try {
    const res = await fetch(joinBackendUrl('/api/profile'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (res.ok) return { data: await res.json(), source: 'backend' };
    if (res.status >= 400 && res.status < 500) {
      const err = await res.json().catch(() => ({}));
      const e = new Error(err.error || err.message || res.statusText);
      e.status = res.status;
      throw e;
    }
  } catch (e) {
    if (e.status && e.status < 500) throw e;
    /* backend unreachable or 5xx — fall through */
  }
  const data = await updateProfileViaSupabaseServer(supabase, userId, body);
  return { data, source: 'supabase' };
}

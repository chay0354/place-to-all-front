/**
 * Public origin of this Next app (invite links, payment links, etc.).
 * Set NEXT_PUBLIC_APP_URL on Vercel to https://your-frontend.vercel.app (no trailing slash).
 * If unset, uses window.location.origin in the browser (local dev).
 */
export function getSiteOrigin() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv != null && String(fromEnv).trim() !== '') {
    return String(fromEnv).trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

/** Absolute URL for a path starting with / */
export function siteUrl(path) {
  const base = getSiteOrigin();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

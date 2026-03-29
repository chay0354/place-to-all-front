/** Backend origin for server + client. Trims and strips trailing slashes. */
export function getApiOrigin() {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return String(raw).trim().replace(/\/+$/, '');
}

/**
 * Absolute backend URL. `path` should start with / (e.g. /api/transactions or /api/foo?x=1).
 * Uses URL resolution so double slashes after the host never occur.
 */
export function joinBackendUrl(path) {
  const base = getApiOrigin();
  const p = String(path || '').trim();
  const pathname = p.startsWith('/') ? p : `/${p}`;
  return new URL(pathname, `${base}/`).href;
}

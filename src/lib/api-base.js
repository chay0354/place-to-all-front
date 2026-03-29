/**
 * Backend origin for server + client. Trims and strips trailing slashes.
 * On Vercel, Route Handlers run on the server: use BACKEND_URL (server-only) or NEXT_PUBLIC_API_URL.
 * If neither is set, the default localhost is wrong in production and proxy fetches will fail.
 */
export function getApiOrigin() {
  const isServer = typeof window === 'undefined';
  const raw = isServer
    ? process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
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

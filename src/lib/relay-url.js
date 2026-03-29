/**
 * Maps a backend path like /api/transactions?_t=1 to the Next.js relay route.
 * Browser calls /api/relay/... (same origin); the server proxies to BACKEND_URL.
 */
export function toRelayUrl(pathWithQuery) {
  const qIndex = pathWithQuery.indexOf('?');
  const pathname = (qIndex >= 0 ? pathWithQuery.slice(0, qIndex) : pathWithQuery).replace(/\/+$/, '') || '/';
  const search = qIndex >= 0 ? pathWithQuery.slice(qIndex) : '';
  if (!pathname.startsWith('/api/')) {
    throw new Error(`toRelayUrl expects a path starting with /api/: ${pathname}`);
  }
  const segments = pathname.slice(1).split('/').filter(Boolean);
  if (segments.length === 0) {
    throw new Error(`toRelayUrl: empty API path`);
  }
  return `/api/relay/${segments.join('/')}${search}`;
}

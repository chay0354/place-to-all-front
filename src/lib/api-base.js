/** Backend origin for server + client. Strips trailing slashes so `${origin}/api/...` never doubles `//`. */
export function getApiOrigin() {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return String(raw).replace(/\/+$/, '');
}

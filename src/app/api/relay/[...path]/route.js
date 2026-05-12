import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { joinBackendUrl, getApiOrigin } from '@/lib/api-base';

function relayUnreachablePayload(err) {
  const origin = getApiOrigin();
  return {
    error: 'Backend unreachable',
    message: err?.message || String(err),
    attemptedOrigin: origin,
    hint:
      'Start the Place-to-All API (e.g. cd back && npm run dev — default port 4000), or set NEXT_PUBLIC_API_URL / BACKEND_URL in front/.env.local to your API base URL (no trailing slash).',
  };
}

export const dynamic = 'force-dynamic';

function misconfiguredOnVercel() {
  if (process.env.VERCEL !== '1') return null;
  const o = getApiOrigin();
  if (o.includes('localhost') || o.includes('127.0.0.1')) {
    return 'Set BACKEND_URL or NEXT_PUBLIC_API_URL on this Vercel project to your deployed API URL.';
  }
  return null;
}

function pathnameFromSegments(segments) {
  return `/${segments.join('/')}`;
}

/** Paths that may be proxied without a logged-in Supabase session (backend still enforces its own rules). */
function isPublicRelay(method, pathname) {
  const m = method.toUpperCase();
  if (m === 'GET' && pathname.startsWith('/api/coinbase/')) {
    if (pathname.startsWith('/api/coinbase/wallet')) return false;
    if (pathname.startsWith('/api/coinbase/balances')) return false;
    return true;
  }
  if (m === 'GET' && pathname.startsWith('/api/payment-links/public/')) return true;
  if (m === 'GET' && pathname === '/api/moonpay/payment-link-url') return true;
  if (m === 'POST' && /^\/api\/payment-links\/public\/[^/]+\/simulate-pay$/.test(pathname)) return true;
  if (m === 'GET' && pathname.startsWith('/api/auth/referral-preview')) return true;
  if (m === 'POST' && pathname === '/api/auth/confirm-email') return true;
  return false;
}

async function handle(request, { params }) {
  const segments = params?.path;
  if (!Array.isArray(segments) || segments.length === 0) {
    return NextResponse.json({ error: 'Bad relay path' }, { status: 400 });
  }

  const pathname = pathnameFromSegments(segments);
  if (!pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Relay only forwards /api/*' }, { status: 400 });
  }

  const search = request.nextUrl.search;
  const fullBackendPath = `${pathname}${search}`;

  const bad = misconfiguredOnVercel();
  if (bad) {
    return NextResponse.json({ error: 'Server configuration', detail: bad }, { status: 503 });
  }

  let user = null;
  try {
    const supabase = await createClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u;
  } catch {
    user = null;
  }

  const publicOk = isPublicRelay(request.method, pathname);
  if (!user && !publicOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backendUrl = joinBackendUrl(fullBackendPath);

  const headers = new Headers();
  if (user) headers.set('X-User-Id', user.id);
  const auth = request.headers.get('authorization');
  if (auth) headers.set('Authorization', auth);

  if (!['GET', 'HEAD'].includes(request.method)) {
    const ct = request.headers.get('content-type');
    if (ct) headers.set('Content-Type', ct);
  }

  const init = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    const body = await request.text();
    if (body) init.body = body;
  }

  let res;
  try {
    res = await fetch(backendUrl, init);
  } catch (e) {
    return NextResponse.json(relayUnreachablePayload(e), { status: 502 });
  }

  const text = await res.text();
  const out = new NextResponse(text, { status: res.status });
  const ctOut = res.headers.get('content-type');
  if (ctOut) out.headers.set('Content-Type', ctOut);
  return out;
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;

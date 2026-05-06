import { NextResponse } from 'next/server';
import { joinBackendUrl, getApiOrigin } from '@/lib/api-base';

function misconfiguredOnVercel() {
  if (process.env.VERCEL !== '1') return null;
  const o = getApiOrigin();
  if (o.includes('localhost') || o.includes('127.0.0.1')) {
    return 'Set BACKEND_URL or NEXT_PUBLIC_API_URL on this Vercel project to your real API URL (e.g. https://place-to-all-back.vercel.app).';
  }
  return null;
}

/**
 * GET proxy from Next Route Handler to Express API with X-User-Id.
 * @param {string} apiPath - e.g. /api/wallets or /api/wallets?_t=123
 */
export async function proxyBackendGet(apiPath, userId) {
  const bad = misconfiguredOnVercel();
  if (bad) {
    return NextResponse.json({ error: 'Server configuration', detail: bad }, { status: 503 });
  }

  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  let res;
  try {
    res = await fetch(joinBackendUrl(path), {
      headers: { 'X-User-Id': userId },
      cache: 'no-store',
    });
  } catch (e) {
    const msg = e?.message || String(e);
    return NextResponse.json(
      {
        error: 'Backend unreachable',
        message: msg,
        hint: 'Check BACKEND_URL / NEXT_PUBLIC_API_URL and that the API is deployed.',
      },
      { status: 502 },
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}

/**
 * PATCH proxy to Express API with X-User-Id and JSON body.
 */
export async function proxyBackendPatch(apiPath, userId, body) {
  const bad = misconfiguredOnVercel();
  if (bad) {
    return NextResponse.json({ error: 'Server configuration', detail: bad }, { status: 503 });
  }

  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  let res;
  try {
    res = await fetch(joinBackendUrl(path), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: body != null ? JSON.stringify(body) : '{}',
      cache: 'no-store',
    });
  } catch (e) {
    const msg = e?.message || String(e);
    return NextResponse.json(
      {
        error: 'Backend unreachable',
        message: msg,
        hint: 'Check BACKEND_URL / NEXT_PUBLIC_API_URL and that the API is deployed.',
      },
      { status: 502 },
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}

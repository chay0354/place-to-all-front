import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const COMING_SOON_HOSTS = new Set(['placetoallwallet.com', 'www.placetoallwallet.com']);

function requestHostname(request) {
  const raw = request.headers.get('host') || '';
  return raw.split(',')[0].trim().split(':')[0].toLowerCase();
}

/**
 * placetoallwallet.com is the public domain and only shows the coming soon screen.
 * The app itself stays on the Vercel domain.
 */
function comingSoonResponse(request) {
  const { pathname } = request.nextUrl;
  const onPublicDomain = COMING_SOON_HOSTS.has(requestHostname(request));

  if (onPublicDomain) {
    if (pathname === '/coming-soon') return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = '/coming-soon';
    url.search = '';
    return NextResponse.rewrite(url);
  }

  if (pathname === '/coming-soon') {
    if (process.env.NODE_ENV === 'development') return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return null;
}

/**
 * Refreshes Supabase auth cookies on each request so API routes and relay see a valid session.
 * Without this, cookies.get-only setups often yield null getUser() → 401 / broken profile after deploy.
 *
 * Never throws: a bad session refresh must not turn into a 500 for unrelated routes.
 */
export async function middleware(request) {
  const gated = comingSoonResponse(request);
  if (gated) return gated;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return response;
  }

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    await supabase.auth.getUser();
  } catch (err) {
    console.error('[middleware] Supabase session refresh failed:', err?.message || err);
    response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Skip all of /_next/* (includes webpack-hmr WebSocket upgrades — middleware there breaks dev with
     * "Cannot read properties of undefined (reading 'bind')" on setHeader).
     * Skip static assets by extension.
     */
    '/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

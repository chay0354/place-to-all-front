import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Refreshes Supabase auth cookies on each request so API routes and relay see a valid session.
 * Without this, cookies.get-only setups often yield null getUser() → 401 / broken profile after deploy.
 *
 * Never throws: a bad session refresh must not turn into a 500 for unrelated routes.
 */
export async function middleware(request) {
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

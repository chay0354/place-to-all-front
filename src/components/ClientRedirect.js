'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client-side redirect used instead of next/navigation's server `redirect()`.
 *
 * Server `redirect()` during a streamed render triggers a production-only React #310
 * ("Rendered more hooks than during the previous render") inside Next's internal Router
 * `useMemo`, a race condition that crashes the app on slower devices (notably iOS Safari).
 * Redirecting after hydration with `router.replace` avoids the streamed-redirect path.
 * See vercel/next.js #63121 / #78396.
 */
export function ClientRedirect({ path }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(path);
  }, [path, router]);
  return null;
}

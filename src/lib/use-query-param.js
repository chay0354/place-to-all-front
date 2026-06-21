'use client';

import { useEffect, useState } from 'react';

/**
 * Read URL query params on the client only.
 *
 * Deliberately avoids next/navigation's `useSearchParams`, which opts the page into the
 * CSR-bailout + Suspense streaming path. In Next 14 that path triggers a production-only
 * React #310 ("Rendered more hooks than during the previous render") inside the App Router
 * during streamed hydration — a race condition that surfaces on slower devices (notably iOS
 * Safari) while working fine on desktop. See vercel/next.js #63388 / #78396.
 *
 * State starts empty so the server-rendered shell and the first client render match (no
 * hydration mismatch), then the real values are filled in after mount.
 */
function readParams() {
  if (typeof window === 'undefined') return new URLSearchParams('');
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return new URLSearchParams('');
  }
}

export function useClientSearchParams() {
  const [params, setParams] = useState(() => new URLSearchParams(''));
  useEffect(() => {
    setParams(readParams());
    const onPop = () => setParams(readParams());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return params;
}

export function useQueryParam(key) {
  const params = useClientSearchParams();
  return params.get(key);
}

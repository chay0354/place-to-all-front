'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** Supabase falls back to the site root when a reset link's path is not allow-listed. */
export function RecoveryRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === '/reset-password') return;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const search = window.location.search;
    const recoveryHash = hash.get('type') === 'recovery' && hash.get('access_token') && hash.get('refresh_token');
    const codeOnHome = pathname === '/' && new URLSearchParams(search).get('code');
    if (!recoveryHash && !codeOnHome) return;
    router.replace(`/reset-password${search}${window.location.hash}`);
  }, [pathname, router]);

  return null;
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { DashScreenHeader } from '@/components/DashScreenHeader';import { getSelectedCardIndex, parseCardIndexParam } from '@/lib/card-mock-state';

export function useActiveCardIndex(userId) {
  const [cardIndex, setCardIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('card');
    if (fromUrl != null) {
      setCardIndex(parseCardIndexParam(fromUrl));
      return;
    }
    if (userId) setCardIndex(getSelectedCardIndex(userId));
  }, [userId]);

  return cardIndex;
}

export function useCardUser(nextPath) {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }
      setUserId(user.id);
      setLoading(false);
    });
  }, [router, nextPath]);

  return { userId, loading };
}

export function CardSubScreen({ title, children }) {
  return (
    <div className="card-sub-screen dash-screen">
      <DashScreenHeader title={title} backHref="/dashboard/card" backLabel="Back to cards" />
      {children}
    </div>
  );
}

export function CardSubScreenLoader({ nextPath, children }) {
  const { userId, loading } = useCardUser(nextPath);
  if (loading || !userId) return <AppLoadingScreen />;
  return children(userId);
}

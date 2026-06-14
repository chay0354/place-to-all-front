'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getProfile } from '@/lib/api';
import { hasQuickPin, verifyQuickPin } from '@/lib/quick-pin';
import { clearPinUnlocked, isPinUnlocked, setPinUnlocked } from '@/lib/quick-pin-session';

export function PinUnlockGate({ children }) {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [pinRequired, setPinRequired] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setReady(true);
          router.replace('/login');
        }
        return;
      }

      if (!cancelled) setUserId(user.id);

      if (isPinUnlocked(user.id)) {
        if (!cancelled) {
          setUnlocked(true);
          setPinRequired(false);
          setReady(true);
        }
        return;
      }

      try {
        const profile = await getProfile();
        const needsPin = hasQuickPin(profile);
        if (!cancelled) {
          setPinRequired(needsPin);
          setUnlocked(!needsPin);
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setPinRequired(false);
          setUnlocked(true);
          setReady(true);
        }
      }
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const id = session?.user?.id;
      if (event === 'SIGNED_OUT') {
        if (id) clearPinUnlocked(id);
        setUserId(null);
        setUnlocked(false);
        setPinRequired(false);
        setReady(false);
        router.replace('/login');
        return;
      }
      if (event === 'SIGNED_IN' && id) {
        clearPinUnlocked(id);
        setUnlocked(false);
        setPinRequired(false);
        setReady(false);
        load();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (pin.length !== 6 || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await verifyQuickPin(pin);
      if (userId) setPinUnlocked(userId);
      setUnlocked(true);
      setPinRequired(false);
      setPin('');
    } catch (err) {
      setError(err?.message || 'Incorrect passkey');
      setPin('');
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="pin-unlock pin-unlock--loading">
        <p className="pin-unlock-loading-text">Loading…</p>
      </div>
    );
  }

  if (!unlocked && pinRequired) {
    return (
      <div className="pin-unlock">
        <div className="pin-unlock-card">
          <div className="pin-unlock-icon" aria-hidden>
            <LockArt />
          </div>
          <h1 className="pin-unlock-title">Enter your passkey</h1>
          <p className="pin-unlock-lead">Your passkey is required to open your account.</p>
          <form onSubmit={handleSubmit} className="pin-unlock-form">
            <input
              className="pin-unlock-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="current-password"
              autoFocus
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-label="6-digit passkey"
            />
            {error && <p className="pin-unlock-error">{error}</p>}
            <button type="submit" className="pin-unlock-submit" disabled={pin.length !== 6 || submitting}>
              {submitting ? 'Checking…' : 'Continue'}
            </button>
          </form>
          <form action="/auth/signout" method="POST" className="pin-unlock-signout-form">
            <button type="submit" className="pin-unlock-signout">
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
}

function LockArt() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

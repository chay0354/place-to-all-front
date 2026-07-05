'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { getMockCard } from '@/lib/mock-card';

export function CardSettingsClient() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login?next=%2Fdashboard%2Fcard%2Fsettings');
        return;
      }
      setUserId(user.id);
      setLoading(false);
    });
  }, [router]);

  const card = useMemo(() => (userId ? getMockCard(userId) : null), [userId]);

  if (loading || !card) return <AppLoadingScreen />;

  return (
    <div className="card-settings-screen">
      <header className="card-settings-header">
        <Link href="/dashboard/card" className="card-settings-back" aria-label="Back to cards">
          <BackIcon />
        </Link>
        <h1 className="card-settings-title">Settings</h1>
      </header>

      <Link href="/dashboard/card" className="card-settings-preview-row">
        <span className="card-settings-preview-thumb" aria-hidden />
        <span className="card-settings-preview-label">Virtual card {card.card_masked}</span>
        <ChevronIcon />
      </Link>

      <p className="card-settings-section-label">Manage card</p>
      <div className="card-settings-group">
        <button type="button" className="card-settings-row">
          <span className="card-settings-row-icon">
            <SettingsIcon />
          </span>
          <span className="card-settings-row-body">
            <span className="card-settings-row-title">Security settings</span>
            <span className="card-settings-row-sub">Control which transaction types and currencies are allowed</span>
          </span>
          <ChevronIcon />
        </button>
        <button type="button" className="card-settings-row">
          <span className="card-settings-row-icon">
            <PinIcon />
          </span>
          <span className="card-settings-row-body">
            <span className="card-settings-row-title">Change billing address</span>
            <span className="card-settings-row-sub">{card.billing_address}</span>
          </span>
          <ChevronIcon />
        </button>
        <button type="button" className="card-settings-row">
          <span className="card-settings-row-icon">
            <EditIcon />
          </span>
          <span className="card-settings-row-body">
            <span className="card-settings-row-title">Card label</span>
            <span className="card-settings-row-sub">Add an optional name for this card</span>
          </span>
          <ChevronIcon />
        </button>
      </div>

      <p className="card-settings-section-label">Card actions</p>
      <div className="card-settings-group">
        <button type="button" className="card-settings-row card-settings-row--danger">
          <span className="card-settings-row-icon">
            <TrashIcon />
          </span>
          <span className="card-settings-row-body">
            <span className="card-settings-row-title">Delete card</span>
            <span className="card-settings-row-sub">Deactivate this card permanently</span>
          </span>
          <ChevronIcon />
        </button>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="card-settings-chevron">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPublicPaymentLink } from '@/lib/api';

export default function PayLinkPage() {
  const params = useParams();
  const token = params?.token || '';
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) return;
    getPublicPaymentLink(token)
      .then(setData)
      .catch((e) => setErr(e.message || 'Could not load payment link'));
  }, [token]);

  const payNowHref = useMemo(() => {
    if (!data?.agentUserId || !token) return null;
    const q = new URLSearchParams({ payTo: data.agentUserId, payToken: token });
    return `/dashboard/buy?${q.toString()}`;
  }, [data, token]);

  return (
    <div className="app-dark" style={{ minHeight: '100vh', padding: '1.5rem' }}>
      <main style={{ maxWidth: 440, margin: '2rem auto' }} className="auth-card">
        <h1 className="auth-title" style={{ fontSize: '1.35rem' }}>Pay with crypto</h1>
        {err && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{err}</div>}
        {!err && !data && <p className="auth-sub">Loading…</p>}
        {data && (
          <>
            <p className="auth-sub" style={{ marginTop: '0.5rem' }}>
              {data.title || 'Someone requested a payment'}
            </p>
            <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--dash-card-hover, #21262d)', borderRadius: 12, fontSize: '0.9375rem' }}>
              <div><strong>Asset:</strong> {data.currency}</div>
              {data.amount != null && Number(data.amount) > 0 && (
                <div style={{ marginTop: '0.35rem' }}><strong>Amount:</strong> {String(data.amount)} {data.currency}</div>
              )}
              {!data.amount && <div style={{ marginTop: '0.35rem', color: 'var(--dash-muted)' }}>Amount is flexible — choose when you pay.</div>}
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--dash-muted)', marginTop: '1.5rem', marginBottom: '1rem' }}>
              For now this uses a simulated payment (no real card charge). Sign in if prompted, then confirm on the next screen.
            </p>
            {payNowHref ? (
              <Link href={payNowHref} className="btn btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', width: '100%' }}>
                Continue to pay
              </Link>
            ) : (
              <p className="alert alert-error" style={{ marginTop: '0.5rem' }}>This link is missing payment details.</p>
            )}
          </>
        )}
        <p style={{ marginTop: '2rem', fontSize: '0.8125rem' }}>
          <Link href="/" style={{ color: 'var(--dash-accent)' }}>← Home</Link>
        </p>
      </main>
    </div>
  );
}

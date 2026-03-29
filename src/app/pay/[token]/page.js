'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getPublicPaymentLink, simulatePublicPaymentLink, getCoinbasePrice, getCoinbaseSellQuote } from '@/lib/api';

function PayLinkPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = params?.token || '';
  const thankyou = searchParams.get('thankyou') === '1';

  const [linkData, setLinkData] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [flexAmount, setFlexAmount] = useState('');
  const [usdHint, setUsdHint] = useState(null);
  const [payErr, setPayErr] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!token) return;
    getPublicPaymentLink(token)
      .then(setLinkData)
      .catch((e) => setLoadErr(e.message || 'Could not load payment link'));
  }, [token]);

  const fixedAmount =
    linkData?.amount != null && Number(linkData.amount) > 0 ? Number(linkData.amount) : null;
  const currency = linkData?.currency ? String(linkData.currency).toUpperCase() : '';
  const effectiveCrypto = fixedAmount ?? (Number(flexAmount) > 0 ? Number(flexAmount) : 0);

  useEffect(() => {
    if (!(effectiveCrypto > 0) || !currency) {
      setUsdHint(null);
      return;
    }
    getCoinbaseSellQuote(effectiveCrypto, currency, 'USD')
      .then((q) => {
        const usd = q.estimated_fiat ?? q.fiat_amount ?? q.total_fiat;
        setUsdHint(usd != null ? Number(usd) : null);
      })
      .catch(async () => {
        try {
          const { priceUsd } = await getCoinbasePrice(currency);
          setUsdHint(effectiveCrypto * priceUsd);
        } catch {
          setUsdHint(null);
        }
      });
  }, [effectiveCrypto, currency]);

  const handlePay = useCallback(async () => {
    setPayErr('');
    if (!token) {
      setPayErr('Invalid payment link.');
      return;
    }
    if (!(effectiveCrypto > 0)) {
      setPayErr(fixedAmount == null ? 'Enter an amount greater than 0.' : 'This link needs a valid amount.');
      return;
    }

    setPaying(true);
    try {
      const body = fixedAmount == null ? { amount: effectiveCrypto } : {};
      await simulatePublicPaymentLink(token, body);
      router.replace(`/pay/${encodeURIComponent(token)}?thankyou=1`);
      router.refresh();
    } catch (err) {
      setPayErr(err?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  }, [token, effectiveCrypto, fixedAmount]);

  if (thankyou) {
    return (
      <div className="app-dark" style={{ minHeight: '100vh', padding: '1.5rem' }}>
        <main style={{ maxWidth: 440, margin: '2rem auto', textAlign: 'center' }} className="auth-card">
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 1.25rem',
              borderRadius: '50%',
              background: 'var(--success-muted, rgba(46, 160, 67, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
            }}
            aria-hidden
          >
            ✓
          </div>
          <h1 className="auth-title" style={{ fontSize: '1.5rem' }}>
            Thank you for your payment
          </h1>
          <p className="auth-sub" style={{ marginTop: '0.75rem', lineHeight: 1.5 }}>
            Your payment was recorded successfully. The recipient has been credited in the app. The platform admin fee
            was applied. No account was required for this payment.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.75rem' }}>
            <Link href="/" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', width: '100%' }}>
              Home
            </Link>
            <Link href="/login" style={{ color: 'var(--dash-accent)', fontSize: '0.9375rem' }}>
              Sign in to your wallet
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-dark" style={{ minHeight: '100vh', padding: '1.5rem' }}>
      <main style={{ maxWidth: 440, margin: '2rem auto' }} className="auth-card">
        <h1 className="auth-title" style={{ fontSize: '1.35rem' }}>Pay with crypto</h1>
        {loadErr && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{loadErr}</div>}
        {!loadErr && !linkData && <p className="auth-sub">Loading…</p>}
        {linkData && (
          <>
            <p className="auth-sub" style={{ marginTop: '0.5rem' }}>
              {linkData.title || 'Someone requested a payment'}
            </p>
            <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--dash-card-hover, #21262d)', borderRadius: 12, fontSize: '0.9375rem' }}>
              <div><strong>Asset:</strong> {linkData.currency}</div>
              {fixedAmount != null && (
                <div style={{ marginTop: '0.35rem' }}><strong>Amount:</strong> {String(fixedAmount)} {linkData.currency}</div>
              )}
              {fixedAmount == null && (
                <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                  <label className="form-label" htmlFor="pay-flex-amount">Amount ({linkData.currency})</label>
                  <input
                    id="pay-flex-amount"
                    type="number"
                    step="any"
                    min="0"
                    className="form-input"
                    value={flexAmount}
                    onChange={(e) => setFlexAmount(e.target.value)}
                    placeholder="e.g. 25"
                  />
                </div>
              )}
              {effectiveCrypto > 0 && usdHint != null && (
                <div style={{ marginTop: '0.5rem', color: 'var(--dash-muted)', fontSize: '0.8125rem' }}>
                  ≈{' '}
                  {usdHint.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} USD (estimate)
                </div>
              )}
            </div>

            <div className="alert alert-success" style={{ marginTop: '1rem', borderRadius: 12, fontSize: '0.8125rem' }}>
              Demo: tap Pay — no sign-in. We simulate a successful payment, credit the recipient, take the platform fee,
              then close this link so it cannot be reused.
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              {payErr && <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{payErr}</div>}
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={paying || !(effectiveCrypto > 0)}
                onClick={handlePay}
              >
                {paying ? 'Processing…' : 'Pay'}
              </button>
            </div>
          </>
        )}
        <p style={{ marginTop: '2rem', fontSize: '0.8125rem' }}>
          <Link href="/" style={{ color: 'var(--dash-accent)' }}>← Home</Link>
        </p>
      </main>
    </div>
  );
}

function PayLinkFallback() {
  return (
    <div className="app-dark" style={{ minHeight: '100vh', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p className="auth-sub">Loading…</p>
    </div>
  );
}

export default function PayLinkPage() {
  return (
    <Suspense fallback={<PayLinkFallback />}>
      <PayLinkPageInner />
    </Suspense>
  );
}

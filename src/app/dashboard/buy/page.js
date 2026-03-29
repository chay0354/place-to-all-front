'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { buyCrypto, getCoinbaseSellQuote, getCoinbasePrice, getCoinbaseCurrencies, getPublicPaymentLink } from '@/lib/api';
import { toRelayUrl } from '@/lib/relay-url';

/** Coinbase-supported buyable codes — used if buy API is unavailable. */
const BUYABLE_CODES = new Set([
  'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'MATIC', 'LTC', 'AVAX', 'LINK', 'UNI', 'ATOM', 'XLM', 'ALGO', 'FIL', 'VET', 'TRX', 'NEAR', 'APT', 'ARB', 'OP', 'INJ', 'IMX',
  'USDT', 'USDC', 'DAI', 'BNB', 'SHIB', 'PEPE', 'FLOKI', 'CRO', 'FTM', 'AAVE', 'SUSHI', 'COMP', 'MKR', 'GRT', 'SNX', 'CRV', 'BAT', 'ENJ', 'MANA', 'SAND', 'AXS', 'LRC', 'CELO',
]);

async function loadBuyableCurrencies() {
  try {
    const res = await fetch(toRelayUrl('/api/coinbase/currencies/buy'), { credentials: 'include' });
    const data = await res.json();
    const list = data.currencies || [];
    return Array.isArray(list) ? list.map((c) => (typeof c === 'string' ? c : c?.code)).filter(Boolean) : [];
  } catch (_) {}
  const all = await getCoinbaseCurrencies();
  const codes = (all || []).map((c) => (typeof c === 'string' ? c : c?.code)).filter(Boolean);
  return codes.filter((c) => BUYABLE_CODES.has(String(c).toUpperCase()));
}

function BuyPageContent() {
  const [currencies, setCurrencies] = useState([]);
  const [currency, setCurrency] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usdFromCrypto, setUsdFromCrypto] = useState(null);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    loadBuyableCurrencies()
      .then((codes) => {
        setCurrencies(codes.length ? codes : ['BTC', 'SOL', 'USDT', 'USDC']);
        if (codes.length && !codes.some((c) => String(c).toUpperCase() === String(currency).toUpperCase())) {
          setCurrency(codes.includes('BTC') ? 'BTC' : codes[0]);
        }
      })
      .catch(() => setCurrencies(['BTC', 'SOL', 'USDT', 'USDC']));
  }, []);

  const buyQueryKey = searchParams.toString();
  const payTo = searchParams.get('payTo') || '';
  const payToken = searchParams.get('payToken') || '';

  useEffect(() => {
    if (payTo && payToken) {
      router.replace(`/pay/${encodeURIComponent(payToken)}`);
    }
  }, [router, payTo, payToken]);

  useEffect(() => {
    if (payTo && payToken) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        const returnTo = buyQueryKey ? `/dashboard/buy?${buyQueryKey}` : '/dashboard/buy';
        router.push(`/login?next=${encodeURIComponent(returnTo)}`);
        return;
      }
      setUserId(user.id);
      supabase.auth.getSession().then(({ data: { session } }) => setToken(session?.access_token));
    });
  }, [router, buyQueryKey, payTo, payToken]);

  const isPaymentLinkCheckout = Boolean(payTo && payToken);

  useEffect(() => {
    if (searchParams.get('rapyd') === 'error') setError('Rapyd payment was cancelled or failed.');
    if (searchParams.get('rapyd') === 'success') setError('');
  }, [searchParams]);

  useEffect(() => {
    if (!payToken) return;
    getPublicPaymentLink(payToken)
      .then((d) => {
        if (d?.currency) setCurrency(String(d.currency).toUpperCase());
        if (d?.amount != null && Number(d.amount) > 0) setAmount(String(d.amount));
      })
      .catch(() => {});
  }, [payToken]);

  useEffect(() => {
    const cryptoNum = Number(amount);
    if (cryptoNum > 0 && currency) {
      getCoinbaseSellQuote(cryptoNum, currency, 'USD')
        .then((q) => {
          const usd = q.estimated_fiat ?? q.fiat_amount ?? q.total_fiat;
          setUsdFromCrypto(usd != null ? usd : null);
        })
        .catch(async () => {
          try {
            const { priceUsd } = await getCoinbasePrice(currency);
            setUsdFromCrypto(cryptoNum * priceUsd);
          } catch {
            setUsdFromCrypto(null);
          }
        });
    } else {
      setUsdFromCrypto(null);
    }
  }, [amount, currency]);

  async function handleInstantTest(e) {
    e?.preventDefault?.();
    setError('');
    if (!userId) {
      setError('Please log in.');
      return;
    }
    let fiatNum = 0;
    const cryptoNum = Number(amount);
    if (isPaymentLinkCheckout && !(cryptoNum > 0)) {
      setError('This payment link needs a valid amount. Reload the page or open the link again.');
      return;
    }
    if (cryptoNum > 0) {
      fiatNum = usdFromCrypto != null ? Number(usdFromCrypto) : 0;
      if (!(fiatNum > 0)) {
        try {
          const { priceUsd } = await getCoinbasePrice(currency);
          fiatNum = cryptoNum * priceUsd;
        } catch (_) {
          setError('Could not get price. Try again.');
          return;
        }
      }
    } else {
      fiatNum = 10;
    }
    setLoading(true);
    try {
      const body = { currency, instant_test: true };
      if (cryptoNum > 0) {
        body.amount = cryptoNum;
        body.fiatAmount = fiatNum;
      } else {
        body.fiatAmount = fiatNum;
      }
      if (isPaymentLinkCheckout) {
        body.beneficiaryUserId = payTo;
        body.paymentLinkToken = payToken;
      }
      await buyCrypto(userId, body, token);
      if (isPaymentLinkCheckout && payToken) {
        router.push(`/pay/${encodeURIComponent(payToken)}?thankyou=1`);
      } else {
        router.push(`/dashboard?r=${Date.now()}`);
      }
      router.refresh();
    } catch (err) {
      const msg = err.response?.error || err.message || 'Buy failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!userId) return null;

  return (
    <div className="page">
      <Link href="/dashboard" className="back-link">← Back to portfolio</Link>
        <h1 className="page-title">{isPaymentLinkCheckout ? 'Complete payment' : 'Buy crypto'}</h1>
        <p className="page-desc">
          {isPaymentLinkCheckout
            ? 'Confirm the asset and amount, then use Pay now to simulate a successful payment. The recipient is credited on the ledger (demo).'
            : 'Choose asset and amount for an estimate, then use instant test to simulate a buy (development).'}
        </p>
        {isPaymentLinkCheckout && (
          <div className="alert alert-success" style={{ margin: '0 0 1rem', borderRadius: 12 }}>
            Demo mode: Pay now does not charge a real card — it records a simulated payment and credits the recipient in the app.
          </div>
        )}

        <div className="card card-lg">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label className="form-label">Asset</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="form-select"
              >
                {currencies.length === 0 && <option value="USDT">USDT</option>}
                {currencies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className="form-hint">
                {isPaymentLinkCheckout ? 'Credited to the recipient’s ledger after payment.' : 'Coinbase-supported assets — credited to your ledger after payment'}
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="form-input"
              />
              {usdFromCrypto != null && Number(amount) > 0 && (
                <div className="quote-box">
                  ≈ <strong>{typeof usdFromCrypto === 'number' ? usdFromCrypto.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : usdFromCrypto}</strong> USD
                </div>
              )}
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="action-row">
              <button
                type="button"
                onClick={handleInstantTest}
                disabled={loading || !currency}
                className="btn btn-primary"
              >
                {loading ? '…' : isPaymentLinkCheckout ? 'Pay now (simulated)' : 'Instant test (dev)'}
              </button>
            </div>
          </form>
        </div>
    </div>
  );
}

function BuyFallback() {
  return (
    <div className="page" style={{ padding: '2rem 1.25rem', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  );
}

export default function BuyPage() {
  return (
    <Suspense fallback={<BuyFallback />}>
      <BuyPageContent />
    </Suspense>
  );
}

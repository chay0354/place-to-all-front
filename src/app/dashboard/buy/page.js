'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClientSearchParams } from '@/lib/use-query-param';
import { createClient } from '@/lib/supabase/client';
import {
  buyCrypto,
  getCoinbaseBuyQuote,
  getCoinbasePrice,
  getCoinbaseCurrencies,
  getPublicPaymentLink,
  getMoonPayUrl,
  getMoonPayPaymentLinkUrl,
} from '@/lib/api';
import { toRelayUrl } from '@/lib/relay-url';
import { BuyProviderList } from '@/components/BuyProviderList';
import { CoinIcon } from '@/components/CoinIcon';
import { assetLabel, assetNetwork } from '@/lib/asset-names';
import { fiatToUsd, getDisplayCurrency, payCurrencyLabel, setCurrencyReturnPath } from '@/lib/display-currency';

/** Coinbase-supported buyable codes — used if buy API is unavailable. */
const BUYABLE_CODES = new Set([
  'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'MATIC', 'LTC', 'AVAX', 'LINK', 'UNI', 'ATOM', 'XLM', 'ALGO', 'FIL', 'VET', 'TRX', 'NEAR', 'APT', 'ARB', 'OP', 'INJ', 'IMX',
  'USDT', 'USDC', 'DAI', 'BNB', 'SHIB', 'PEPE', 'FLOKI', 'CRO', 'FTM', 'AAVE', 'SUSHI', 'COMP', 'MKR', 'GRT', 'SNX', 'CRV', 'BAT', 'ENJ', 'MANA', 'SAND', 'AXS', 'LRC', 'CELO',
]);

const PAY_CURRENCY_RETURN = '/dashboard/buy';

function formatCryptoReceive(amount, code) {
  const n = Number(amount);
  const ticker = String(code || '').toUpperCase() || '—';
  if (!(n > 0)) return `0 ${ticker}`;
  const formatted = n
    .toFixed(8)
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '');
  return `${formatted} ${ticker}`;
}

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
  const [fiatAmount, setFiatAmount] = useState('100');
  const [payCurrency, setPayCurrency] = useState('USD');
  const [assetOpen, setAssetOpen] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cryptoEstimate, setCryptoEstimate] = useState(null);
  const [coinImage, setCoinImage] = useState('');
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [moonPayLoading, setMoonPayLoading] = useState(false);
  const assetRef = useRef(null);
  const router = useRouter();
  const searchParams = useClientSearchParams();

  useEffect(() => {
    setPayCurrency(getDisplayCurrency());
    const sync = () => setPayCurrency(getDisplayCurrency());
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', sync);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, []);

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
        if (d?.amount != null && Number(d.amount) > 0) {
          setFiatAmount(String(d.amount));
        }
      })
      .catch(() => {});
  }, [payToken]);

  useEffect(() => {
    const fiatNum = Number(fiatAmount);
    if (!(fiatNum > 0) || !currency) {
      setCryptoEstimate(null);
      return;
    }
    getCoinbaseBuyQuote(fiatNum, currency, payCurrency)
      .then((q) => {
        const crypto = q.crypto_amount ?? q.amount ?? q.estimated_crypto;
        setCryptoEstimate(crypto != null ? Number(crypto) : null);
      })
      .catch(async () => {
        try {
          const { priceUsd } = await getCoinbasePrice(currency);
          const usd = fiatToUsd(fiatNum, payCurrency);
          setCryptoEstimate(priceUsd > 0 ? usd / priceUsd : null);
        } catch {
          setCryptoEstimate(null);
        }
      });
  }, [fiatAmount, currency, payCurrency]);

  useEffect(() => {
    if (!currency) {
      setCoinImage('');
      return;
    }
    const ac = new AbortController();
    fetch(`/api/coingecko/prices?symbols=${encodeURIComponent(currency)}`, { signal: ac.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => {
        const img = d?.images?.[String(currency).toUpperCase()];
        setCoinImage(img && String(img).startsWith('http') ? img : '');
      })
      .catch(() => setCoinImage(''));
    return () => ac.abort();
  }, [currency]);

  useEffect(() => {
    if (!assetOpen) return;
    function onPointerDown(e) {
      if (assetRef.current && !assetRef.current.contains(e.target)) {
        setAssetOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [assetOpen]);

  function handleCheckPrice(e) {
    e?.preventDefault?.();
    setError('');
    const fiatNum = Number(fiatAmount);
    if (!(fiatNum > 0)) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (!currency) {
      setError('Select a crypto asset.');
      return;
    }
    setShowQuotes(true);
  }

  async function handleInstantTest(e) {
    e?.preventDefault?.();
    setError('');
    if (!userId) {
      setError('Please log in.');
      return;
    }
    const fiatNum = Number(fiatAmount);
    let cryptoNum = cryptoEstimate != null ? Number(cryptoEstimate) : 0;
    if (isPaymentLinkCheckout && !(fiatNum > 0)) {
      setError('This payment link needs a valid amount. Reload the page or open the link again.');
      return;
    }
    if (!(fiatNum > 0)) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (!(cryptoNum > 0)) {
      try {
        const { priceUsd } = await getCoinbasePrice(currency);
        cryptoNum = fiatNum / priceUsd;
      } catch (_) {
        setError('Could not get price. Try again.');
        return;
      }
    }
    setLoading(true);
    try {
      const body = {
        currency,
        instant_test: true,
        amount: cryptoNum,
        fiatAmount: fiatNum,
      };
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

  async function handleMoonPay() {
    setError('');
    const fiatNum = Number(fiatAmount);
    if (!(fiatNum > 0)) {
      setError('Enter an amount greater than 0 before opening MoonPay.');
      return;
    }

    let cryptoNum = cryptoEstimate != null && Number(cryptoEstimate) > 0 ? Number(cryptoEstimate) : null;
    if (!(cryptoNum > 0)) {
      try {
        const { priceUsd } = await getCoinbasePrice(currency);
        cryptoNum = fiatNum / priceUsd;
      } catch {
        setError('Could not estimate crypto for this amount. Try again or wait for the quote.');
        return;
      }
    }

    setMoonPayLoading(true);
    try {
      let data;
      if (isPaymentLinkCheckout) {
        if (!payToken) {
          setError('Missing payment link.');
          return;
        }
        data = await getMoonPayPaymentLinkUrl(payToken, {
          baseCurrencyAmount: fiatNum,
          quoteCurrencyAmount: cryptoNum,
        });
      } else {
        if (!userId || !token) {
          setError('Please log in.');
          return;
        }
        data = await getMoonPayUrl(
          userId,
          {
            currencyCode: String(currency || 'eth').toLowerCase(),
            baseCurrencyCode: payCurrency.toLowerCase(),
            baseCurrencyAmount: fiatNum,
            quoteCurrencyAmount: cryptoNum,
          },
          token,
        );
      }
      const url = data?.url;
      if (!url) {
        setError('MoonPay did not return a checkout URL.');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const msg = err.response?.error || err.message || 'Could not start MoonPay';
      setError(msg);
    } finally {
      setMoonPayLoading(false);
    }
  }

  if (!userId) return null;

  const fiatNum = Number(fiatAmount);
  const usdEquivalent = fiatToUsd(fiatNum, payCurrency);
  const youGetAmount = formatCryptoReceive(cryptoEstimate, currency);

  return (
    <div className="page buy-page">
      {isPaymentLinkCheckout && (
        <div className="alert alert-success buy-page-alert">
          Demo mode: Pay now does not charge a real card — it records a simulated payment and credits the recipient in the app.
        </div>
      )}

      <div className="buy-crypto-card">
        <h1 className="buy-crypto-title">{isPaymentLinkCheckout ? 'Complete payment' : 'Buy crypto'}</h1>

        <form className="buy-crypto-form" onSubmit={handleCheckPrice}>
          <div className="buy-crypto-field">
            <span className="buy-crypto-field-label">You pay</span>
            <div className="buy-pay-row">
              <input
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                placeholder="0"
                value={fiatAmount}
                onChange={(e) => {
                  setFiatAmount(e.target.value);
                  setShowQuotes(false);
                }}
                className="buy-pay-input"
                aria-label="Amount to pay"
              />
              <div className="buy-pay-currency-wrap">
                <Link
                  href="/dashboard/currency"
                  className="buy-pay-currency"
                  aria-label="Select pay currency"
                  onClick={() => setCurrencyReturnPath(PAY_CURRENCY_RETURN)}
                >
                  <span>{payCurrencyLabel(payCurrency)}</span>
                  <ChevronDownIcon />
                </Link>
              </div>
            </div>
          </div>

          <div className="buy-crypto-field">
            <span className="buy-crypto-field-label">You get</span>
            <div className="buy-get-wrap" ref={assetRef}>
              <button
                type="button"
                className="buy-get-selector"
                aria-haspopup="listbox"
                aria-expanded={assetOpen}
                onClick={() => setAssetOpen((v) => !v)}
              >
                <span className="buy-get-icon">
                  <CoinIcon code={currency} imageUrl={coinImage} sizeClass="buy-get-coin-icon" />
                </span>
                <span className="buy-get-text">
                  <span className="buy-get-name">{assetLabel(currency)}</span>
                  <span className="buy-get-amount">{youGetAmount}</span>
                </span>
                <span className="buy-get-meta">
                  <span className="buy-get-network">{assetNetwork(currency)}</span>
                  <ChevronDownIcon className="buy-get-chevron" />
                </span>
              </button>
              {assetOpen && (
                <ul className="buy-asset-menu" role="listbox" aria-label="Crypto asset">
                  {currencies.length === 0 && (
                    <li>
                      <button type="button" className="buy-asset-option buy-asset-option--active">USDT</button>
                    </li>
                  )}
                  {currencies.map((c) => {
                    const code = String(c).toUpperCase();
                    const active = code === String(currency).toUpperCase();
                    return (
                      <li key={code}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={`buy-asset-option${active ? ' buy-asset-option--active' : ''}`}
                          onClick={() => {
                            setCurrency(code);
                            setAssetOpen(false);
                            setShowQuotes(false);
                          }}
                        >
                          <span className="buy-asset-option-code">{code}</span>
                          <span className="buy-asset-option-name">{assetLabel(code)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {error && <div className="alert alert-error buy-crypto-alert">{error}</div>}

          <button
            type="submit"
            className="buy-check-btn"
            disabled={loading || moonPayLoading}
          >
            Check best price
          </button>

          {showQuotes && (
            <BuyProviderList
              currency={currency}
              usdAmount={usdEquivalent > 0 ? usdEquivalent : 100}
              cryptoAmount={cryptoEstimate}
              loadingProviderId={moonPayLoading ? 'moonpay' : null}
              disabled={loading}
              onSelectProvider={(id) => {
                if (id === 'moonpay') handleMoonPay();
              }}
            />
          )}
        </form>

        <div className="buy-card-footer">
          <button
            type="button"
            onClick={handleInstantTest}
            disabled={loading || moonPayLoading || !currency}
            className="buy-text-button"
          >
            {loading ? '…' : isPaymentLinkCheckout ? 'Pay now (simulated)' : 'Instant test (dev)'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChevronDownIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      className={className || 'buy-chevron'}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function BuyPage() {
  return <BuyPageContent />;
}

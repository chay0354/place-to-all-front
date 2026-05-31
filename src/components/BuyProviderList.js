'use client';

import { BUY_PROVIDERS, providerQuote } from '@/lib/buy-providers';
import paybisLogo from '@/assets/paybis-logo.png';

function ProviderLogo({ id }) {
  switch (id) {
    case 'paybis':
      return (
        <img src={paybisLogo.src} alt="" className="buy-provider-logo-img" width={40} height={40} draggable={false} />
      );
    case 'moonpay':
      return (
        <svg viewBox="0 0 40 40" aria-hidden className="buy-provider-logo-svg">
          <circle cx="28" cy="12" r="5" fill="#7c3aed" />
          <circle cx="20" cy="22" r="14" fill="#7c3aed" />
        </svg>
      );
    case 'transak':
      return (
        <svg viewBox="0 0 40 40" aria-hidden className="buy-provider-logo-svg">
          <circle cx="20" cy="20" r="18" fill="#0ea5e9" />
          <path d="M20 10v8M20 22v8M16 14l4-4 4 4M16 26l4 4 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );
    default:
      return <span className="buy-provider-logo-fallback" aria-hidden />;
  }
}

function Spinner() {
  return <span className="buy-provider-spinner" aria-hidden />;
}

/**
 * Provider comparison list — MoonPay is live; others show estimated net received.
 */
export function BuyProviderList({
  currency = 'USDT',
  usdAmount,
  cryptoAmount,
  loadingProviderId = null,
  disabled = false,
  onSelectProvider,
}) {
  const hasAmount = Number(cryptoAmount) > 0;
  const usd = Number(usdAmount) > 0 ? Number(usdAmount) : 100;

  return (
    <div className="buy-provider-list" role="list" aria-label="Payment providers">
      {BUY_PROVIDERS.map((provider, index) => {
        const quote = providerQuote(provider, {
          usdAmount: usd,
          cryptoAmount: hasAmount ? cryptoAmount : null,
          currency,
        });
        const isLoading = loadingProviderId === provider.id;
        const isInteractive = provider.active && !disabled && hasAmount;
        const isBest = index === 0;

        return (
          <div key={provider.id} className="buy-provider-item-wrap" role="listitem">
            <button
              type="button"
              className={[
                'buy-provider-item',
                isInteractive ? 'buy-provider-item--active' : '',
                isLoading ? 'buy-provider-item--loading' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={!isInteractive || isLoading}
              aria-busy={isLoading}
              aria-label={`${provider.name}, ${quote.label}, fees ${provider.feeSummary}`}
              onClick={() => {
                if (provider.active && isInteractive) onSelectProvider?.(provider.id);
              }}
            >
              <span className="buy-provider-logo">
                <ProviderLogo id={provider.id} />
              </span>
              <span className="buy-provider-body">
                <span className="buy-provider-name-row">
                  <span className="buy-provider-name">{provider.name.toUpperCase()}</span>
                  {isBest && <span className="buy-provider-badge">Best rate</span>}
                </span>
                <span className="buy-provider-quote">{quote.label}</span>
                <span className="buy-provider-fee">{provider.feeSummary}</span>
              </span>
              {isLoading && <Spinner />}
            </button>
          </div>
        );
      })}
      <p className="buy-provider-disclaimer">
        Estimates for card checkout; net received varies by payment method, region, and network fees.
      </p>
    </div>
  );
}

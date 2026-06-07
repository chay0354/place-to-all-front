'use client';

import { useId, useState } from 'react';

function walletIconClass(currency) {
  const c = (currency || '').toLowerCase();
  if (c === 'btc') return 'btc';
  if (c === 'eth') return 'eth';
  if (c === 'usdt') return 'usdt';
  if (c === 'usdc') return 'usdc';
  if (c === 'sol') return 'sol';
  if (c === 'bnb') return 'bnb';
  return 'other';
}

function SolanaGlyph() {
  const gid = useId().replace(/:/g, '');
  const gradId = `sol-grad-${gid}`;
  return (
    <svg className="dash-asset-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="50%" stopColor="#14F195" />
          <stop offset="100%" stopColor="#00FFA3" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradId})`}
        d="M6.5 14.5l2.2-2.2h9.6l-2.2 2.2H6.5zm0-5l2.2-2.2h9.6l-2.2 2.2H6.5zm3.3 2.5l2.2-2.2h6.3l-2.2 2.2H9.8z"
      />
    </svg>
  );
}

function BnbGlyph() {
  return (
    <svg className="dash-asset-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path fill="currentColor" d="M7.5 4.5L12 7l4.5-2.5L12 2 7.5 4.5zm9 3L12 10 5.5 7.5v5L12 15l6.5-2.5v-5zm-9 8.5L12 22l4.5-2.5L12 17l-4.5 2.5z" />
    </svg>
  );
}

/** Colored coin circles + CoinGecko logos (shared by home portfolio and market). */
export function CoinIcon({ code, currency, imageUrl, sizeClass = '' }) {
  const [imgFailed, setImgFailed] = useState(false);
  const c = (code || currency || '').toUpperCase();
  const cls = walletIconClass(c);
  const size = sizeClass ? ` ${sizeClass}` : '';

  if (imageUrl && String(imageUrl).startsWith('http') && !imgFailed) {
    return (
      <span className={`dash-asset-icon dash-asset-icon--rich dash-asset-icon--photo${size}`} aria-hidden>
        <img
          src={imageUrl}
          alt=""
          className="dash-asset-icon-img"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  let inner;
  if (c === 'BTC') inner = <span className="dash-asset-icon-glyph">₿</span>;
  else if (c === 'ETH') inner = <span className="dash-asset-icon-glyph">Ξ</span>;
  else if (c === 'USDC') inner = <span className="dash-asset-icon-glyph">$</span>;
  else if (c === 'USDT') inner = <span className="dash-asset-icon-glyph">₮</span>;
  else if (c === 'SOL') inner = <SolanaGlyph />;
  else if (c === 'BNB') inner = <BnbGlyph />;
  else inner = <span className="dash-asset-icon-glyph">{(c || '?').slice(0, 1)}</span>;

  return (
    <span className={`dash-asset-icon dash-asset-icon--rich dash-asset-icon--${cls}${size}`} aria-hidden>
      {inner}
    </span>
  );
}

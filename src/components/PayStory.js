'use client';

import { useEffect, useState } from 'react';
import appIcon from '@/app/icon.png';

const BEATS = [
  {
    title: 'Make a payment link',
    text: 'Pick Bitcoin, Ethereum, USDT, or USDC. Set the amount and a name for the payment. Then send the link.',
  },
  {
    title: 'They pay',
    text: 'They open the link, see the amount in dollars, and pay by card or bank.',
  },
  {
    title: 'The money reaches you',
    text: 'The coins go to your wallet. Your balance updates after the payment is confirmed, the fee is taken, and the link closes.',
  },
];

export function PayStory() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setStep((n) => (n + 1) % BEATS.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="hv-pay" aria-labelledby="hv-pay-title">
      <div className="hv-stage hv-pay-grid">
        <div className="hv-pay-copy">
          <p className="hv-eyebrow">Get paid</p>
          <h2 id="hv-pay-title">Send a link. They pay you.</h2>
          <p className="hv-sheet-lede">
            They see the amount in dollars and pay by card or bank.
          </p>
          <ol className="hv-pay-beats">
            {BEATS.map((beat, index) => (
              <li key={beat.title} className={index === step ? 'is-on' : ''}>
                <button type="button" onClick={() => setStep(index)} aria-current={index === step ? 'step' : undefined}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{beat.title}</strong>
                  <small>{beat.text}</small>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="hv-pay-stage" aria-hidden>
          <article className="hv-card">
            <div className="hv-card-top">
              <span className="hv-card-brand">
                <img className="hv-card-mark" src={appIcon.src} alt="" width={34} height={34} draggable={false} />
                Place to All
              </span>
              <svg className="hv-card-wave" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M8.2 8.2a6.2 6.2 0 0 1 0 7.6" strokeLinecap="round" />
                <path d="M12 5.4a10 10 0 0 1 0 13.2" strokeLinecap="round" />
                <path d="M15.8 2.8a13.6 13.6 0 0 1 0 18.4" strokeLinecap="round" />
              </svg>
            </div>
            <p className="hv-card-num">
              <span>••••</span>
              <span>••••</span>
              <span>••••</span>
              <span>4821</span>
            </p>
            <div className="hv-card-bottom">
              <span className="hv-card-field">
                <small>Cardholder</small>
                Place to All
              </span>
              <span className="hv-card-field">
                <small>Valid thru</small>
                09/28
              </span>
              <span className="hv-card-meta">Virtual · USD</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

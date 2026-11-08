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
                <img className="hv-card-mark" src={appIcon.src} alt="" width={44} height={44} draggable={false} />
                Place to All
              </span>
              <svg className="hv-card-wave" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M8 8.5a6 6 0 0 1 0 7" />
                <path d="M11.5 6a9 9 0 0 1 0 12" />
                <path d="M15 3.5a12 12 0 0 1 0 17" />
              </svg>
            </div>
            <span className="hv-card-chip" />
            <div className="hv-card-bottom">
              <span className="hv-card-num">•••• 4821</span>
              <span className="hv-card-meta">Virtual · USD</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';

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
          <div className={`hv-pay-card is-${step}`}>
            <div className="hv-pay-card-top">
              <span>Payment</span>
              <span className="hv-pay-live">Example</span>
            </div>
            <p className="hv-pay-invoice">For a friend</p>
            <p className="hv-pay-amount">
              50 <small>USDT</small>
            </p>
            <p className="hv-pay-usd">≈ $50.00 USD</p>
            <div className="hv-pay-faces">
              <p className={step === 0 ? 'is-on' : ''}>Link ready to send</p>
              <p className={step === 1 ? 'is-on' : ''}>They pay by card or bank</p>
              <p className={step === 2 ? 'is-on' : ''}>Money in your wallet</p>
            </div>
            <div className="hv-pay-bar">
              <span style={{ width: `${((step + 1) / BEATS.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

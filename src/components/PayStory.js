'use client';

import { useEffect, useState } from 'react';

const BEATS = [
  {
    title: 'You create the link',
    text: 'Pick BTC, ETH, USDT, or USDC, set the amount, and give it a title. The app hands you a link to send.',
  },
  {
    title: 'They pay with no account',
    text: 'The payer opens the link, sees the amount and a live USD estimate, and checks out by card or bank. No signup.',
  },
  {
    title: 'You are credited',
    text: 'Crypto is sent to the wallet on file. Your balance updates after confirmation, the fee on the link is applied, and the link closes.',
  },
];

export function PayStory() {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAuto(false);
      return undefined;
    }
    const id = setInterval(() => setStep((n) => (n + 1) % BEATS.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="hv-pay" aria-labelledby="hv-pay-title">
      <div className="hv-stage hv-pay-grid">
        <div className="hv-pay-copy">
          <p className="hv-eyebrow">Payments</p>
          <h2 id="hv-pay-title">A payment system of its own.</h2>
          <p className="hv-sheet-lede">
            Separate from the wallet tour. One link collects a payment from someone who never creates an account.
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
              <span>Payment request</span>
              <span className="hv-pay-live">{auto ? 'Live' : 'Step'}</span>
            </div>
            <p className="hv-pay-invoice">Invoice</p>
            <p className="hv-pay-amount">
              50 <small>USDT</small>
            </p>
            <p className="hv-pay-usd">≈ $50.00 USD</p>
            <div className="hv-pay-faces">
              <p className={step === 0 ? 'is-on' : ''}>Link ready to share</p>
              <p className={step === 1 ? 'is-on' : ''}>Pay by card or bank</p>
              <p className={step === 2 ? 'is-on' : ''}>Credited to your wallet</p>
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

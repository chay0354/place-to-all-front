'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDisplayCurrency } from '@/lib/display-currency';

const DEPOSIT_SHEET_EVENT = 'pta-open-deposit-sheet';

export function openDepositPaymentSheet() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DEPOSIT_SHEET_EVENT));
}

export function DepositPaymentSheet({ open, onClose }) {
  const router = useRouter();
  const [payCurrency, setPayCurrency] = useState('USD');

  useEffect(() => {
    if (!open) return;
    setPayCurrency(getDisplayCurrency());
    const sync = () => setPayCurrency(getDisplayCurrency());
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', sync);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const buyLabel = `Buy with ${payCurrency}`;

  function goBuy() {
    onClose?.();
    router.push('/dashboard/buy');
  }

  return (
    <div className="deposit-sheet-overlay" role="presentation">
      <button type="button" className="deposit-sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div className="deposit-sheet" role="dialog" aria-modal="true" aria-labelledby="deposit-sheet-title">
        <div className="deposit-sheet-grab" aria-hidden />

        <div className="deposit-sheet-head">
          <h2 id="deposit-sheet-title" className="deposit-sheet-title">
            Select Payment Method
          </h2>
        </div>

        <div className="deposit-sheet-options">
          <button type="button" className="deposit-sheet-option" onClick={goBuy}>
            <span className="deposit-sheet-option-icon deposit-sheet-option-icon--card">
              <CardIcon />
            </span>
            <span className="deposit-sheet-option-text">
              <span className="deposit-sheet-option-title">{buyLabel}</span>
              <span className="deposit-sheet-option-sub">Visa and Mastercard are supported</span>
            </span>
            <ChevronRightIcon />
          </button>
        </div>

        <button type="button" className="deposit-sheet-more" onClick={() => { onClose?.(); router.push('/dashboard/more'); }}>
          View More
          <ChevronDownIcon />
        </button>
      </div>
    </div>
  );
}

export function useDepositPaymentSheetListener(onOpen) {
  useEffect(() => {
    function handleOpen() {
      onOpen?.();
    }
    window.addEventListener(DEPOSIT_SHEET_EVENT, handleOpen);
    return () => window.removeEventListener(DEPOSIT_SHEET_EVENT, handleOpen);
  }, [onOpen]);
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="deposit-sheet-chevron">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="deposit-sheet-chevron-down">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

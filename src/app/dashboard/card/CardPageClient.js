'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { getMockCards, getMockCardTransactions, groupCardTransactions } from '@/lib/mock-card';
import { getSelectedCardIndex, setSelectedCardIndex } from '@/lib/card-mock-state';
import { CardCarousel } from './CardCarousel';
import { DashScreenHeader } from '@/components/DashScreenHeader';

function formatAmount(amount, currency) {
  const n = Math.abs(Number(amount) || 0);
  const sign = amount < 0 ? '-' : '+';
  return `${sign}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

const FALLBACK_TX_ICON = 'https://api.iconify.design/lucide/credit-card.svg?color=%232563EB&width=44&height=44';

function cardActionHref(path, cardIndex) {
  return `${path}?card=${cardIndex}`;
}

export function CardPageClient() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login?next=%2Fdashboard%2Fcard');
        return;
      }
      setUserId(user.id);
      setActiveIndex(getSelectedCardIndex(user.id));
      setLoading(false);
    });
  }, [router]);

  const cards = useMemo(() => (userId ? getMockCards(userId) : []), [userId]);
  const activeCard = cards[activeIndex] || cards[0];

  const txGroups = useMemo(() => {
    if (!userId) return [];
    return groupCardTransactions(getMockCardTransactions(userId, activeIndex));
  }, [userId, activeIndex]);

  function handleActiveIndexChange(index) {
    setActiveIndex(index);
    if (userId) setSelectedCardIndex(userId, index);
  }

  if (loading || !activeCard) return <AppLoadingScreen />;

  return (
    <div className="card-screen dash-screen">
      <DashScreenHeader title="Cards" />

      <CardCarousel
        cards={cards}
        userId={userId}
        activeIndex={activeIndex}
        onActiveIndexChange={handleActiveIndexChange}
      />

      <div className="card-quick-actions">
        <Link href={cardActionHref('/dashboard/card/view', activeIndex)} className="card-quick-action">
          <span className="card-quick-action-icon">
            <EyeIcon />
          </span>
          <span className="card-quick-action-label">View</span>
        </Link>
        <Link href={cardActionHref('/dashboard/card/freeze', activeIndex)} className="card-quick-action">
          <span className="card-quick-action-icon">
            <SnowflakeIcon />
          </span>
          <span className="card-quick-action-label">Freeze</span>
        </Link>
        <Link href={cardActionHref('/dashboard/card/limit', activeIndex)} className="card-quick-action">
          <span className="card-quick-action-icon">
            <LimitIcon />
          </span>
          <span className="card-quick-action-label">Limit</span>
        </Link>
        <Link href={cardActionHref('/dashboard/card/settings', activeIndex)} className="card-quick-action">
          <span className="card-quick-action-icon">
            <SettingsIcon />
          </span>
          <span className="card-quick-action-label">Settings</span>
        </Link>
      </div>

      <div className="card-apple-wallet-row">
        <ApplePayMark />
        <span>Add to Wallet</span>
      </div>

      <section className="card-transactions-section">
        <div className="card-transactions-head">
          <h2>Transactions</h2>
          <div className="card-transactions-head-actions">
            <button type="button" className="card-screen-icon-btn" aria-label="Transaction analytics">
              <ChartIcon />
            </button>
            <button type="button" className="card-screen-icon-btn" aria-label="More transaction options">
              <MoreIcon />
            </button>
          </div>
        </div>

        <div className="card-transactions-list">
          {txGroups.length === 0 && (
            <p className="card-sub-note" style={{ margin: 0 }}>
              No transactions for this card yet.
            </p>
          )}
          {txGroups.map((group) => (
            <div key={group.date} className="card-transactions-group">
              <p className="card-transactions-date">{group.date}</p>
              {group.items.map((tx) => (
                <article key={tx.id} className="card-transaction-row">
                  <span className="card-transaction-icon" aria-hidden>
                    <img
                      src={tx.icon_url || FALLBACK_TX_ICON}
                      alt=""
                      width={22}
                      height={22}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  </span>
                  <div className="card-transaction-meta">
                    <p className="card-transaction-merchant">{tx.merchant}</p>
                    <p className="card-transaction-sub">
                      {tx.card_suffix} · {tx.timestamp_label}
                    </p>
                  </div>
                  <div className="card-transaction-right">
                    <p className="card-transaction-amount">{formatAmount(tx.amount, tx.currency)}</p>
                    <p className="card-transaction-status">{tx.status}</p>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SnowflakeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" />
    </svg>
  );
}

function LimitIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3" />
      <path d="M2 14h4M10 12h4M18 16h4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-6M22 20V8" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

function ApplePayMark() {
  return (
    <span className="card-apple-pay-badge" aria-hidden>
      <AppleLogo />
      <span className="card-apple-pay-text">Pay</span>
    </span>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.37 12.13c.02 2.34 2.05 3.12 2.07 3.13-.02.05-.32 1.1-1.05 2.18-.63.94-1.29 1.88-2.33 1.9-1.03.02-1.36-.61-2.54-.61-1.18 0-1.54.59-2.52.63-1 .04-1.77-1-2.41-1.93-1.31-1.9-2.31-5.36-.97-7.69.66-1.16 1.84-1.9 3.12-1.92.98-.02 1.9.66 2.5.66.6 0 1.73-.81 2.91-.69.49.02 1.87.2 2.75 1.49-.07.04-1.64.95-1.63 2.85zm-2.13-5.02c.53-.64.89-1.52.79-2.4-.77.03-1.69.51-2.24 1.15-.49.56-.92 1.45-.8 2.31.86.07 1.72-.44 2.25-1.06z" />
    </svg>
  );
}

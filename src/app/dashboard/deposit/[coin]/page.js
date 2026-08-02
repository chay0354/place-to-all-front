'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashScreenHeader } from '@/components/DashScreenHeader';
import { CoinIcon } from '@/components/CoinIcon';
import { getDepositCoin, getDepositNetworks, normalizeDepositCoin } from '@/lib/mock-deposit';

export default function DepositSelectNetworkPage() {
  const params = useParams();
  const router = useRouter();
  const coinCode = normalizeDepositCoin(params?.coin);
  const coin = getDepositCoin(coinCode);
  const networks = useMemo(() => getDepositNetworks(coinCode), [coinCode]);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (!coinCode) return;
    const ac = new AbortController();
    fetch(`/api/coingecko/prices?symbols=${encodeURIComponent(coinCode)}`, {
      signal: ac.signal,
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => {
        const img = d?.images?.[coinCode];
        setImageUrl(img && String(img).startsWith('http') ? img : '');
      })
      .catch(() => setImageUrl(''));
    return () => ac.abort();
  }, [coinCode]);

  if (!coin) {
    return (
      <div className="deposit-flow dash-screen">
        <DashScreenHeader title="Choose a Chain Type" backHref="/dashboard/deposit" />
        <p className="deposit-empty">Unknown coin. Pick another asset.</p>
        <Link href="/dashboard/deposit" className="btn btn-primary">
          Select coin
        </Link>
      </div>
    );
  }

  return (
    <div className="deposit-flow dash-screen">
      <div className="deposit-network-top">
        <DashScreenHeader title="Choose a Chain Type" backHref="/dashboard/deposit" />
        <button
          type="button"
          className="deposit-close-btn"
          aria-label="Close"
          onClick={() => router.push('/dashboard/more')}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="deposit-coin-picked">
        <CoinIcon code={coin.code} imageUrl={imageUrl} sizeClass="deposit-coin-icon" />
        <span>
          Depositing <strong>{coin.code}</strong>
        </span>
      </div>

      <div className="deposit-info-banner">
        <InfoIcon />
        <span>Make sure that the chain type you make deposits to is the one you make withdrawals from.</span>
      </div>

      <ul className="deposit-network-list">
        {networks.map((net) => (
          <li key={net.id}>
            <Link href={`/dashboard/deposit/${coin.code}/${net.id}`} className="deposit-network-row">
              <span className="deposit-network-badge" aria-hidden>
                {net.label.slice(0, 1)}
              </span>
              <span className="deposit-network-text">
                <span className="deposit-network-name">
                  {net.label}
                  {net.recentlyUsed && <span className="deposit-network-pill">Recently Used</span>}
                </span>
                <span className="deposit-network-meta">
                  Deposit Completion: {net.confirmations} confirmation{net.confirmations === 1 ? '' : 's'}
                </span>
                <span className="deposit-network-meta">
                  Min. Deposit Amount: {net.minDeposit} {coin.code}
                </span>
              </span>
              <ChevronIcon />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v5M12 7h.01" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="deposit-network-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

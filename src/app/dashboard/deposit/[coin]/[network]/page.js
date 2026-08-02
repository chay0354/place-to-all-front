'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DashScreenHeader } from '@/components/DashScreenHeader';
import { CoinIcon } from '@/components/CoinIcon';
import {
  getDepositCoin,
  getDepositNetwork,
  getMockDepositAddress,
  normalizeDepositCoin,
  qrCodeUrl,
} from '@/lib/mock-deposit';

export default function DepositAddressPage() {
  const params = useParams();
  const coinCode = normalizeDepositCoin(params?.coin);
  const networkId = String(params?.network || '').toLowerCase();
  const coin = getDepositCoin(coinCode);
  const network = getDepositNetwork(coinCode, networkId);
  const address = useMemo(
    () => (coin && network ? getMockDepositAddress(coinCode, networkId) : ''),
    [coin, network, coinCode, networkId],
  );
  const [copied, setCopied] = useState(false);
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

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (!coin || !network) {
    return (
      <div className="deposit-flow dash-screen">
        <DashScreenHeader title="Deposit" backHref="/dashboard/deposit" />
        <p className="deposit-empty">Invalid coin or network.</p>
        <Link href="/dashboard/deposit" className="btn btn-primary">
          Start over
        </Link>
      </div>
    );
  }

  return (
    <div className="deposit-flow deposit-flow--address dash-screen">
      <DashScreenHeader
        title={`${coin.code}-Deposit`}
        backHref={`/dashboard/deposit/${coin.code}`}
        backLabel="Back to networks"
      />

      <div className="deposit-address-network">
        <CoinIcon code={coin.code} imageUrl={imageUrl} sizeClass="deposit-coin-icon-sm" />
        <span>
          Network: <strong>{network.label}</strong>
        </span>
      </div>

      <div className="deposit-qr-wrap">
        <img src={qrCodeUrl(address)} alt={`QR code for ${coin.code} deposit`} className="deposit-qr" />
        <span className="deposit-qr-badge" aria-hidden>
          <CoinIcon code={coin.code} imageUrl={imageUrl} sizeClass="deposit-coin-icon-xs" />
        </span>
      </div>

      <section className="deposit-address-card">
        <p className="deposit-address-label">Wallet Address</p>
        <div className="deposit-address-row">
          <p className="deposit-address-value" data-allow-copy="true">
            {address}
          </p>
          <button type="button" className="deposit-address-copy-icon" onClick={copyAddress} aria-label="Copy address">
            <CopyIcon />
          </button>
        </div>
      </section>

      <ul className="deposit-detail-list">
        <li>
          <span>Minimum Deposit Amount</span>
          <strong>
            {network.minDeposit} {coin.code}
          </strong>
        </li>
        <li>
          <span>Deposit Arrival</span>
          <strong>
            {network.confirmations} confirmation{network.confirmations === 1 ? '' : 's'}
          </strong>
        </li>
        <li>
          <span>Withdrawal Unlocked</span>
          <strong>
            {network.confirmations} confirmation{network.confirmations === 1 ? '' : 's'}
          </strong>
        </li>
        <li>
          <span>Mock notice</span>
          <strong>Demo address only</strong>
        </li>
      </ul>

      <p className="deposit-mock-note">This is a mockup — addresses are not real and cannot receive funds.</p>

      <div className="deposit-address-actions">
        <button type="button" className="deposit-btn deposit-btn--ghost" disabled>
          Save Picture
        </button>
        <button type="button" className="deposit-btn deposit-btn--primary" onClick={copyAddress}>
          {copied ? 'Copied' : 'Copy Address'}
        </button>
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
    </svg>
  );
}

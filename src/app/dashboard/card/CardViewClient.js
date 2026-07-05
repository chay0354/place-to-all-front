'use client';

import { useMemo, useState } from 'react';
import { getMockCard, getMockCardDetails } from '@/lib/mock-card';
import { CardSubScreen, CardSubScreenLoader, useActiveCardIndex } from './CardSubScreen';
import { CardThemeThumb } from './CardCarousel';

export function CardViewClient() {
  return (
    <CardSubScreenLoader nextPath="/dashboard/card/view">
      {(userId) => <CardViewContent userId={userId} />}
    </CardSubScreenLoader>
  );
}

function CardViewContent({ userId }) {
  const cardIndex = useActiveCardIndex(userId);
  const card = useMemo(() => getMockCard(userId, cardIndex), [userId, cardIndex]);
  const details = useMemo(() => getMockCardDetails(userId, cardIndex), [userId, cardIndex]);
  const [copied, setCopied] = useState('');

  async function copyField(key, value) {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ''));
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? '' : c)), 1500);
    } catch {
      setCopied('');
    }
  }

  return (
    <CardSubScreen title="Card details">
      <div className="card-sub-preview">
        <CardThemeThumb card={card} className="card-sub-preview-thumb" />
        <div>
          <p className="card-sub-preview-title">{card.label} · Virtual Visa</p>
          <p className="card-sub-preview-sub">{card.card_masked}</p>
        </div>
      </div>

      <p className="card-sub-note">
        Use these details for online payments. Never share your CVV with anyone.
      </p>

      <div className="card-details-group">
        <DetailRow
          label="Card number"
          value={details.pan}
          copied={copied === 'pan'}
          onCopy={() => copyField('pan', details.pan)}
        />
        <DetailRow
          label="Expiry"
          value={details.expiry}
          copied={copied === 'expiry'}
          onCopy={() => copyField('expiry', details.expiry)}
        />
        <DetailRow
          label="CVV"
          value={details.cvv}
          copied={copied === 'cvv'}
          onCopy={() => copyField('cvv', details.cvv)}
        />
        <DetailRow
          label="Name on card"
          value={details.name}
          copied={copied === 'name'}
          onCopy={() => copyField('name', details.name)}
        />
      </div>
    </CardSubScreen>
  );
}

function DetailRow({ label, value, copied, onCopy }) {
  return (
    <div className="card-detail-row">
      <div className="card-detail-row-body">
        <span className="card-detail-label">{label}</span>
        <span className="card-detail-value">{value}</span>
      </div>
      <button type="button" className="card-detail-copy" onClick={onCopy}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

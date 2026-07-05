'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getMockCard } from '@/lib/mock-card';
import { getCardFrozen, setCardFrozen } from '@/lib/card-mock-state';
import { CardSubScreen, CardSubScreenLoader, useActiveCardIndex } from './CardSubScreen';

export function CardFreezeClient() {
  return (
    <CardSubScreenLoader nextPath="/dashboard/card/freeze">
      {(userId) => <CardFreezeContent userId={userId} />}
    </CardSubScreenLoader>
  );
}

function CardFreezeContent({ userId }) {
  const cardIndex = useActiveCardIndex(userId);
  const card = useMemo(() => getMockCard(userId, cardIndex), [userId, cardIndex]);
  const [frozen, setFrozen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFrozen(getCardFrozen(userId, cardIndex));
  }, [userId, cardIndex]);

  function handleToggle() {
    const next = !frozen;
    setFrozen(next);
    setCardFrozen(userId, cardIndex, next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <CardSubScreen title="Freeze card">
      <div className="card-freeze-hero">
        <span className="card-freeze-icon" aria-hidden>
          <SnowflakeIcon />
        </span>
        <p className="card-freeze-title">
          {frozen ? 'Your card is frozen' : 'Temporarily freeze your card'}
        </p>
        <p className="card-freeze-desc">
          {frozen
            ? 'New payments are blocked. You can unfreeze anytime to use the card again.'
            : 'Block new payments instantly while keeping your card in Apple Wallet.'}
        </p>
      </div>

      <div className="card-settings-group">
        <div className="card-freeze-row">
          <div className="card-freeze-row-body">
            <span className="card-settings-row-title">
              {card.label} · {card.card_masked}
            </span>
            <span className="card-settings-row-sub">
              {frozen ? 'Frozen — payments paused' : 'Active — payments allowed'}
            </span>
          </div>
          <button
            type="button"
            className={`card-mock-toggle${frozen ? ' card-mock-toggle--on' : ''}`}
            role="switch"
            aria-checked={frozen}
            onClick={handleToggle}
          >
            <span className="card-mock-toggle-knob" />
          </button>
        </div>
      </div>

      {saved && <p className="card-sub-success">Changes saved (preview)</p>}

      <Link href="/dashboard/card" className="btn btn-primary card-sub-primary-btn">
        Back to cards
      </Link>
    </CardSubScreen>
  );
}

function SnowflakeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" />
    </svg>
  );
}

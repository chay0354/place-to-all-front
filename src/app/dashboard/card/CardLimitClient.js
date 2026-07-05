'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { getMockCard, getMockCardLimits } from '@/lib/mock-card';
import { CardSubScreen, CardSubScreenLoader } from './CardSubScreen';

function formatUsd(n) {
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function CardLimitClient() {
  return (
    <CardSubScreenLoader nextPath="/dashboard/card/limit">
      {(userId) => <CardLimitContent userId={userId} />}
    </CardSubScreenLoader>
  );
}

function CardLimitContent({ userId }) {
  const card = useMemo(() => getMockCard(userId), [userId]);
  const limits = useMemo(() => getMockCardLimits(userId), [userId]);

  return (
    <CardSubScreen title="Spending limit">
      <div className="card-sub-preview">
        <span className="card-settings-preview-thumb card-sub-preview-thumb" aria-hidden />
        <div>
          <p className="card-sub-preview-title">Virtual card {card.card_masked}</p>
          <p className="card-sub-preview-sub">Preview limits — not enforced yet</p>
        </div>
      </div>

      <div className="card-limits-list">
        <LimitMeter
          label="Daily limit"
          used={limits.daily_used_usd}
          total={limits.daily_limit_usd}
        />
        <LimitMeter
          label="Monthly limit"
          used={limits.monthly_used_usd}
          total={limits.monthly_limit_usd}
        />
        <div className="card-limit-static">
          <span className="card-limit-static-label">Per transaction</span>
          <span className="card-limit-static-value">{formatUsd(limits.per_tx_limit_usd)}</span>
        </div>
      </div>

      <p className="card-sub-note">
        Adjust limits to control spending. Changes in this preview are not saved to a live card program yet.
      </p>

      <button type="button" className="btn btn-ghost card-sub-secondary-btn" disabled>
        Edit limits (coming soon)
      </button>

      <Link href="/dashboard/card" className="btn btn-primary card-sub-primary-btn">
        Back to card
      </Link>
    </CardSubScreen>
  );
}

function LimitMeter({ label, used, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className="card-limit-meter">
      <div className="card-limit-meter-head">
        <span className="card-limit-meter-label">{label}</span>
        <span className="card-limit-meter-value">
          {formatUsd(used)} / {formatUsd(total)}
        </span>
      </div>
      <div className="card-limit-meter-track" aria-hidden>
        <div className="card-limit-meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="card-limit-meter-sub">{pct}% used</p>
    </div>
  );
}

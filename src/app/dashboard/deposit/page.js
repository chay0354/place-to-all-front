'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashScreenHeader } from '@/components/DashScreenHeader';
import { CoinIcon } from '@/components/CoinIcon';
import {
  DEPOSIT_COINS,
  DEPOSIT_RECOMMENDED,
  groupDepositCoinsByLetter,
} from '@/lib/mock-deposit';

export default function DepositSelectCoinPage() {
  const [query, setQuery] = useState('');
  const [coinImages, setCoinImages] = useState({});

  useEffect(() => {
    const symbols = DEPOSIT_COINS.map((c) => c.code);
    if (!symbols.length) return;
    const ac = new AbortController();
    const q = encodeURIComponent(symbols.join(','));
    fetch(`/api/coingecko/prices?symbols=${q}`, { signal: ac.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setCoinImages(d.images && typeof d.images === 'object' ? d.images : {}))
      .catch(() => setCoinImages({}));
    return () => ac.abort();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DEPOSIT_COINS;
    return DEPOSIT_COINS.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [query]);

  const groups = useMemo(() => groupDepositCoinsByLetter(filtered), [filtered]);

  return (
    <div className="deposit-flow dash-screen">
      <DashScreenHeader title="Select Coin" backHref="/dashboard/more" backLabel="Back to More" />

      <div className="deposit-search-wrap">
        <SearchIcon />
        <input
          type="search"
          className="deposit-search"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="deposit-info-banner">
        <InfoIcon />
        <span>How to Deposit? Learn more</span>
      </div>

      {!query.trim() && (
        <section className="deposit-chips-section" aria-label="Recommended">
          <p className="deposit-chips-label">Recommend</p>
          <div className="deposit-chips">
            {DEPOSIT_RECOMMENDED.map((code) => (
              <Link key={code} href={`/dashboard/deposit/${code}`} className="deposit-chip">
                <CoinIcon
                  code={code}
                  imageUrl={coinImages[code]}
                  sizeClass="deposit-chip-icon"
                />
                {code}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="deposit-coin-list">
        {groups.map(([letter, coins]) => (
          <section key={letter} className="deposit-coin-group" aria-label={letter}>
            <div className="deposit-coin-letter">{letter}</div>
            <ul className="deposit-coin-rows">
              {coins.map((coin) => (
                <li key={coin.code}>
                  <Link href={`/dashboard/deposit/${coin.code}`} className="deposit-coin-row">
                    <CoinIcon
                      code={coin.code}
                      imageUrl={coinImages[coin.code]}
                      sizeClass="deposit-coin-icon"
                    />
                    <span className="deposit-coin-text">
                      <span className="deposit-coin-code">{coin.code}</span>
                      <span className="deposit-coin-name">{coin.name}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {filtered.length === 0 && <p className="deposit-empty">No coins match your search.</p>}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="deposit-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
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

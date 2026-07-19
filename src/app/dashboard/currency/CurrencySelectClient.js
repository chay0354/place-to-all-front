'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashScreenHeader } from '@/components/DashScreenHeader';
import {
  ALPHABET_INDEX,
  clearCurrencyReturnPath,
  filterCurrencies,
  flagUrl,
  flagUrlHd,
  getDisplayCurrency,
  groupCurrenciesByLetter,
  readCurrencyReturnPath,
  setDisplayCurrency,
} from '@/lib/display-currency';

export function CurrencySelectClient() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState('/dashboard');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(() => getDisplayCurrency());

  useEffect(() => {
    setReturnTo(readCurrencyReturnPath());
  }, []);

  const filtered = useMemo(() => filterCurrencies(query), [query]);
  const groups = useMemo(() => groupCurrenciesByLetter(filtered), [filtered]);
  const lettersPresent = useMemo(() => new Set(groups.map((g) => g.letter)), [groups]);

  function handleSelect(code) {
    setSelected(code);
    setDisplayCurrency(code);
    clearCurrencyReturnPath();
    router.push(returnTo);
  }

  function scrollToLetter(letter) {
    const el = document.getElementById(`currency-section-${letter}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="currency-select-screen dash-screen">
      <DashScreenHeader
        title="Select currency"
        backHref={returnTo}
        onBackClick={clearCurrencyReturnPath}
      />

      <div className="currency-select-search-wrap">
        <SearchIcon />
        <input
          type="search"
          className="currency-select-search"
          placeholder="Currency"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search currency"
        />
      </div>

      <div className="currency-select-body">
        <div className="currency-select-list">
          {groups.map((group) => (
            <section key={group.letter} id={`currency-section-${group.letter}`} className="currency-select-group">
              <h2 className="currency-select-letter">{group.letter}</h2>
              <ul className="currency-select-items">
                {group.items.map((item) => (
                  <li key={item.code}>
                    <button
                      type="button"
                      className={`currency-select-row${selected === item.code ? ' currency-select-row--active' : ''}`}
                      onClick={() => handleSelect(item.code)}
                    >
                      <img
                        src={flagUrl(item.country)}
                        alt=""
                        className="currency-select-flag"
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = flagUrlHd(item.country, 40);
                        }}
                      />
                      <span className="currency-select-row-text">
                        <span className="currency-select-code">{item.code}</span>
                        <span className="currency-select-name">{item.name}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {groups.length === 0 && (
            <p className="currency-select-empty">No currencies match your search.</p>
          )}
        </div>

        {!query && (
          <nav className="currency-select-alpha" aria-label="Jump to letter">
            {ALPHABET_INDEX.map((letter) => (
              <button
                key={letter}
                type="button"
                className={`currency-select-alpha-btn${lettersPresent.has(letter) ? '' : ' currency-select-alpha-btn--disabled'}`}
                disabled={!lettersPresent.has(letter)}
                onClick={() => scrollToLetter(letter)}
              >
                {letter}
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="currency-select-search-icon">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

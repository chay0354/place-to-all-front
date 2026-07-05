'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import appIcon from '@/app/icon.png';
import { getCardFrozen } from '@/lib/card-mock-state';
import { getCardThemeStyle } from '@/lib/mock-card';

export function CardCarousel({ cards, userId, activeIndex, onActiveIndexChange }) {
  const trackRef = useRef(null);
  const [frozenMap, setFrozenMap] = useState({});

  const syncFrozen = useCallback(() => {
    if (!userId || !cards.length) return;
    const next = {};
    cards.forEach((card) => {
      next[card.index] = getCardFrozen(userId, card.index);
    });
    setFrozenMap(next);
  }, [userId, cards]);

  useEffect(() => {
    syncFrozen();
    window.addEventListener('focus', syncFrozen);
    window.addEventListener('pageshow', syncFrozen);
    return () => {
      window.removeEventListener('focus', syncFrozen);
      window.removeEventListener('pageshow', syncFrozen);
    };
  }, [syncFrozen]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[activeIndex];
    if (slide) {
      slide.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeIndex]);

  function handleScroll() {
    const track = trackRef.current;
    if (!track || !cards.length) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let closest = 0;
    let closestDist = Infinity;
    Array.from(track.children).forEach((child, index) => {
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const dist = Math.abs(center - childCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closest = index;
      }
    });
    if (closest !== activeIndex) onActiveIndexChange(closest);
  }

  return (
    <div className="card-carousel-wrap">
      <div
        ref={trackRef}
        className="card-carousel"
        onScroll={handleScroll}
        aria-label="Your virtual cards"
      >
        {cards.map((card) => (
          <article key={card.id} className="card-carousel-slide">
            <VirtualCardVisual card={card} frozen={Boolean(frozenMap[card.index])} />
          </article>
        ))}
      </div>
      <div className="card-carousel-dots" role="tablist" aria-label="Select card">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            role="tab"
            className={`card-carousel-dot${card.index === activeIndex ? ' card-carousel-dot--active' : ''}`}
            aria-selected={card.index === activeIndex}
            aria-label={`${card.label} card ending ${card.last4}`}
            onClick={() => onActiveIndexChange(card.index)}
          />
        ))}
      </div>
    </div>
  );
}

export function VirtualCardVisual({ card, frozen = false }) {
  return (
    <div
      className={`card-visa-mock card-visa-mock--theme-${card.theme}${frozen ? ' card-visa-mock--frozen' : ''}`}
      style={getCardThemeStyle(card)}
    >
      <div className="card-visa-mock-mountains" aria-hidden />
      <div className="card-visa-mock-top">
        <div className="card-visa-mock-brand">
          <img
            src={appIcon.src}
            alt=""
            className="card-visa-mock-brand-logo"
            width={48}
            height={48}
            draggable={false}
          />
        </div>
        {card.label && <span className="card-visa-mock-label">{card.label}</span>}
      </div>
      <div className="card-visa-mock-bottom">
        <span className="card-visa-mock-pan">{card.card_masked}</span>
        <span className="card-visa-mock-network">VISA</span>
      </div>
      {frozen && <div className="card-visa-mock-frozen-badge">Frozen</div>}
    </div>
  );
}

export function CardThemeThumb({ card, className = '' }) {
  return (
    <span
      className={`card-settings-preview-thumb card-theme-thumb card-theme-thumb--${card.theme}${className ? ` ${className}` : ''}`}
      style={getCardThemeStyle(card)}
      aria-hidden
    />
  );
}

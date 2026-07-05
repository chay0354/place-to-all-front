const FROZEN_PREFIX = 'pta-card-frozen:';
const SELECTED_PREFIX = 'pta-card-selected:';

function clampIndex(cardIndex) {
  const n = Number(cardIndex);
  return Number.isFinite(n) ? Math.max(0, Math.min(2, Math.trunc(n))) : 0;
}

export function getSelectedCardIndex(userId) {
  if (typeof window === 'undefined' || !userId) return 0;
  const raw = sessionStorage.getItem(`${SELECTED_PREFIX}${userId}`);
  return clampIndex(raw);
}

export function setSelectedCardIndex(userId, cardIndex) {
  if (typeof window === 'undefined' || !userId) return;
  sessionStorage.setItem(`${SELECTED_PREFIX}${userId}`, String(clampIndex(cardIndex)));
}

export function getCardFrozen(userId, cardIndex = 0) {
  if (typeof window === 'undefined' || !userId) return false;
  const index = clampIndex(cardIndex);
  return sessionStorage.getItem(`${FROZEN_PREFIX}${userId}:${index}`) === '1';
}

export function setCardFrozen(userId, cardIndex, frozen) {
  if (typeof window === 'undefined' || !userId) return;
  const index = clampIndex(cardIndex);
  sessionStorage.setItem(`${FROZEN_PREFIX}${userId}:${index}`, frozen ? '1' : '0');
}

export function parseCardIndexParam(value, fallback = 0) {
  if (value == null || value === '') return fallback;
  return clampIndex(value);
}

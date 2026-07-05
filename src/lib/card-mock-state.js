const FROZEN_PREFIX = 'pta-card-frozen:';

export function getCardFrozen(userId) {
  if (typeof window === 'undefined' || !userId) return false;
  return sessionStorage.getItem(`${FROZEN_PREFIX}${userId}`) === '1';
}

export function setCardFrozen(userId, frozen) {
  if (typeof window === 'undefined' || !userId) return;
  sessionStorage.setItem(`${FROZEN_PREFIX}${userId}`, frozen ? '1' : '0');
}

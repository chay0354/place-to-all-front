const STORAGE_PREFIX = 'pta_pin_unlock:';

export function isPinUnlocked(userId) {
  if (typeof window === 'undefined' || !userId) return false;
  try {
    return sessionStorage.getItem(`${STORAGE_PREFIX}${userId}`) === '1';
  } catch {
    return false;
  }
}

export function setPinUnlocked(userId) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${userId}`, '1');
  } catch {
    /* ignore */
  }
}

export function clearPinUnlocked(userId) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
  } catch {
    /* ignore */
  }
}

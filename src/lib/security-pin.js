import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { isValidSecurityPin } from './security-pin-shared.js';

export { isValidSecurityPin };

export function hashSecurityPin(pin, userId) {
  if (!isValidSecurityPin(pin)) {
    throw new Error('PIN must be exactly 6 digits');
  }
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(`${pin}:${userId}`, salt, 32).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifySecurityPin(pin, userId, stored) {
  if (!isValidSecurityPin(pin) || !stored || typeof stored !== 'string') return false;
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  try {
    const derived = scryptSync(`${pin}:${userId}`, salt, 32);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

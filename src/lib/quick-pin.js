import { updateProfile } from '@/lib/api';
import { isValidSecurityPin } from '@/lib/security-pin-shared';

export function hasQuickPin(profile) {
  return Boolean(profile?.security_pin_set_at);
}

export async function verifyQuickPin(pin) {
  if (!isValidSecurityPin(pin)) {
    throw new Error('PIN must be exactly 6 digits');
  }
  const res = await fetch('/api/profile/verify-pin', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Incorrect PIN');
  }
  return data;
}

export async function setQuickPin({ pin, currentPin }) {
  if (!isValidSecurityPin(pin)) {
    throw new Error('PIN must be exactly 6 digits');
  }
  return updateProfile({
    security_pin: pin,
    ...(currentPin ? { current_pin: currentPin } : {}),
  });
}

export async function clearQuickPin(currentPin) {
  if (!currentPin || !isValidSecurityPin(currentPin)) {
    throw new Error('Enter your current 6-digit PIN');
  }
  return updateProfile({ clear_security_pin: true, current_pin: currentPin });
}

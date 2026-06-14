async function phoneApi(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Phone verification failed');
  }
  return data;
}

export async function sendPhoneVerificationCode({ phone, countryCode = '+1' }) {
  return phoneApi('/api/profile/phone/send', {
    method: 'POST',
    body: JSON.stringify({ phone, countryCode }),
  });
}

export async function verifyPhoneCode({ phone, code, countryCode = '+1' }) {
  return phoneApi('/api/profile/phone/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code, countryCode }),
  });
}

export async function removeVerifiedPhone() {
  return phoneApi('/api/profile/phone', { method: 'DELETE' });
}

export function maskPhone(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 4) return raw;
  const visible = digits.slice(-4);
  const hiddenLen = digits.length - 4;
  const hidden = '•'.repeat(Math.min(hiddenLen, 7));
  if (raw.startsWith('+')) {
    const cc = digits.slice(0, Math.max(1, digits.length - 10));
    return `+${cc} ${hidden} ${visible}`;
  }
  return `${hidden} ${visible}`;
}

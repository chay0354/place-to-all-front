/** Display currency for dashboard balance (UI preview). */

export const QUICK_DISPLAY_CURRENCIES = ['USD', 'EUR', 'ILS'];

const STORAGE_KEY = 'pta-display-currency';

/** amount in currency ≈ totalUsd * rate */
export const CURRENCY_CATALOG = [
  { code: 'AOA', name: 'Kwanza', country: 'ao', rate: 830 },
  { code: 'AED', name: 'UAE Dirham', country: 'ae', rate: 3.67 },
  { code: 'ALL', name: 'Albanian Lek', country: 'al', rate: 93 },
  { code: 'ARS', name: 'Argentine Peso', country: 'ar', rate: 875 },
  { code: 'AMD', name: 'Armenian Dram', country: 'am', rate: 387 },
  { code: 'AUD', name: 'Australian Dollar', country: 'au', rate: 1.52 },
  { code: 'AZN', name: 'Azerbaijanian Manat', country: 'az', rate: 1.7 },
  { code: 'BHD', name: 'Bahraini Dinar', country: 'bh', rate: 0.376 },
  { code: 'BRL', name: 'Brazilian Real', country: 'br', rate: 4.97 },
  { code: 'CAD', name: 'Canadian Dollar', country: 'ca', rate: 1.36 },
  { code: 'CHF', name: 'Swiss Franc', country: 'ch', rate: 0.88 },
  { code: 'CLP', name: 'Chilean Peso', country: 'cl', rate: 940 },
  { code: 'CNY', name: 'Chinese Yuan', country: 'cn', rate: 7.24 },
  { code: 'COP', name: 'Colombian Peso', country: 'co', rate: 3950 },
  { code: 'CZK', name: 'Czech Koruna', country: 'cz', rate: 23.2 },
  { code: 'DKK', name: 'Danish Krone', country: 'dk', rate: 6.88 },
  { code: 'EGP', name: 'Egyptian Pound', country: 'eg', rate: 48.5 },
  { code: 'EUR', name: 'Euro', country: 'eu', rate: 0.92 },
  { code: 'GBP', name: 'Pound Sterling', country: 'gb', rate: 0.79 },
  { code: 'GEL', name: 'Georgian Lari', country: 'ge', rate: 2.7 },
  { code: 'HKD', name: 'Hong Kong Dollar', country: 'hk', rate: 7.82 },
  { code: 'HUF', name: 'Hungarian Forint', country: 'hu', rate: 365 },
  { code: 'IDR', name: 'Indonesian Rupiah', country: 'id', rate: 15800 },
  { code: 'ILS', name: 'Israeli New Shekel', country: 'il', rate: 3.68 },
  { code: 'INR', name: 'Indian Rupee', country: 'in', rate: 83.1 },
  { code: 'JPY', name: 'Japanese Yen', country: 'jp', rate: 149 },
  { code: 'KES', name: 'Kenyan Shilling', country: 'ke', rate: 129 },
  { code: 'KRW', name: 'Korean Won', country: 'kr', rate: 1320 },
  { code: 'KWD', name: 'Kuwaiti Dinar', country: 'kw', rate: 0.307 },
  { code: 'MXN', name: 'Mexican Peso', country: 'mx', rate: 17.1 },
  { code: 'MYR', name: 'Malaysian Ringgit', country: 'my', rate: 4.72 },
  { code: 'NGN', name: 'Nigerian Naira', country: 'ng', rate: 1550 },
  { code: 'NOK', name: 'Norwegian Krone', country: 'no', rate: 10.6 },
  { code: 'NZD', name: 'New Zealand Dollar', country: 'nz', rate: 1.64 },
  { code: 'PHP', name: 'Philippine Peso', country: 'ph', rate: 56.2 },
  { code: 'PLN', name: 'Polish Zloty', country: 'pl', rate: 4.02 },
  { code: 'QAR', name: 'Qatari Rial', country: 'qa', rate: 3.64 },
  { code: 'RON', name: 'Romanian Leu', country: 'ro', rate: 4.57 },
  { code: 'RUB', name: 'Russian Ruble', country: 'ru', rate: 92 },
  { code: 'SAR', name: 'Saudi Riyal', country: 'sa', rate: 3.75 },
  { code: 'SEK', name: 'Swedish Krona', country: 'se', rate: 10.5 },
  { code: 'SGD', name: 'Singapore Dollar', country: 'sg', rate: 1.34 },
  { code: 'THB', name: 'Thai Baht', country: 'th', rate: 35.8 },
  { code: 'TRY', name: 'Turkish Lira', country: 'tr', rate: 32.5 },
  { code: 'UAH', name: 'Ukrainian Hryvnia', country: 'ua', rate: 41 },
  { code: 'USD', name: 'US Dollar', country: 'us', rate: 1 },
  { code: 'VND', name: 'Vietnamese Dong', country: 'vn', rate: 24500 },
  { code: 'ZAR', name: 'South African Rand', country: 'za', rate: 18.6 },
];

const byCode = new Map(CURRENCY_CATALOG.map((c) => [c.code, c]));

export function getCurrencyMeta(code) {
  return byCode.get(String(code || 'USD').toUpperCase()) || byCode.get('USD');
}

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  ILS: '₪',
  JPY: '¥',
  CHF: 'Fr',
  CAD: 'C$',
  AUD: 'A$',
};

/** Convert an amount in a fiat currency to USD using catalog rates. */
export function fiatToUsd(amount, currency) {
  const meta = getCurrencyMeta(currency);
  const n = Number(amount);
  if (!(n > 0) || !(meta.rate > 0)) return 0;
  return n / meta.rate;
}

/** Label for pay-currency picker, e.g. "USD ($)". */
export function payCurrencyLabel(code) {
  const meta = getCurrencyMeta(code);
  const sym = CURRENCY_SYMBOLS[meta.code] || meta.code;
  return `${meta.code} (${sym})`;
}

export function getDisplayCurrency() {
  if (typeof window === 'undefined') return 'USD';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && byCode.has(saved.toUpperCase())) return saved.toUpperCase();
  return 'USD';
}

export function setDisplayCurrency(code) {
  if (typeof window === 'undefined') return;
  const c = String(code || 'USD').toUpperCase();
  if (byCode.has(c)) window.localStorage.setItem(STORAGE_KEY, c);
}

export function formatDisplayBalance(totalUsd, currency) {
  const meta = getCurrencyMeta(currency);
  const amount = totalUsd * meta.rate;
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function flagUrl(country) {
  const iso = String(country || '').toLowerCase();
  if (!iso) return '';
  return `https://flagcdn.com/${iso}.svg`;
}

/** High-DPI PNG fallback when SVG is unavailable. */
export function flagUrlHd(country, displayPx = 40) {
  const iso = String(country || '').toLowerCase();
  if (!iso) return '';
  const width = Math.min(320, Math.max(80, Math.ceil(displayPx * 3)));
  return `https://flagcdn.com/w${width}/${iso}.png`;
}

export function groupCurrenciesByLetter(list) {
  const groups = [];
  const map = new Map();
  for (const item of list) {
    const letter = item.code.charAt(0);
    if (!map.has(letter)) {
      const group = { letter, items: [] };
      map.set(letter, group);
      groups.push(group);
    }
    map.get(letter).items.push(item);
  }
  return groups;
}

export function filterCurrencies(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [...CURRENCY_CATALOG].sort((a, b) => a.code.localeCompare(b.code));
  return CURRENCY_CATALOG.filter(
    (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
  ).sort((a, b) => a.code.localeCompare(b.code));
}

export const ALPHABET_INDEX = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

const CURRENCY_RETURN_KEY = 'pta-currency-return';

function safeReturnPath(raw) {
  if (!raw || typeof raw !== 'string') return '/dashboard';
  const path = raw.split('?')[0];
  if (path.startsWith('/dashboard') && !path.startsWith('//')) return raw;
  return '/dashboard';
}

/** Remember where to go after picking a currency (avoids ?return= router issues). */
export function setCurrencyReturnPath(path) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CURRENCY_RETURN_KEY, safeReturnPath(path));
  } catch {}
}

export function readCurrencyReturnPath() {
  if (typeof window === 'undefined') return '/dashboard';
  try {
    const stored = sessionStorage.getItem(CURRENCY_RETURN_KEY);
    if (stored) return safeReturnPath(stored);
    const fromQuery = new URLSearchParams(window.location.search).get('return');
    if (fromQuery) return safeReturnPath(fromQuery);
  } catch {}
  return '/dashboard';
}

export function clearCurrencyReturnPath() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CURRENCY_RETURN_KEY);
  } catch {}
}

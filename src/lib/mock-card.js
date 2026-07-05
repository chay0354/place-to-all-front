/** Deterministic mock virtual cards + spend history per user (UI preview only). */

export const MOCK_CARD_COUNT = 3;

const CARD_THEMES = [
  { id: 'copper', label: 'Primary', gradient: '135deg, #d3833b 0%, #a85a28 42%, #7a3e15 100%' },
  { id: 'slate', label: 'Travel', gradient: '135deg, #4a6278 0%, #33485c 48%, #243444 100%' },
  { id: 'plum', label: 'Shopping', gradient: '135deg, #7a5588 0%, #5a3d66 48%, #3b2844 100%' },
];

function hashString(value) {
  let h = 0;
  const s = String(value || 'guest');
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getMockCardLast4(userId, cardIndex = 0) {
  const h = hashString(`${userId}:card:${cardIndex}`);
  return String(1000 + (h % 9000));
}

function buildMockCard(userId, cardIndex) {
  const theme = CARD_THEMES[cardIndex] || CARD_THEMES[0];
  const last4 = getMockCardLast4(userId, cardIndex);
  const h = hashString(`${userId}:card-meta:${cardIndex}`);
  return {
    id: `mock-${userId || 'guest'}-${cardIndex}`,
    index: cardIndex,
    card_network: 'Visa',
    card_masked: `•• ${last4}`,
    last4,
    theme: theme.id,
    theme_gradient: theme.gradient,
    label: theme.label,
    status: 'active',
    apple_pay_provisioned: cardIndex === 0,
    available_balance_usdt: 120 + (h % 500),
    billing_address: 'Israel tel aviv',
  };
}

export function getMockCards(userId) {
  return Array.from({ length: MOCK_CARD_COUNT }, (_, index) => buildMockCard(userId, index));
}

export function getMockCard(userId, cardIndex = 0) {
  const index = Math.max(0, Math.min(MOCK_CARD_COUNT - 1, Number(cardIndex) || 0));
  return buildMockCard(userId, index);
}

export function getMockCardDetails(userId, cardIndex = 0) {
  const index = Math.max(0, Math.min(MOCK_CARD_COUNT - 1, Number(cardIndex) || 0));
  const last4 = getMockCardLast4(userId, index);
  const h = hashString(`${userId}:details:${index}`);
  const month = String((h % 12) + 1).padStart(2, '0');
  const year = String(2028 + (h % 3));
  return {
    pan: `4532 8801 2290 ${last4}`,
    expiry: `${month}/${year.slice(-2)}`,
    cvv: String(100 + (h % 900)),
    name: 'PLACE TO ALL USER',
  };
}

export function getMockCardLimits(userId, cardIndex = 0) {
  const index = Math.max(0, Math.min(MOCK_CARD_COUNT - 1, Number(cardIndex) || 0));
  const h = hashString(`${userId}:limits:${index}`);
  const dailyLimit = 500 + (h % 5) * 100;
  const monthlyLimit = 5000 + (h % 4) * 1000;
  const perTxLimit = 250 + (h % 3) * 50;
  const dailyUsed = Math.round(dailyLimit * (0.28 + (h % 40) / 100));
  const monthlyUsed = Math.round(monthlyLimit * (0.35 + (h % 30) / 100));
  return {
    daily_limit_usd: dailyLimit,
    daily_used_usd: dailyUsed,
    monthly_limit_usd: monthlyLimit,
    monthly_used_usd: monthlyUsed,
    per_tx_limit_usd: perTxLimit,
  };
}

const MOCK_SPENDS = [
  {
    id: 'spend-1',
    card_index: 0,
    merchant: 'FLOWER FIELD NURSERY LT',
    icon: 'flower',
    icon_url: 'https://api.iconify.design/lucide/flower-2.svg?color=%23e8e8e8&width=44&height=44',
    amount: -70,
    currency: 'ILS',
    status: 'Cleared',
    daysAgo: 2,
    hour: 13,
    minute: 25,
    second: 19,
  },
  {
    id: 'spend-2',
    card_index: 1,
    merchant: 'mifgash koral',
    icon: 'dining',
    icon_url: 'https://api.iconify.design/lucide/utensils.svg?color=%23e8e8e8&width=44&height=44',
    amount: -320,
    currency: 'ILS',
    status: 'Cleared',
    daysAgo: 3,
    hour: 20,
    minute: 41,
    second: 8,
  },
  {
    id: 'spend-3',
    card_index: 2,
    merchant: 'PAZ GAS STATION',
    icon: 'fuel',
    icon_url: 'https://api.iconify.design/lucide/flame.svg?color=%23e8e8e8&width=44&height=44',
    amount: -245.5,
    currency: 'ILS',
    status: 'Cleared',
    daysAgo: 14,
    hour: 9,
    minute: 12,
    second: 44,
  },
];

function spendToTransaction(spend, last4) {
  const d = new Date();
  d.setDate(d.getDate() - spend.daysAgo);
  d.setHours(spend.hour, spend.minute, spend.second, 0);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  const h = `${d.getHours()}`.padStart(2, '0');
  const min = `${d.getMinutes()}`.padStart(2, '0');
  const s = `${d.getSeconds()}`.padStart(2, '0');
  return {
    id: spend.id,
    merchant: spend.merchant,
    icon: spend.icon,
    icon_url: spend.icon_url,
    amount: spend.amount,
    currency: spend.currency,
    status: spend.status,
    card_suffix: `•• ${last4}`,
    card_index: spend.card_index,
    created_at: d.toISOString(),
    timestamp_label: `${y}-${m}-${day} ${h}:${min}:${s}`,
    group_date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
  };
}

export function getMockCardTransactions(userId, cardIndex = 0) {
  const index = Math.max(0, Math.min(MOCK_CARD_COUNT - 1, Number(cardIndex) || 0));
  const last4 = getMockCardLast4(userId, index);
  return MOCK_SPENDS.filter((s) => s.card_index === index).map((s) => spendToTransaction(s, last4));
}

export function groupCardTransactions(transactions) {
  const groups = [];
  const map = new Map();
  for (const tx of transactions) {
    const key = tx.group_date;
    if (!map.has(key)) {
      const group = { date: key, items: [] };
      map.set(key, group);
      groups.push(group);
    }
    map.get(key).items.push(tx);
  }
  return groups;
}

export function getCardThemeStyle(card) {
  if (!card?.theme_gradient) return undefined;
  return { background: `linear-gradient(${card.theme_gradient})` };
}

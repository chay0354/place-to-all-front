/** Deterministic mock virtual card + spend history per user (UI preview only). */

function hashString(value) {
  let h = 0;
  const s = String(value || 'guest');
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getMockCardLast4(userId) {
  const h = hashString(userId);
  return String(1000 + (h % 9000));
}

export function getMockCard(userId) {
  const last4 = getMockCardLast4(userId);
  const h = hashString(`${userId}:card`);
  return {
    id: `mock-${userId || 'guest'}`,
    card_network: 'Visa',
    card_masked: `•• ${last4}`,
    last4,
    status: 'active',
    apple_pay_provisioned: true,
    available_balance_usdt: 120 + (h % 500),
    label: null,
    billing_address: 'Israel tel aviv',
  };
}

export function getMockCardDetails(userId) {
  const last4 = getMockCardLast4(userId);
  const h = hashString(`${userId}:details`);
  const month = String((h % 12) + 1).padStart(2, '0');
  const year = String(2028 + (h % 3));
  return {
    pan: `4532 8801 2290 ${last4}`,
    expiry: `${month}/${year.slice(-2)}`,
    cvv: String(100 + (h % 900)),
    name: 'PLACE TO ALL USER',
  };
}

export function getMockCardLimits(userId) {
  const h = hashString(`${userId}:limits`);
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
    created_at: d.toISOString(),
    timestamp_label: `${y}-${m}-${day} ${h}:${min}:${s}`,
    group_date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
  };
}

export function getMockCardTransactions(userId) {
  const last4 = getMockCardLast4(userId);
  return MOCK_SPENDS.map((s) => spendToTransaction(s, last4));
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

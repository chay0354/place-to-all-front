/**
 * Premium third-party avatars via DiceBear (https://www.dicebear.com).
 * Uses polished illustration styles (Micah, Lorelei, Adventurer…) — not robots/shapes.
 */

const DICEBEAR_VERSION = '9.x';
const DEFAULT_STYLE = 'micah';

/** Soft brand-aligned backgrounds (no #). */
const BG_SOFT = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';
const BG_BLUE = 'dbeafe,bfdbfe,e0f2fe';

/**
 * Curated high-quality illustration presets.
 * @see https://www.dicebear.com/styles
 */
const PRESET_STYLES = [
  { id: 'mica', label: 'Mica', style: 'micah', seed: 'place-mica', bg: BG_BLUE },
  { id: 'aria', label: 'Aria', style: 'lorelei', seed: 'place-aria', bg: 'c0aede,d1d4f9' },
  { id: 'finn', label: 'Finn', style: 'adventurer', seed: 'place-finn', bg: BG_SOFT },
  { id: 'sage', label: 'Sage', style: 'notionists', seed: 'place-sage', bg: BG_BLUE },
  { id: 'remy', label: 'Remy', style: 'open-peeps', seed: 'place-remy', bg: 'ffd5dc,ffdfbf' },
  { id: 'noa', label: 'Noa', style: 'personas', seed: 'place-noa', bg: 'c0aede,b6e3f4' },
  { id: 'eden', label: 'Eden', style: 'avataaars', seed: 'place-eden', bg: BG_SOFT },
  { id: 'lux', label: 'Lux', style: 'lorelei-neutral', seed: 'place-lux', bg: 'e2e8f0,f1f5f9' },
];

function hashSeed(seed) {
  const s = String(seed || 'user');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const FALLBACK_TONES = [
  { from: '#1D4ED8', to: '#60A5FA' },
  { from: '#0369A1', to: '#38BDF8' },
  { from: '#0F766E', to: '#2DD4BF' },
  { from: '#B45309', to: '#FBBF24' },
  { from: '#BE123C', to: '#FB7185' },
  { from: '#4338CA', to: '#818CF8' },
  { from: '#334155', to: '#94A3B8' },
  { from: '#047857', to: '#34D399' },
];

export function avatarToneFromSeed(seed) {
  return FALLBACK_TONES[hashSeed(seed) % FALLBACK_TONES.length];
}

/**
 * Crisp DiceBear URL (SVG by default for sharp circles).
 * @param {string} seed
 * @param {{ style?: string, size?: number, format?: 'png' | 'svg', backgroundColor?: string }} [opts]
 */
export function dicebearAvatarUrl(seed, opts = {}) {
  const style = opts.style || DEFAULT_STYLE;
  const size = opts.size || 160;
  const format = opts.format || 'svg';
  const q = new URLSearchParams({
    seed: String(seed || 'user'),
    size: String(size),
    radius: '50',
    backgroundType: 'gradientLinear',
    backgroundColor: opts.backgroundColor || BG_SOFT,
  });
  return `https://api.dicebear.com/${DICEBEAR_VERSION}/${style}/${format}?${q.toString()}`;
}

/** @deprecated alias */
export function characterAvatarDataUrl(seed) {
  return dicebearAvatarUrl(seed, { style: DEFAULT_STYLE, size: 160, format: 'svg' });
}

export const AVATAR_PRESETS = PRESET_STYLES.map((p) => ({
  id: p.id,
  label: p.label,
  bg: '#E8EEF7',
  style: p.style,
  seed: p.seed,
  get src() {
    return dicebearAvatarUrl(p.seed, {
      style: p.style,
      size: 128,
      format: 'svg',
      backgroundColor: p.bg,
    });
  },
}));

export function presetImageUrl(id) {
  const preset = PRESET_STYLES.find((p) => p.id === id) || PRESET_STYLES[0];
  // PNG for reliable upload to Supabase storage
  return dicebearAvatarUrl(preset.seed, {
    style: preset.style,
    size: 512,
    format: 'png',
    backgroundColor: preset.bg,
  });
}

/** @deprecated use presetImageUrl */
export function presetDataUrl(id) {
  return presetImageUrl(id);
}

/** Fetch DiceBear PNG and return a File for Supabase upload. */
export async function presetAvatarToFile(presetId) {
  const url = presetImageUrl(presetId);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not load avatar');
  const blob = await res.blob();
  if (!blob.size) throw new Error('Could not load avatar');
  const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/png';
  const ext = type.includes('webp') ? 'webp' : type.includes('jpeg') || type.includes('jpg') ? 'jpg' : 'png';
  return new File([blob], `avatar-${presetId}.${ext}`, { type, lastModified: Date.now() });
}

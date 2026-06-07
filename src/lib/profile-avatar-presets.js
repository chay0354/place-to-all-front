/**
 * Free preset avatars — CC0 pixel animals by Maygonpepetreynsh (OpenGameArt.org).
 * https://opengameart.org/content/pixel-animals
 */
export const AVATAR_PRESETS = [
  { id: 'corgi', label: 'Corgi', bg: '#f3f3f3', src: '/avatars/presets/corgi.png' },
  { id: 'shiba', label: 'Shiba', bg: '#e8755a', src: '/avatars/presets/shiba.png' },
  { id: 'lion', label: 'Lion', bg: '#a8d8d0', src: '/avatars/presets/lion.png' },
  { id: 'bear', label: 'Bear', bg: '#e8c468', src: '/avatars/presets/bear.png' },
  { id: 'sheep', label: 'Sheep', bg: '#c9b8e8', src: '/avatars/presets/sheep.png' },
];

export function presetImageUrl(id) {
  const preset = AVATAR_PRESETS.find((p) => p.id === id) || AVATAR_PRESETS[1];
  return preset.src;
}

/** @deprecated use presetImageUrl */
export function presetDataUrl(id) {
  return presetImageUrl(id);
}

export async function presetAvatarToFile(presetId) {
  const url = presetImageUrl(presetId);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not load avatar');
  const blob = await res.blob();
  if (!blob.size) throw new Error('Could not load avatar');
  return new File([blob], `avatar-${presetId}.png`, { type: 'image/png', lastModified: Date.now() });
}

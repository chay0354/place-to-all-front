const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function extForType(type) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export function normalizeImageMimeType(file) {
  const type = String(file?.type || '').toLowerCase();
  if (ALLOWED_IMAGE_TYPES.has(type)) return type;
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this image.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Resize/compress a photo for API upload (keeps under Vercel ~4.5 MB body limit).
 */
export async function compressImageFile(
  file,
  { maxDimension = 1600, maxBytes = 3 * 1024 * 1024, basename = 'image', forceJpeg = false } = {},
) {
  if (typeof window === 'undefined') return file;

  const mime = normalizeImageMimeType(file);
  if (!ALLOWED_IMAGE_TYPES.has(mime)) {
    throw new Error('Use a JPG, PNG, or WebP photo.');
  }

  const img = await loadImageFromFile(file);
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process this image.');

  ctx.drawImage(img, 0, 0, width, height);

  const outputType = forceJpeg || mime !== 'image/png' ? 'image/jpeg' : 'image/png';
  let blob = await canvasToBlob(canvas, outputType, outputType === 'image/png' ? undefined : 0.85);

  if (outputType === 'image/jpeg' && blob && blob.size > maxBytes) {
    for (const q of [0.78, 0.68, 0.58, 0.48, 0.38, 0.28]) {
      blob = await canvasToBlob(canvas, 'image/jpeg', q);
      if (blob && blob.size <= maxBytes) break;
    }
  }

  if (!blob) throw new Error('Could not process this image.');
  if (blob.size > maxBytes) {
    throw new Error('Photo is still too large after compression. Move closer or use a clearer photo.');
  }

  const ext = extForType(outputType);
  return new File([blob], `${basename}.${ext}`, { type: outputType, lastModified: Date.now() });
}

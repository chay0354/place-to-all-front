const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 4 * 1024 * 1024;

const FRONT_PROMPT = `You verify identity document photos for a fintech app. Analyze the image.

Task: Confirm this is the FRONT of a government-issued photo ID — e.g. national ID card front, passport biodata/photo page, or driver's license front.

Reject (valid=false) if ANY of these apply:
- Not a government ID (selfie, screenshot, credit card, utility bill, blank paper, meme, unrelated photo)
- Clearly the BACK of an ID only (barcode/magnetic strip side without portrait on front)
- Too blurry, dark, cropped, or glare-covered to recognize as an ID
- Obvious forgery or digitally manipulated template

Accept (valid=true) if it reasonably shows the front/photo page of a real government ID.

Respond with JSON only:
{"valid":boolean,"reason":"short user-facing explanation","documentType":"national_id"|"passport"|"drivers_license"|"unknown"}`;

const BACK_PROMPT = `You verify identity document photos for a fintech app. Analyze the image.

Task: Confirm this is the BACK of a government-issued ID, OR a valid secondary page for a passport (visa page, additional data page, or inside back cover with security features).

Reject (valid=false) if ANY of these apply:
- Not an ID back or passport secondary page (selfie, random photo, credit card, front-only ID portrait page duplicated)
- Unrelated document
- Too blurry or unreadable to recognize as ID-related

Accept (valid=true) for: national ID card back, driver's license back, passport visa/data page, or passport back cover with security printing.

Respond with JSON only:
{"valid":boolean,"reason":"short user-facing explanation","documentType":"national_id"|"passport"|"drivers_license"|"unknown"}`;

export class IdValidateError extends Error {
  constructor(message, { code = 'error', status = 500 } = {}) {
    super(message);
    this.name = 'IdValidateError';
    this.code = code;
    this.status = status;
  }
}

function sniffMime(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

function resolveMime(file, buffer) {
  const declared = String(file?.type || '').toLowerCase();
  if (ALLOWED.has(declared)) return declared;
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  const sniffed = sniffMime(buffer);
  if (sniffed) return sniffed;
  return 'image/jpeg';
}

export function assertValidIdImageFile(file, buffer, mimeType) {
  if (!file || !buffer?.length) {
    throw new IdValidateError('No image provided', { code: 'bad_request', status: 400 });
  }
  if (!ALLOWED.has(mimeType)) {
    throw new IdValidateError('Use a JPG, PNG, or WebP photo.', { code: 'bad_request', status: 400 });
  }
  if (buffer.length > MAX_BYTES) {
    throw new IdValidateError('Image must be 4 MB or smaller.', { code: 'bad_request', status: 400 });
  }
}

export async function validateIdDocumentWithOpenAI(file, side) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    throw new IdValidateError('ID verification is not configured on the server. Set OPENAI_API_KEY in Vercel.', {
      code: 'config',
      status: 503,
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = resolveMime(file, buffer);
  assertValidIdImageFile(file, buffer, mimeType);

  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const prompt = side === 'back' ? BACK_PROMPT : FRONT_PROMPT;

  let res;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    throw new IdValidateError(e?.message || 'Could not reach verification service', {
      code: 'upstream',
      status: 502,
    });
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = payload?.error?.message || res.statusText || 'Verification service unavailable';
    throw new IdValidateError(msg, { code: 'openai', status: res.status >= 500 ? 502 : 400 });
  }

  const raw = payload?.choices?.[0]?.message?.content;
  let parsed;
  try {
    parsed = JSON.parse(raw || '{}');
  } catch {
    throw new IdValidateError('Could not parse verification result. Try again.', { code: 'parse', status: 502 });
  }

  return {
    valid: Boolean(parsed.valid),
    reason: typeof parsed.reason === 'string' ? parsed.reason : 'This image could not be verified.',
    documentType: parsed.documentType || 'unknown',
  };
}

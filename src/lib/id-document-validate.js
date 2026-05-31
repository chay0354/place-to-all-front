const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

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

export function assertValidIdImageFile(file) {
  if (!file) throw new Error('No image provided');
  if (!ALLOWED.has(file.type)) throw new Error('Use a JPG, PNG, or WebP photo.');
  if (file.size > MAX_BYTES) throw new Error('Image must be 5 MB or smaller.');
}

export async function validateIdDocumentWithOpenAI(file, side) {
  assertValidIdImageFile(file);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('ID verification is not configured. Contact support.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');
  const dataUrl = `data:${file.type};base64,${base64}`;
  const prompt = side === 'back' ? BACK_PROMPT : FRONT_PROMPT;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
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

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = payload?.error?.message || res.statusText || 'Verification service unavailable';
    throw new Error(msg);
  }

  const raw = payload?.choices?.[0]?.message?.content;
  let parsed;
  try {
    parsed = JSON.parse(raw || '{}');
  } catch {
    throw new Error('Could not parse verification result. Try again.');
  }

  return {
    valid: Boolean(parsed.valid),
    reason: typeof parsed.reason === 'string' ? parsed.reason : 'This image could not be verified.',
    documentType: parsed.documentType || 'unknown',
  };
}

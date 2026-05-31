/**
 * Read server-only env at runtime (avoids Next.js inlining empty values at build time).
 * Set OPENAI_API_KEY on the **front** Vercel project, then redeploy.
 */
export function getOpenAiApiKey() {
  const raw = process.env.OPENAI_API_KEY ?? process.env['OPENAI_API_KEY'] ?? '';
  return String(raw)
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

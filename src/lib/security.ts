/**
 * BailaNow — Client-side security utilities
 */

// ── Safe URL builder for user-provided social links ───────────────────────────
// Prevents javascript: / data: / vbscript: URIs from ending up in href attributes.

const ALLOWED_PROTOCOLS = ['https:', 'http:'];

/**
 * Given a user-stored social handle or URL, returns a safe absolute URL.
 * Returns null if the value is empty or the resulting URL has a dangerous protocol.
 *
 * @example
 *   safeSocialUrl('instagram', 'myhandle')  // → 'https://instagram.com/myhandle'
 *   safeSocialUrl('website', 'https://mysite.com') // → 'https://mysite.com'
 *   safeSocialUrl('website', 'javascript:alert(1)') // → null
 */
export function safeSocialUrl(platform: string, value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;

  let url: URL;
  try {
    // If already an absolute URL, parse it
    if (v.startsWith('http://') || v.startsWith('https://')) {
      url = new URL(v);
    } else {
      // Treat as a handle/username — build a known-safe URL
      const handle = v.replace(/^@/, '');
      url = new URL(`https://${platform}.com/${handle}`);
    }
  } catch {
    return null;
  }

  // Reject non-http/https protocols (javascript:, data:, vbscript:, etc.)
  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) return null;

  return url.toString();
}

// ── Strip HTML tags from a string (lightweight, no DOMParser dependency) ─────
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

// ── Truncate + strip for display-safe text ────────────────────────────────────
export function sanitizeText(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return stripHtml(input).slice(0, maxLength);
}

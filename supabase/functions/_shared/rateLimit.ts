/**
 * Simple in-memory rate limiter for Supabase Edge Functions (Deno).
 *
 * Supabase Edge Functions are single-threaded isolates — the Map persists
 * within a warm instance but resets on cold starts. For a production-grade
 * distributed limiter, replace the store with a Redis / Upstash KV call.
 *
 * Usage:
 *   const result = checkRateLimit(req, { max: 5, windowMs: 60_000 });
 *   if (!result.ok) return result.response;
 */

interface RateLimitOptions {
  max: number;        // max requests per window
  windowMs: number;   // window size in ms
  keyPrefix?: string; // prefix to namespace different endpoints
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Shared store across requests within the same warm instance
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to avoid memory leak
let lastCleanup = Date.now();
function maybeCleanup() {
  if (Date.now() - lastCleanup < 5 * 60_000) return;
  lastCleanup = Date.now();
  for (const [key, entry] of store) {
    if (Date.now() > entry.resetAt) store.delete(key);
  }
}

export function checkRateLimit(
  req: Request,
  options: RateLimitOptions
): { ok: true } | { ok: false; response: Response } {
  maybeCleanup();

  // Identify caller: prefer CF-Connecting-IP (Cloudflare), then X-Forwarded-For
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown';

  const prefix = options.keyPrefix ?? 'rl';
  const key = `${prefix}:${ip}`;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + options.windowMs };
    store.set(key, entry);
  }

  entry.count++;

  const remaining = Math.max(0, options.max - entry.count);
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

  if (entry.count > options.max) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Demasiadas solicitudes. Inténtalo más tarde.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(options.max),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
          },
        }
      ),
    };
  }

  return { ok: true };
}

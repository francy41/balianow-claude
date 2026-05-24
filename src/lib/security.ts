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

// ═════════════════════════════════════════════════════════════════
//   ANTI-BRUTE-FORCE: lockout local después de 5 intentos
// ═════════════════════════════════════════════════════════════════
const LOCKOUT_KEY = 'bn-login-attempts';
const MAX_ATTEMPTS = 10;   // 10 intentos antes de bloquear
const LOCKOUT_MINUTES = 5; // Solo 5 min (no 15)

interface LockoutState { attempts: number; lockedUntil?: number; lastAttempt: number; }

function readLockout(email: string): LockoutState {
  try {
    const raw = localStorage.getItem(`${LOCKOUT_KEY}-${email.toLowerCase()}`);
    return raw ? JSON.parse(raw) : { attempts: 0, lastAttempt: 0 };
  } catch { return { attempts: 0, lastAttempt: 0 }; }
}

function writeLockout(email: string, state: LockoutState) {
  try { localStorage.setItem(`${LOCKOUT_KEY}-${email.toLowerCase()}`, JSON.stringify(state)); } catch {}
}

export function checkLockout(email: string): { locked: boolean; minutesLeft?: number; attemptsLeft: number } {
  if (!email) return { locked: false, attemptsLeft: MAX_ATTEMPTS };
  const state = readLockout(email);
  const now = Date.now();
  if (state.lockedUntil && state.lockedUntil > now) {
    return { locked: true, minutesLeft: Math.ceil((state.lockedUntil - now) / 60000), attemptsLeft: 0 };
  }
  if (state.lastAttempt && now - state.lastAttempt > 60 * 60 * 1000) {
    writeLockout(email, { attempts: 0, lastAttempt: 0 });
    return { locked: false, attemptsLeft: MAX_ATTEMPTS };
  }
  return { locked: false, attemptsLeft: MAX_ATTEMPTS - state.attempts };
}

export function recordFailedLogin(email: string): { locked: boolean; minutesLeft?: number; attemptsLeft: number } {
  if (!email) return { locked: false, attemptsLeft: MAX_ATTEMPTS };
  const state = readLockout(email);
  const newAttempts = state.attempts + 1;
  const now = Date.now();
  if (newAttempts >= MAX_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_MINUTES * 60 * 1000;
    writeLockout(email, { attempts: newAttempts, lockedUntil, lastAttempt: now });
    return { locked: true, minutesLeft: LOCKOUT_MINUTES, attemptsLeft: 0 };
  }
  writeLockout(email, { attempts: newAttempts, lastAttempt: now });
  return { locked: false, attemptsLeft: MAX_ATTEMPTS - newAttempts };
}

export function clearLoginAttempts(email: string) {
  try { localStorage.removeItem(`${LOCKOUT_KEY}-${email.toLowerCase()}`); } catch {}
}

// ═════════════════════════════════════════════════════════════════
//   HONEYPOT (anti-bot) — campo invisible que solo bots rellenan
// ═════════════════════════════════════════════════════════════════
export const HONEYPOT_FIELD = 'website_url_hp';

export function isHoneypotTriggered(value: string | undefined | null): boolean {
  return !!value && String(value).length > 0;
}

// ═════════════════════════════════════════════════════════════════
//   PASSWORD STRENGTH METER
// ═════════════════════════════════════════════════════════════════
export function passwordStrength(pw: string): { score: 0|1|2|3|4; label: string; color: string } {
  if (!pw) return { score: 0, label: 'Vacía', color: '#ef4444' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const score = Math.min(s, 4) as 0|1|2|3|4;
  const labels = ['Muy débil', 'Débil', 'Media', 'Fuerte', 'Muy fuerte'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#059669'];
  return { score, label: labels[score], color: colors[score] };
}

// ═════════════════════════════════════════════════════════════════
//   FILE VALIDATION (anti-MIME spoofing)
// ═════════════════════════════════════════════════════════════════
export function isAllowedFileType(file: File, allowedMimes: string[]): boolean {
  if (!file) return false;
  const mimeOk = allowedMimes.some(m => {
    if (m.endsWith('/*')) return file.type.startsWith(m.slice(0, -1));
    return file.type === m;
  });
  if (!mimeOk) return false;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext) return false;
  const safeExts = ['jpg','jpeg','png','webp','gif','svg','mp4','webm','mp3','wav','pdf'];
  return safeExts.includes(ext);
}

// ═════════════════════════════════════════════════════════════════
//   CLIENT-SIDE RATE LIMIT (acciones costosas: upload, signup, etc.)
// ═════════════════════════════════════════════════════════════════
const RL_PREFIX = 'bn-rl-';

export function checkClientRateLimit(action: string, maxPerMinute = 10): boolean {
  try {
    const key = `${RL_PREFIX}${action}`;
    const now = Date.now();
    const raw = localStorage.getItem(key);
    const log: number[] = raw ? JSON.parse(raw) : [];
    const recent = log.filter(t => now - t < 60000);
    if (recent.length >= maxPerMinute) return false;
    recent.push(now);
    localStorage.setItem(key, JSON.stringify(recent));
    return true;
  } catch { return true; }
}

// ═════════════════════════════════════════════════════════════════
//   EMAIL VALIDATION (estricta)
// ═════════════════════════════════════════════════════════════════
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const e = email.trim().toLowerCase();
  if (e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

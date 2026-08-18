/**
 * Server-side input hardening.
 *
 * The client sanitizes with DOMPurify before render, but a browser is not the
 * only consumer of this API — anything persisted must be clean at write time
 * too. These helpers are deliberately conservative: the catalog and review
 * text fields are plain text, so we strip markup entirely rather than trying
 * to maintain an allow-list of "safe" HTML.
 */

const TAG_PATTERN = /<[^>]*>/g;
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]', 'g');

/** Removes tags, control characters and collapses runaway whitespace. */
export function sanitizeText(input: string): string {
  return input
    .replace(TAG_PATTERN, '')
    .replace(CONTROL_CHARS, '')
    .replace(/[^\S\n]{3,}/g, '  ')
    .trim();
}

/**
 * Escapes the five XML-significant characters. Use when a value must survive
 * verbatim (e.g. it is rendered into an email template) rather than be
 * stripped.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Uzbek numbers are entered as +998 90 123 45 67, 998901234567, 901234567…
 * All of them normalize to E.164 so `phone` stays a reliable unique key.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Only allow same-origin relative redirect targets. Blocks open-redirect and
 * `javascript:` payloads coming in through `?next=` style parameters.
 */
export function safeRelativePath(candidate: string | undefined, fallback = '/'): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback;
  if (CONTROL_CHARS.test(candidate)) {
    CONTROL_CHARS.lastIndex = 0; // the regex is global — reset the cursor
    return fallback;
  }
  CONTROL_CHARS.lastIndex = 0;
  return candidate;
}

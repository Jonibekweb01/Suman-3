import DOMPurify from 'dompurify';

/**
 * XSS boundary for anything that reaches `dangerouslySetInnerHTML`.
 *
 * React escapes text by default, so most values need nothing. This is for the
 * two cases where it does not: rich product descriptions, and search-term
 * highlighting, which builds markup by hand.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'br', 'p', 'ul', 'ol', 'li', 'mark'],
    ALLOWED_ATTR: [],
    // Strip anything that could navigate or execute, even inside allowed tags.
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
  });
}

/** Escapes regex metacharacters so user input cannot alter the pattern. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Wraps matches of `term` in `<mark>` for autocomplete results.
 *
 * The source text is escaped BEFORE the markup is added, then the whole thing
 * is sanitized — otherwise a product titled `<img onerror=...>` would execute
 * in the dropdown.
 */
export function highlightMatch(text: string, term: string): string {
  if (!term.trim()) return sanitizeHtml(text);

  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const pattern = new RegExp(`(${escapeRegExp(term.trim())})`, 'gi');
  return sanitizeHtml(escapedText.replace(pattern, '<mark>$1</mark>'));
}

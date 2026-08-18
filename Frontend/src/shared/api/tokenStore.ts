/**
 * Access token storage — deliberately a module-level variable.
 *
 * The security spec requires the access token to live in memory only. Putting
 * it in localStorage/sessionStorage would make it readable by any injected
 * script; here an XSS payload has to already be executing to reach it, and it
 * dies with the tab. The refresh token is an HttpOnly cookie the browser
 * manages and JS can never see, so a page reload recovers the session through
 * `/auth/refresh` rather than through storage.
 */

let accessToken: string | null = null;

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },

  set(token: string | null): void {
    accessToken = token;
    for (const listener of listeners) listener(token);
  },

  clear(): void {
    tokenStore.set(null);
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/**
 * Reads the double-submit CSRF cookie the API set. It is intentionally NOT
 * HttpOnly: the whole point is that same-origin JS can read it and echo it in
 * a header, which a cross-site attacker cannot do.
 */
export function readCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)suman_csrf=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

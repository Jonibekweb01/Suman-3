/**
 * Access token storage — memory only, same contract as the storefront.
 *
 * An admin session is the highest-value credential in the system: it can
 * rewrite the catalogue and read every customer's order. Putting the token
 * anywhere persistent would make it readable by an injected script and would
 * survive the tab closing on a shared machine. The HttpOnly refresh cookie is
 * the durable half, and a reload recovers the session through `/auth/refresh`.
 */

let accessToken: string | null = null;

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (token: string | null): void => {
    accessToken = token;
  },
  clear: (): void => {
    accessToken = null;
  },
};

/** Double-submit CSRF cookie — readable by design so JS can echo it. */
export function readCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)suman_csrf=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

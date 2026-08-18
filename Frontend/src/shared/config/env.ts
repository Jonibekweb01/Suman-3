/**
 * Runtime configuration.
 *
 * The default is a relative path so the Vite dev proxy keeps the API
 * same-origin — that way the HttpOnly refresh cookie works with
 * `SameSite=lax` and no CORS credentials dance during development.
 * Set `VITE_API_URL` to an absolute URL for a deployed API.
 */
export const config = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1',
  isDev: import.meta.env.DEV,
  currency: 'UZS',
  locale: 'uz-UZ',
} as const;

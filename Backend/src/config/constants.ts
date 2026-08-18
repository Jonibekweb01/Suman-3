/**
 * Cross-module constants. Keeping them in one place stops magic strings from
 * drifting apart between the auth module and the middleware layer.
 */

export const COOKIE_NAMES = {
  /** HttpOnly — never readable by JS. Carries the rotating refresh token. */
  refreshToken: 'suman_rt',
  /** Readable by JS on purpose: double-submit CSRF token. */
  csrfToken: 'suman_csrf',
} as const;

export const HEADER_NAMES = {
  csrfToken: 'x-csrf-token',
  requestId: 'x-request-id',
} as const;

/** Refresh + logout live under this path so the cookie is not sent everywhere. */
export const AUTH_COOKIE_PATH = '/';

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 60,
} as const;

export const PRODUCT_SORTS = [
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
  'rating',
  'popular',
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const ORDER_NUMBER_PREFIX = 'SM';

/** Terminal states — an order in one of these cannot transition further. */
export const TERMINAL_ORDER_STATUSES = ['DELIVERED', 'CANCELLED'] as const;

/**
 * Allowed forward transitions for order status. Admin updates are validated
 * against this map so the fulfilment pipeline cannot go backwards.
 */
export const ORDER_STATUS_FLOW: Record<string, readonly string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

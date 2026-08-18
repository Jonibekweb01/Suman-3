import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { OrderStatus } from '../types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// --- Money -------------------------------------------------------------------
// The API stores money as integers in the currency's minor unit (tiyin).
// Conversion happens here and in the form parsers below — nowhere else.

export function formatPrice(minorUnits: number, currency = 'UZS'): string {
  const formatted = new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(
    minorUnits / 100,
  );
  return currency === 'UZS' ? `${formatted} so'm` : `${formatted} ${currency}`;
}

/** Compact form for stat tiles: 12.4 mln */
export function formatPriceCompact(minorUnits: number): string {
  const major = minorUnits / 100;
  if (major >= 1_000_000) return `${(major / 1_000_000).toFixed(1)} mln`;
  if (major >= 1000) return `${Math.round(major / 1000)}k`;
  return String(Math.round(major));
}

/** Admins type major units ("249000"); the API wants minor units. */
export function toMinorUnits(major: number): number {
  return Math.round(major * 100);
}

export function toMajorUnits(minor: number): number {
  return minor / 100;
}

// --- Dates -------------------------------------------------------------------

/**
 * Dates are built by hand rather than through `Intl` month names.
 *
 * The `uz-UZ` CLDR data has no written month names — even `month: 'long'`
 * renders "M08" — so a locale-formatted date reads as gibberish. `dd.MM.yyyy`
 * is the everyday Uzbek convention and is unambiguous.
 */
function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${formatDate(iso)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `<input type="datetime-local">` needs `YYYY-MM-DDTHH:mm` in local time. */
export function toDateTimeLocal(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

// --- Order status ------------------------------------------------------------

export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

/**
 * Mirror of the backend's `ORDER_STATUS_FLOW`.
 *
 * Duplicated on purpose: the server is the authority and rejects an invalid
 * transition, but offering a button that is guaranteed to 400 is bad UI. Keep
 * this in sync with `Backend/src/config/constants.ts`.
 */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const ORDER_STATUS_TONES: Record<OrderStatus, Tone> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PACKED: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

// --- Misc --------------------------------------------------------------------

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[‘’ʻʼ']/g, '')
    .normalize('NFKD')
    .replace(new RegExp('[\\u0300-\\u036F]', 'g'), '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function initialsOf(first?: string | null, last?: string | null): string {
  return ((first?.charAt(0) ?? '') + (last?.charAt(0) ?? '')).toUpperCase() || '?';
}

export function fullName(
  user: { firstName: string | null; lastName: string | null } | null | undefined,
): string {
  if (!user) return '—';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
}

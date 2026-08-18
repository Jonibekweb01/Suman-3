import { config } from '../config/env';

/**
 * The API stores money as integers in the currency's minor unit (tiyin).
 * Formatting is the ONLY place that division happens — arithmetic anywhere
 * else must stay on the integer.
 */
export function formatPrice(minorUnits: number, currency: string = config.currency): string {
  const major = minorUnits / 100;
  const formatted = new Intl.NumberFormat(config.locale, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(major);

  return currency === 'UZS' ? `${formatted} so'm` : `${formatted} ${currency}`;
}

/** Compact form for badges and tight card layouts: 1.29 mln */
export function formatPriceCompact(minorUnits: number): string {
  const major = minorUnits / 100;
  if (major >= 1_000_000) return `${(major / 1_000_000).toFixed(2).replace(/\.?0+$/, '')} mln`;
  if (major >= 1000) return `${Math.round(major / 1000)}k`;
  return String(major);
}

/**
 * Dates are built by hand rather than through `Intl` month names.
 *
 * The `uz-UZ` CLDR data carries no written month names — even `month: 'long'`
 * renders "M08" — so a locale-formatted date reads as gibberish to the very
 * audience it targets. `dd.MM.yyyy` is the everyday Uzbek convention and is
 * unambiguous. (Number and currency grouping still go through `Intl`, where
 * the locale data is correct.)
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

/** Formats an Uzbek number for display: +998 90 123 45 67 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 12) return phone;
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
}

export function initialsOf(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.trim().charAt(0) ?? '';
  const last = lastName?.trim().charAt(0) ?? '';
  return (first + last).toUpperCase() || '?';
}

export function pluralize(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

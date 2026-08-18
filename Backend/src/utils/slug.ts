import crypto from 'node:crypto';
import { ORDER_NUMBER_PREFIX } from '../config/constants';

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q',
  ғ: 'g', ҳ: 'h',
};

/** Unicode combining diacritical marks, left over after NFKD normalization. */
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036F]', 'g');

/**
 * URL-safe slug. Handles the Latin and Cyrillic Uzbek alphabets plus the
 * apostrophes in o‘, g‘ so `Ko‘ylak` and `Койлак` both land on `koylak`.
 */
export function slugify(input: string): string {
  const transliterated = input
    .toLowerCase()
    .replace(/[‘’ʻʼ']/g, '')
    .split('')
    .map((char) => CYRILLIC_MAP[char] ?? char)
    .join('');

  return transliterated
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Appends a short random suffix. Called by the catalog service when the base
 * slug is already taken, so two "Oq ko'ylak" products can coexist.
 */
export function uniqueSlug(base: string): string {
  const suffix = crypto.randomBytes(3).toString('hex');
  const root = slugify(base) || 'item';
  return `${root}-${suffix}`;
}

/** Human-readable, sortable order number: SM-250814-8F3A21 */
export function generateOrderNumber(): string {
  const now = new Date();
  const stamp = [
    now.getUTCFullYear().toString().slice(-2),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
  ].join('');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${ORDER_NUMBER_PREFIX}-${stamp}-${random}`;
}

export function generateSku(productSlug: string, color: string, size: string): string {
  const root = slugify(productSlug).slice(0, 20).toUpperCase().replace(/-/g, '');
  const c = slugify(color).slice(0, 4).toUpperCase();
  const s = slugify(size).slice(0, 4).toUpperCase() || 'ONE';
  return `${root}-${c}-${s}`;
}

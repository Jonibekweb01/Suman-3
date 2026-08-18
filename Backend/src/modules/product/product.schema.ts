import { z } from 'zod';
import { PAGINATION, PRODUCT_SORTS } from '../../config/constants';
import { sanitizeText } from '../../utils/sanitize';
import { genderSchema } from '../category/category.schema';

/**
 * Repeated query params arrive as `?size=S&size=M` (array) or `?size=S,M`
 * (string). Normalize both into a de-duplicated string array so the filter
 * panel can use whichever form is convenient.
 */
const csvArray = (max = 20) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      const parts = Array.isArray(value) ? value : value.split(',');
      const cleaned = [...new Set(parts.map((p) => p.trim()).filter(Boolean))];
      return cleaned.length > 0 ? cleaned.slice(0, max) : undefined;
    });

const boolFlag = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

export const productListQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional().transform((v) => (v ? sanitizeText(v) : undefined)),
    categoryId: z.string().cuid().optional(),
    categorySlug: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(120)
      .optional(),
    gender: genderSchema.optional(),

    /** Minor units, matching `Product.price`. */
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),

    sizes: csvArray(),
    colors: csvArray(),
    brands: csvArray(),

    inStock: boolFlag,
    featured: boolFlag,
    minRating: z.coerce.number().min(0).max(5).optional(),

    sort: z.enum(PRODUCT_SORTS).default('newest'),

    // Offset pagination for the admin table…
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
    // …cursor pagination for the storefront's infinite scroll.
    cursor: z.string().cuid().optional(),
  })
  .refine(
    (data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice,
    { message: 'minPrice cannot be greater than maxPrice', path: ['minPrice'] },
  );

export const searchSuggestQuerySchema = z.object({
  q: z.string().trim().min(1, 'Type something to search').max(60).transform(sanitizeText),
  limit: z.coerce.number().int().positive().max(10).default(6),
});

export const relatedQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(20).default(10),
});

// --- Admin write payloads ---------------------------------------------------

const variantSchema = z.object({
  color: z.string().trim().min(1).max(40).transform(sanitizeText),
  colorHex: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Expected a hex colour like #1A1A1A'),
  size: z.string().trim().min(1).max(20).transform(sanitizeText),
  sku: z.string().trim().min(1).max(60).optional(),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  priceDiff: z.number().int().min(-100_000_000).max(100_000_000).default(0),
});

const imageSchema = z.object({
  url: z.string().url().max(500),
  blurHash: z.string().max(120).optional(),
  alt: z.string().max(160).optional().transform((v) => (v ? sanitizeText(v) : undefined)),
  sortOrder: z.number().int().min(0).max(100).default(0),
});

export const createProductSchema = z.object({
  title: z.string().trim().min(2).max(140).transform(sanitizeText),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .max(120)
    .optional(),
  description: z.string().trim().min(10).max(5000).transform(sanitizeText),
  brand: z.string().trim().max(60).optional().transform((v) => (v ? sanitizeText(v) : undefined)),
  gender: genderSchema.default('UNISEX'),
  categoryId: z.string().cuid(),

  price: z.number().int().positive('Price must be greater than zero').max(10_000_000_000),
  oldPrice: z.number().int().positive().max(10_000_000_000).nullish(),
  currency: z.string().length(3).default('UZS'),

  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),

  images: z.array(imageSchema).min(1, 'At least one image is required').max(12),
  variants: z.array(variantSchema).min(1, 'At least one variant is required').max(60),
});

export const updateProductSchema = createProductSchema.partial().omit({ variants: true, images: true }).extend({
  images: z.array(imageSchema).min(1).max(12).optional(),
  variants: z.array(variantSchema).min(1).max(60).optional(),
});

export const stockAdjustSchema = z.object({
  variantId: z.string().cuid(),
  /** Signed delta; negative decrements. */
  delta: z.number().int().min(-100_000).max(100_000),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type SearchSuggestQuery = z.infer<typeof searchSuggestQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

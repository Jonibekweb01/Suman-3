import { z } from 'zod';
import { sanitizeText } from '../../utils/sanitize';

export const genderSchema = z.enum(['WOMEN', 'MEN', 'UNISEX', 'KIDS']);

export const listCategoriesQuerySchema = z.object({
  gender: genderSchema.optional(),
  /** `true` returns the nested tree; otherwise a flat list. */
  tree: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  includeInactive: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(60).transform(sanitizeText),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, 'Slug may contain lowercase letters, digits and hyphens only')
    .max(80)
    .optional(),
  gender: genderSchema.nullish(),
  imageUrl: z.string().url().max(500).nullish(),
  parentId: z.string().cuid().nullish(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

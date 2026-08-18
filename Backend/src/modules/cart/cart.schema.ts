import { z } from 'zod';

const quantity = z.number().int().min(1, 'Quantity must be at least 1').max(99, 'Maximum 99 per item');

export const addToCartSchema = z.object({
  variantId: z.string().cuid('Invalid variant'),
  quantity: quantity.default(1),
});

export const updateCartItemSchema = z.object({
  quantity,
});

/**
 * Guests build a cart in localStorage. On sign-in the client posts it here and
 * the server folds it into the persisted cart.
 */
export const mergeCartSchema = z.object({
  items: z
    .array(z.object({ variantId: z.string().cuid(), quantity }))
    .max(100, 'Cart is too large to merge'),
});

export const variantIdParamSchema = z.object({
  variantId: z.string().cuid('Invalid variant'),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type MergeCartInput = z.infer<typeof mergeCartSchema>;
